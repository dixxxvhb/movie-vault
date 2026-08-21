import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { gaze } from '../../CameraRig.jsx'
import { makeMetaTexture } from '../infoTextures.js'
import { sheetOf } from '../../palette.js'
import { useRoomAudio } from '../audio/engine.js'
import { start as startDepartedAudio } from '../audio/recipes/the-departed.js'
import { notifyElevatorOpen } from './departedBus.js'
import {
  makeSkyTexture, makeTagTexture,
  makeFloorIndicatorTexture, makeDossierTexture,
  makeTarSeamTexture, makeRustStreakTexture,
} from './departedTextures.js'
import DoorRow from '../DoorRow.jsx'
import { registerColliders, setBounds, clearOwner, resolveStep } from '../colliders.js'
import Touchable from '../Touchable.jsx'
import { PressKind } from '../touchKinds.jsx'
import { standardMat } from '../materials.js'
import { Bevel, Trim } from '../detail.jsx'
import { FogLayers } from '../atmosphere.jsx'
import LightRig from '../lightRig.js'

// 9.9 — "the elevator and the roof." Boston golden-hour haze, a gravel roof
// behind a parapet, an elevator lobby standing on it, and the reveal-as-event
// doctrine made spatial: the doors open at long random intervals on an empty
// lit car, and while they're open every tagged figure's own identity label
// trades COP for RAT (or back) the moment your eye is somewhere else.
//
// One fixed station (config.camera): the whole scene reads from where you
// land, the elevator lobby a few meters ahead, the rail and skyline visible
// on a drag/turn either side. No click-to-advance here — unlike Memento's
// corridor, nothing in the brief asks you to walk this room, only to stand
// in it and wait.
const ROOF_W = 16
const ROOF_D = 12
const PARAPET_H = 0.95
const PARAPET_T = 0.14

const ELEV_Z = -4          // lobby volume center
const ELEV_W = 2.4
const ELEV_D = 1.4
const ELEV_H = 2.6
const ELEV_FRONT_Z = ELEV_Z + ELEV_D / 2   // the face the doors sit on
const DOOR_W = 0.72
const DOOR_H = 2.15

// QA/peek affordance (per docs/IMMERSION-PHASE2-SPEC.md's gate: "drive it
// ... via a `?peek` style query param you add ONLY if needed and document").
// The shipped default is the real spec'd 60-100s arrival window; this flag
// only exists so a screenshot pass can see the doors-open state without
// waiting on it, and it changes nothing unless a URL explicitly asks for it.
// Usage: http://localhost:5173/?nocold&noguide#/film/the-departed&peekElevator
// (query params after a hash route land in location.search on this app's
// static host, so the flag is read the same way regardless of routing style)
const PEEK = typeof window !== 'undefined' &&
  (window.location.search.includes('peekElevator') || window.location.hash.includes('peekElevator'))

const FIRST_WAIT_MS = PEEK ? 1200 : 8000 + Math.random() * 12000
const HOLD_MS = PEEK ? 3200 : 6000
const SLIDE_MS = 900
const nextWaitMs = () => (PEEK ? 4500 : 60000 + Math.random() * 40000)

/* ------------------------------------------------------------- colliders */
// Wave M3: mirrors RoofShell/ElevatorLobby/RoofVentDossier's own geometry
// closely enough that "where the parapet is drawn" and "where the walker
// stops" never drift apart. HARD LAW: the parapet must block — nobody walks
// off the roof — so it gets both a collider (primary stop) AND a matching
// inset bounds rect (backup, same doctrine GenericRoom's boxShellColliders
// uses for its own walls).
const PARAPET_RECTS = [
  // ±Z runs (front/back)
  { minX: -ROOF_W / 2, maxX: ROOF_W / 2, minZ: -ROOF_D / 2 - PARAPET_T / 2, maxZ: -ROOF_D / 2 + PARAPET_T / 2 },
  { minX: -ROOF_W / 2, maxX: ROOF_W / 2, minZ: ROOF_D / 2 - PARAPET_T / 2, maxZ: ROOF_D / 2 + PARAPET_T / 2 },
  // ±X runs (sides) — this is the rail the rat walks; the parapet collider
  // alone already keeps it out of reach without anything rat-specific.
  { minX: -ROOF_W / 2 - PARAPET_T / 2, maxX: -ROOF_W / 2 + PARAPET_T / 2, minZ: -ROOF_D / 2, maxZ: ROOF_D / 2 },
  { minX: ROOF_W / 2 - PARAPET_T / 2, maxX: ROOF_W / 2 + PARAPET_T / 2, minZ: -ROOF_D / 2, maxZ: ROOF_D / 2 },
]

// The elevator housing: a solid penthouse box (walls + doors, whether open
// or closed) — there is no real floor behind the doors to walk into, so the
// whole housing blocks rather than trying to gate on doorState.
const ELEV_HOUSING_RECT = {
  minX: -ELEV_W / 2, maxX: ELEV_W / 2, minZ: ELEV_Z - ELEV_D / 2, maxZ: ELEV_Z + ELEV_D / 2, top: ELEV_H,
}

// RoofVentDossier's vent box (pos [-3.2,0,1.6], rot.y 0.3, local half
// extents 0.45 x 0.3).
function rotatedHalfExtentsRad(hx, hz, rotY) {
  const c = Math.abs(Math.cos(rotY)), s = Math.abs(Math.sin(rotY))
  return { hx: hx * c + hz * s, hz: hx * s + hz * c }
}
const VENT_EXT = rotatedHalfExtentsRad(0.45, 0.3, 0.3)
const VENT_RECT = {
  minX: -3.2 - VENT_EXT.hx, maxX: -3.2 + VENT_EXT.hx,
  minZ: 1.6 - VENT_EXT.hz, maxZ: 1.6 + VENT_EXT.hz, top: 0.66,
}

// The three tagged figures (TAG_FIGURES below) — small standing bodies,
// blocked like any other prop/furniture rather than walkable-through.
const TAG_FIGURE_RECTS = [
  { pos: [-3.0, -2.0] }, { pos: [3.0, -2.0] }, { pos: [-0.9, -0.9] },
].map(({ pos: [px, pz] }) => ({ minX: px - 0.22, maxX: px + 0.22, minZ: pz - 0.22, maxZ: pz + 0.22, top: 2.05 }))

const ROOM_ID = 'bespoke:the-departed'

function DepartedColliders({ spawn }) {
  useEffect(() => {
    registerColliders(ROOM_ID, [...PARAPET_RECTS, ELEV_HOUSING_RECT, VENT_RECT, ...TAG_FIGURE_RECTS])
    // Backup bounds, inset to the parapet's own inner face minus a hair —
    // belt-and-suspenders for the one hard law this room has (roof edge).
    setBounds(ROOM_ID, {
      kind: 'rect',
      minX: -ROOF_W / 2 + PARAPET_T + 0.15,
      maxX: ROOF_W / 2 - PARAPET_T - 0.15,
      minZ: -ROOF_D / 2 + PARAPET_T + 0.15,
      maxZ: ROOF_D / 2 - PARAPET_T - 0.15,
    })
    if (import.meta.env.DEV && spawn) {
      const [sx, , sz] = spawn
      const probes = [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]
      const stuck = probes.every(([dx, dz]) => {
        const r = resolveStep(sx, sz, dx, dz, 0.28)
        return Math.hypot(r.x - sx, r.z - sz) < 0.02
      })
      if (stuck) {
        // eslint-disable-next-line no-console
        console.warn('[colliders] spawn point for "%s" looks boxed in by its own colliders', ROOM_ID)
      }
    }
    return () => clearOwner(ROOM_ID)
  }, [spawn])
  return null
}

/* --------------------------------------------------------------- roof/sky */

// Parapet material shared by all four runs + the cap trim — one instance,
// not four, per materials.js's own caching contract.
const parapetMat = standardMat({ kind: 'concrete', tint: '#2a241c', wear: 0.55, scale: 1.4, repeat: [3, 1] })
const capMat = standardMat({ kind: 'concrete', tint: '#3a3428', wear: 0.35, scale: 1, repeat: [4, 1] })

function RoofShell({ grade }) {
  // P1 polish pass: gravel via materials.js's own aggregate generator
  // (roughnessMap is what sells the grazing golden-hour key across the
  // whole floor) plus a tar-seam alpha overlay for the membrane-roof story.
  const gravelMat = useMemo(
    () => standardMat({ kind: 'gravel', tint: '#332c22', wear: 0.45, scale: 1.6, repeat: [5, 4] }),
    []
  )
  const tarTex = useMemo(() => makeTarSeamTexture(ROOF_W, ROOF_D), [])
  const skyTex = useMemo(
    () => makeSkyTexture(grade.fill || '#3a2e22', grade.key || '#e8b060', '#241a10'),
    [grade.fill, grade.key]
  )
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOF_W, ROOF_D]} />
        <primitive object={gravelMat} attach="material" />
      </mesh>
      {/* tar seams, a hair proud to avoid z-fighting the gravel */}
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOF_W, ROOF_D]} />
        <meshBasicMaterial map={tarTex} transparent opacity={0.8} depthWrite={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      {/* sky dome — a warm gradient behind everything, the haze itself */}
      <mesh position={[0, 0, -20]}>
        <sphereGeometry args={[70, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
        <meshBasicMaterial map={skyTex} side={THREE.BackSide} fog={false} />
      </mesh>
      {/* the low sun itself, a soft emissive disc near the horizon */}
      <mesh position={[6, 3.4, -30]}>
        <circleGeometry args={[3.4, 24]} />
        <meshBasicMaterial color="#ffdca0" transparent opacity={0.85} fog={false} />
      </mesh>
      {/* layered horizon glow — a low wide band picking up the sun's own
          color, sitting just above the skyline silhouette */}
      <mesh position={[0, 3.0, -24]}>
        <planeGeometry args={[90, 5]} />
        <meshBasicMaterial color={grade.key || '#e8b060'} transparent opacity={0.16} fog={false} depthWrite={false} />
      </mesh>
      {/* haze band drifting along the horizon — cheap ground-fog reused at
          skyline height for a layered, filmic haze rather than a flat fog
          density number */}
      <FogLayers pos={[0, 2.4, -18]} size={[70, 10]} color="rgba(232,176,96,0.35)" opacity={0.22} speed={0.01} />
      {/* parapet: four low walls, gap-free — the rat gets its own segment.
          Bevel gives each run a manufactured concrete-cap edge instead of a
          naked box, and a Trim cap along the top catches the low golden key
          in a hard grazing line — the long-shadow "rim on the parapet" the
          brief asks for. */}
      <Bevel pos={[0, PARAPET_H / 2, -ROOF_D / 2]} w={ROOF_W} h={PARAPET_H} d={PARAPET_T} radius={0.02} mat={parapetMat} receiveShadow castShadow />
      <Bevel pos={[0, PARAPET_H / 2, ROOF_D / 2]} w={ROOF_W} h={PARAPET_H} d={PARAPET_T} radius={0.02} mat={parapetMat} receiveShadow />
      <Bevel pos={[-ROOF_W / 2, PARAPET_H / 2, 0]} w={PARAPET_T} h={PARAPET_H} d={ROOF_D} radius={0.02} mat={parapetMat} receiveShadow />
      <Bevel pos={[ROOF_W / 2, PARAPET_H / 2, 0]} w={PARAPET_T} h={PARAPET_H} d={ROOF_D} radius={0.02} mat={parapetMat} receiveShadow />
      <Trim pos={[0, PARAPET_H + 0.02, -ROOF_D / 2]} along="x" wallLength={ROOF_W} kind="crown" height={0.06} depth={PARAPET_T + 0.02} color="#4a4030" />
      <Trim pos={[0, PARAPET_H + 0.02, ROOF_D / 2]} along="x" wallLength={ROOF_W} kind="crown" height={0.06} depth={PARAPET_T + 0.02} color="#4a4030" />
    </group>
  )
}

// Instanced emissive skyline — golden-hour Boston-ish silhouette, far behind
// the parapet. One instancedMesh rather than 30+ separate meshes, per the
// brief's own wording ("instanced emissive boxes").
function Skyline({ grade }) {
  const ref = useRef()
  const count = 36
  const boxes = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: (Math.sin(i * 12.9898) * 0.5 + Math.cos(i * 3.7) * 0.3) * 42,
    z: -16 - (i % 7) * 5,
    h: 2.6 + (i % 9) * 1.5,
    w: 1.6 + (i % 4) * 0.7,
  })), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => {
    if (!ref.current) return
    boxes.forEach((b, i) => {
      dummy.position.set(b.x, b.h / 2, b.z)
      dummy.scale.set(b.w, b.h, b.w)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [boxes, dummy])
  return (
    <instancedMesh ref={ref} args={[null, null, count]} key={count}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#120e08" emissive={grade.key || '#e8b060'} emissiveIntensity={0.22} roughness={0.85} />
    </instancedMesh>
  )
}

/* --------------------------------------------------------- call button */

// Wave T: a small lit button beside the doors. Pressing it never runs a
// second copy of the arrival logic — it just clears whatever "waiting for
// the elevator" timer is currently pending and reschedules through the
// SAME scheduleArrival() the room already uses, with a wait under 2s
// instead of the random 60-100s one. If the car is already opening/open/
// closing the press is a no-op (nothing to rush).
function CallButton({ onPress }) {
  const [token, setToken] = useState(0)
  const handleUse = () => {
    setToken((t) => t + 1)
    onPress?.()
  }
  return (
    <group position={[ELEV_W / 2 + 0.18, 1.1, ELEV_FRONT_Z + 0.02]}>
      <Touchable onUse={handleUse} reach={2.4} foley="switch" anchor={[0, 0, 0]}>
        <PressKind token={token} depress={0.02} axis="z">
          <group>
            <mesh position={[0, 0, 0.01]}>
              <boxGeometry args={[0.09, 0.09, 0.02]} />
              <meshStandardMaterial color="#2a241c" roughness={0.6} metalness={0.3} />
            </mesh>
            <mesh position={[0, 0, 0.022]}>
              <circleGeometry args={[0.03, 16]} />
              <meshStandardMaterial color="#ffdca0" emissive="#ffb060" emissiveIntensity={1.2} toneMapped={false} />
            </mesh>
          </group>
        </PressKind>
      </Touchable>
    </group>
  )
}

/* -------------------------------------------------------------- elevator */

const housingMat = standardMat({ kind: 'concrete', tint: '#332c22', wear: 0.4, scale: 1.2 })
const doorMat = standardMat({ kind: 'metal', tint: '#5a4a30', wear: 0.4, roughness: 0.85, metalness: 0.5 })

function ElevatorLobby({ doorState, score }) {
  const doorT = useRef(0)   // 0 closed .. 1 open
  const leftRef = useRef()
  const rightRef = useRef()
  const carLightRef = useRef()
  const indicatorTex = useMemo(() => makeFloorIndicatorTexture(score), [score])

  useFrame((_, dt) => {
    const target = doorState === 'closed' ? 0 : doorState === 'closing' ? 0 : 1
    doorT.current = THREE.MathUtils.damp(doorT.current, target, doorState === 'opening' || doorState === 'closing' ? 3.2 : 8, dt)
    const slide = doorT.current * (DOOR_W * 0.92)
    if (leftRef.current) leftRef.current.position.x = -DOOR_W / 2 - slide
    if (rightRef.current) rightRef.current.position.x = DOOR_W / 2 + slide
    if (carLightRef.current) carLightRef.current.intensity = doorT.current * 22
  })

  return (
    <group position={[0, 0, ELEV_Z]}>
      {/* the housing — a small penthouse structure standing on the roof,
          concrete surface with materials.js grazing-light variance */}
      <mesh position={[0, ELEV_H / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[ELEV_W, ELEV_H, ELEV_D]} />
        <primitive object={housingMat} attach="material" />
      </mesh>
      {/* the empty, lit car — visible the moment the doors part */}
      <mesh position={[0, 1.1, -0.15]}>
        <boxGeometry args={[DOOR_W * 1.7, 2.1, 0.5]} />
        <meshStandardMaterial color="#c9c0a8" emissive="#fff3d0" emissiveIntensity={0.35} roughness={0.7} />
      </mesh>
      <pointLight ref={carLightRef} position={[0, 1.6, -0.1]} color="#fff3d0" intensity={0} distance={4} decay={2} />

      {/* two door slabs, sliding apart on X — brushed metal, beveled edges,
          a thin dark seam standing in for the panel gap between them */}
      <RoundedBox ref={leftRef} args={[DOOR_W, DOOR_H, 0.05]} radius={0.012} smoothness={2} position={[-DOOR_W / 2, DOOR_H / 2, ELEV_D / 2 + 0.02]}>
        <primitive object={doorMat} attach="material" />
      </RoundedBox>
      <RoundedBox ref={rightRef} args={[DOOR_W, DOOR_H, 0.05]} radius={0.012} smoothness={2} position={[DOOR_W / 2, DOOR_H / 2, ELEV_D / 2 + 0.02]}>
        <primitive object={doorMat} attach="material" />
      </RoundedBox>
      <mesh position={[0, DOOR_H / 2, ELEV_D / 2 + 0.045]}>
        <boxGeometry args={[0.012, DOOR_H * 0.94, 0.01]} />
        <meshStandardMaterial color="#100d08" roughness={0.7} />
      </mesh>

      {/* the floor indicator, permanently reading the score */}
      <mesh position={[0, DOOR_H + 0.32, ELEV_D / 2 + 0.03]}>
        <planeGeometry args={[0.62, 0.29]} />
        <meshBasicMaterial map={indicatorTex} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* --------------------------------------------------------------- the rat */

// A small dark mass walking the parapet rail on an endless loop, gold rim
// light picking out its silhouette against the skyline haze. Runs regardless
// of the elevator's own timer — it never stops, per the brief.
function RailRat() {
  const ref = useRef()
  const lightRef = useRef()
  const railX = ROOF_W / 2 - 0.22
  const railY = PARAPET_H + 0.05
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.16
    // triangle wave, so it walks the rail and turns around at each end
    // rather than teleporting or sliding through a sine's soft reversal
    const tri = Math.abs(((t % 1) * 2) - 1) * 2 - 1
    const z = tri * (ROOF_D / 2 - 0.6)
    if (ref.current) {
      ref.current.position.set(railX, railY, z)
      const facing = Math.sin(t * Math.PI * 2) >= 0 ? 0 : Math.PI
      ref.current.rotation.y = facing
    }
    if (lightRef.current) lightRef.current.position.set(railX - 0.3, railY + 0.3, z)
  })
  return (
    <group>
      <group ref={ref}>
        <mesh scale={[1, 0.5, 1.4]}>
          <capsuleGeometry args={[0.06, 0.1, 4, 8]} />
          <meshStandardMaterial color="#0a0806" roughness={0.95} />
        </mesh>
      </group>
      <pointLight ref={lightRef} color="#e8b060" intensity={3.2} distance={2.4} decay={2.4} />
    </group>
  )
}

/* ------------------------------------------------------- tagged figures */

// A plain hand-built silhouette rather than props.jsx's abstractFigure: this
// component needs its own material ref on the label quad above the figure's
// head so the gaze-gated swap below can flip the map in place, which the
// prop kit's own component (no ref forwarding) doesn't expose.
function TaggedFigure({ pos, initial, doorOpen, copTex, ratTex }) {
  const kindRef = useRef(initial)
  const bucketRef = useRef(-1)
  const matRef = useRef()

  useFrame(({ clock }) => {
    if (!doorOpen) { bucketRef.current = -1; return }
    // same "how far off view-center" math as systems/PeripheralFigure.jsx,
    // but inverted: that system fades a figure IN once it leaves center,
    // this one only allows a CONTENT swap while the prop is NOT centered —
    // the label is different by the time you look back, never while you
    // watch it happen
    const toYaw = Math.atan2(-pos[0], -pos[2])
    let d = Math.abs(gaze.yaw - toYaw)
    while (d > Math.PI) d = Math.abs(d - Math.PI * 2)
    const centered = d < 0.5
    const bucket = Math.floor(clock.elapsedTime / 1.6)
    if (!centered && bucket !== bucketRef.current) {
      bucketRef.current = bucket
      kindRef.current = kindRef.current === 'COP' ? 'RAT' : 'COP'
      if (matRef.current) {
        matRef.current.map = kindRef.current === 'COP' ? copTex : ratTex
        matRef.current.needsUpdate = true
      }
    }
  })

  return (
    <group position={pos}>
      <mesh position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.2, 0.5, 4, 8]} />
        <meshStandardMaterial color="#14110c" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshStandardMaterial color="#14110c" roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.05, 0]}>
        <planeGeometry args={[0.52, 0.29]} />
        <meshBasicMaterial ref={matRef} map={initial === 'COP' ? copTex : ratTex} transparent side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  )
}

// Kept off the extreme screen edge and off the near clip: a sphere/capsule
// head positioned near the frame's rim under a wide FOV stretches badly
// (real perspective-lens behaviour, not a bug) — QA pass moved these in
// toward center-ish ground and back from the camera so they read as figures,
// not distorted blobs.
const TAG_FIGURES = [
  { pos: [-3.0, 0, -2.0], initial: 'COP' },
  { pos: [3.0, 0, -2.0], initial: 'RAT' },
  { pos: [-0.9, 0, -0.9], initial: 'COP' },
]

// Cigarette butts — small clutter, authored (not scattered blind) in a loose
// huddle just off the vent's downwind side, the way a roof crew's smoke
// break actually leaves them. Cheap enough (5) not to need instancing.
const BUTT_SEEDS = [
  [0.5, -0.15, 0.02], [0.62, -0.22, 1.4], [0.44, 0.05, -0.6],
  [0.7, -0.05, 2.1], [0.56, -0.3, 3.0],
]
function CigaretteButts() {
  return (
    <group>
      {BUTT_SEEDS.map(([x, z, rot], i) => (
        <group key={i} position={[x, 0.009, z]} rotation={[Math.PI / 2, 0, rot]}>
          <mesh position={[0, -0.02, 0]}>
            <cylinderGeometry args={[0.007, 0.007, 0.07, 6]} />
            <meshStandardMaterial color="#e8e0cc" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.025, 0]}>
            <cylinderGeometry args={[0.0075, 0.0075, 0.02, 6]} />
            <meshStandardMaterial color="#c9793a" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

const ventBodyMat = standardMat({ kind: 'metal', tint: '#4a4438', wear: 0.55, roughness: 0.82, metalness: 0.3 })

function RoofVentDossier({ film }) {
  const palette = sheetOf(film.palette)
  const [dossierTex, setDossierTex] = useState(null)
  const [metaTex, setMetaTex] = useState(null)
  const rustTexA = useMemo(() => makeRustStreakTexture(5), [])
  const rustTexB = useMemo(() => makeRustStreakTexture(11), [])

  useEffect(() => {
    let live = true
    const t = makeDossierTexture(film, palette)
    if (live) setDossierTex(t)
    return () => { live = false; t.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug])

  useEffect(() => {
    let live = true
    const t = makeMetaTexture(film, palette)
    if (live) setMetaTex(t)
    return () => { live = false; t.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug])

  return (
    <group position={[-3.2, 0, 1.6]} rotation={[0, 0.3, 0]}>
      {/* the vent itself: beveled body, rust streaks bleeding from the
          fasteners along its front and side faces */}
      <Bevel pos={[0, 0.32, 0]} w={0.9} h={0.64} d={0.6} radius={0.02} mat={ventBodyMat} castShadow />
      <mesh position={[-0.2, 0.34, 0.302]}>
        <planeGeometry args={[0.22, 0.5]} />
        <meshBasicMaterial map={rustTexA} transparent opacity={0.85} depthWrite={false} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      <mesh position={[0.452, 0.34, 0.1]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshBasicMaterial map={rustTexB} transparent opacity={0.7} depthWrite={false} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      <mesh position={[0, 0.66, 0]} rotation={[-Math.PI / 2, 0, 0.05]}>
        <planeGeometry args={[0.78, 0.55]} />
        {dossierTex
          ? <meshBasicMaterial key="mapped" map={dossierTex} toneMapped={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" color={palette.paper} toneMapped={false} />}
      </mesh>
      {/* meta line + vibe chips, small, propped against the vent's side */}
      <mesh position={[0.62, 0.5, 0.05]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.5, 0.13]} />
        {metaTex
          ? <meshBasicMaterial key="mapped" map={metaTex} transparent depthWrite={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" transparent opacity={0} />}
      </mesh>
      <CigaretteButts />
    </group>
  )
}

/* -------------------------------------------------------------- doorway */

// Bloodline doors (brief §6): "the rooftop's elevator wall." QA pass: a side
// face of the housing (world x = ±ELEV_W/2) is dead-on with the room's one
// fixed camera station (config.camera sits at x=0, same as the housing) —
// a symmetric box viewed from exactly its own centerline never shows a side
// face at any yaw, only its silhouette edge, so a door mounted there is
// never actually visible from the station this room is composed around
// (this room has no click-to-advance stations like Memento's corridor, just
// the one fixed place you stand). The housing's FRONT face — the same
// plane the elevator doors and floor indicator already live on — IS square
// to the camera, so bloodline doors flank the elevator itself there instead:
// one either side, clear of the DOOR_W-wide elevator doors in the middle.
const DOOR_MOUNT = {
  position: [0, 0, ELEV_Z + ELEV_D / 2 + 0.04],
  rotationY: 0,
  spacing: 1.7,
  scale: 0.75,
}

/* ------------------------------------------------------------------ room */

export default function Departed({ film, config, doors = [], onDoor }) {
  const { grade } = config
  const [doorState, setDoorState] = useState('closed')

  const copTex = useMemo(() => makeTagTexture('COP'), [])
  const ratTex = useMemo(() => makeTagTexture('RAT'), [])

  // Wave T: the call button's rush hook. `doorStateRef` mirrors `doorState`
  // so the button (an imperative callback, not a render) always sees the
  // current stage; `arrivalTimerRef` is the ONE timer the button is ever
  // allowed to touch — the outermost "waiting for the car" one, never the
  // open/close slide timers, so a press can't interrupt a door already in
  // motion.
  const doorStateRef = useRef('closed')
  useEffect(() => { doorStateRef.current = doorState }, [doorState])
  const arrivalTimerRef = useRef(null)
  const rushRef = useRef(null)

  useEffect(() => {
    let live = true
    const timers = []

    function scheduleArrival(wait) {
      const id = setTimeout(() => {
        if (!live) return
        arrivalTimerRef.current = null
        setDoorState('opening')
        notifyElevatorOpen()
        timers.push(setTimeout(() => {
          if (!live) return
          setDoorState('open')
          timers.push(setTimeout(() => {
            if (!live) return
            setDoorState('closing')
            timers.push(setTimeout(() => {
              if (!live) return
              setDoorState('closed')
              scheduleArrival(nextWaitMs())
            }, SLIDE_MS))
          }, HOLD_MS))
        }, SLIDE_MS))
      }, wait)
      timers.push(id)
      arrivalTimerRef.current = id
    }
    scheduleArrival(FIRST_WAIT_MS)

    rushRef.current = () => {
      if (doorStateRef.current !== 'closed' || arrivalTimerRef.current == null) return
      clearTimeout(arrivalTimerRef.current)
      const idx = timers.indexOf(arrivalTimerRef.current)
      if (idx !== -1) timers.splice(idx, 1)
      scheduleArrival(Math.random() * 2000)
    }

    return () => { live = false; rushRef.current = null; timers.forEach(clearTimeout) }
  }, [])

  useRoomAudio(startDepartedAudio)

  // P1 polish pass: the two flat point lights become a layered rig — a low,
  // wide golden-hour key (the same direction as the sun disc/skyline glow
  // in RoofShell, so shadows actually agree with the visible sun), one warm
  // practical at the elevator lintel, a cool sky bounce, and a rim on the
  // parapet's far side for the "long shadows, low sun" feel the brief asks
  // for. Only the key casts (one 512 map, spec's own "one shadow map max").
  const lights = useMemo(() => ({
    key: {
      type: 'spot', pos: [9, 3.6, -8], target: [-2, 0, -1],
      color: grade.key || '#e8b060', intensity: (grade.keyIntensity ?? 1) * 1.5,
      distance: 34, decay: 1.7, angle: 0.95, penumbra: 0.5,
      castShadow: true, shadowMapSize: 512, shadowNear: 1, shadowFar: 24,
    },
    practicals: [
      { pos: [0, 2.35, -3.7], color: '#ffd39a', intensity: 0.4, distance: 5, decay: 2 },
      // the near-camera general exposure light — non-shadow-casting so it
      // never fights the key's own grazing shadow direction, but strong
      // enough that the foreground (floor, tag figures, elevator face)
      // reads instead of sitting in silhouette under a distant sun alone.
      { pos: [0, 2.6, 1.4], color: '#ffcf9a', intensity: 1.0, distance: 11, decay: 1.8 },
    ],
    bounce: [
      { pos: [0, 1.4, 4], color: grade.fill || '#3a2e22', intensity: 0.7, distance: 18, decay: 1.7 },
    ],
    rim: { pos: [-9, 2.2, -2], color: '#ffd9a0', intensity: 0.8, distance: 22, decay: 2 },
  }), [grade.key, grade.fill, grade.keyIntensity])

  return (
    <group>
      <DepartedColliders spawn={config.camera?.pos} />
      <fogExp2 attach="fog" args={[grade.fogColor || '#e8b060', 0.016]} />
      <LightRig lights={lights} />

      <RoofShell grade={grade} />
      <Skyline grade={grade} />
      <ElevatorLobby doorState={doorState} score={film.score} />
      <CallButton onPress={() => rushRef.current?.()} />
      <RailRat />

      {TAG_FIGURES.map((f, i) => (
        <TaggedFigure
          key={i}
          pos={f.pos}
          initial={f.initial}
          doorOpen={doorState === 'open'}
          copTex={copTex}
          ratTex={ratTex}
        />
      ))}

      <RoofVentDossier film={film} />

      <DoorRow
        doors={doors}
        position={DOOR_MOUNT.position}
        rotationY={DOOR_MOUNT.rotationY}
        spacing={DOOR_MOUNT.spacing}
        scale={DOOR_MOUNT.scale}
        grade={grade}
        onDoor={onDoor}
      />
    </group>
  )
}
