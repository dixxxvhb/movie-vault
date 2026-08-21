import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { gaze } from '../../CameraRig.jsx'
import { makeMetaTexture } from '../infoTextures.js'
import { sheetOf } from '../../palette.js'
import { useRoomAudio } from '../audio/engine.js'
import { start as startDepartedAudio } from '../audio/recipes/the-departed.js'
import { notifyElevatorOpen } from './departedBus.js'
import {
  makeSkyTexture, makeGravelTexture, makeTagTexture,
  makeFloorIndicatorTexture, makeDossierTexture,
} from './departedTextures.js'

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

/* --------------------------------------------------------------- roof/sky */

function RoofShell({ grade }) {
  const gravelTex = useMemo(() => makeGravelTexture(), [])
  const skyTex = useMemo(
    () => makeSkyTexture(grade.fill || '#3a2e22', grade.key || '#e8b060', '#241a10'),
    [grade.fill, grade.key]
  )
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOF_W, ROOF_D]} />
        <meshStandardMaterial map={gravelTex} roughness={0.96} />
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
      {/* parapet: four low walls, gap-free — the rat gets its own segment */}
      <mesh position={[0, PARAPET_H / 2, -ROOF_D / 2]}>
        <boxGeometry args={[ROOF_W, PARAPET_H, PARAPET_T]} />
        <meshStandardMaterial color="#2a241c" roughness={0.9} />
      </mesh>
      <mesh position={[0, PARAPET_H / 2, ROOF_D / 2]}>
        <boxGeometry args={[ROOF_W, PARAPET_H, PARAPET_T]} />
        <meshStandardMaterial color="#2a241c" roughness={0.9} />
      </mesh>
      <mesh position={[-ROOF_W / 2, PARAPET_H / 2, 0]}>
        <boxGeometry args={[PARAPET_T, PARAPET_H, ROOF_D]} />
        <meshStandardMaterial color="#2a241c" roughness={0.9} />
      </mesh>
      <mesh position={[ROOF_W / 2, PARAPET_H / 2, 0]}>
        <boxGeometry args={[PARAPET_T, PARAPET_H, ROOF_D]} />
        <meshStandardMaterial color="#2a241c" roughness={0.9} />
      </mesh>
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

/* -------------------------------------------------------------- elevator */

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
      {/* the housing — a small penthouse structure standing on the roof */}
      <mesh position={[0, ELEV_H / 2, 0]}>
        <boxGeometry args={[ELEV_W, ELEV_H, ELEV_D]} />
        <meshStandardMaterial color="#332c22" roughness={0.85} />
      </mesh>
      {/* the empty, lit car — visible the moment the doors part */}
      <mesh position={[0, 1.1, -0.15]}>
        <boxGeometry args={[DOOR_W * 1.7, 2.1, 0.5]} />
        <meshStandardMaterial color="#c9c0a8" emissive="#fff3d0" emissiveIntensity={0.35} roughness={0.7} />
      </mesh>
      <pointLight ref={carLightRef} position={[0, 1.6, -0.1]} color="#fff3d0" intensity={0} distance={4} decay={2} />

      {/* two door slabs, sliding apart on X */}
      <mesh ref={leftRef} position={[-DOOR_W / 2, DOOR_H / 2, ELEV_D / 2 + 0.02]}>
        <boxGeometry args={[DOOR_W, DOOR_H, 0.05]} />
        <meshStandardMaterial color="#5a4a30" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh ref={rightRef} position={[DOOR_W / 2, DOOR_H / 2, ELEV_D / 2 + 0.02]}>
        <boxGeometry args={[DOOR_W, DOOR_H, 0.05]} />
        <meshStandardMaterial color="#5a4a30" roughness={0.5} metalness={0.3} />
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

/* --------------------------------------------------------- dossier + vent */

function RoofVentDossier({ film }) {
  const palette = sheetOf(film.palette)
  const [dossierTex, setDossierTex] = useState(null)
  const [metaTex, setMetaTex] = useState(null)

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
      {/* the vent itself */}
      <mesh position={[0, 0.32, 0]}>
        <boxGeometry args={[0.9, 0.64, 0.6]} />
        <meshStandardMaterial color="#4a4438" roughness={0.8} metalness={0.15} />
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
    </group>
  )
}

/* ------------------------------------------------------------------ room */

export default function Departed({ film, config }) {
  const { grade } = config
  const [doorState, setDoorState] = useState('closed')

  const copTex = useMemo(() => makeTagTexture('COP'), [])
  const ratTex = useMemo(() => makeTagTexture('RAT'), [])

  useEffect(() => {
    let live = true
    const timers = []

    function scheduleArrival(wait) {
      timers.push(setTimeout(() => {
        if (!live) return
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
      }, wait))
    }
    scheduleArrival(FIRST_WAIT_MS)

    return () => { live = false; timers.forEach(clearTimeout) }
  }, [])

  useRoomAudio(startDepartedAudio)

  return (
    <group>
      <fogExp2 attach="fog" args={[grade.fogColor || '#e8b060', 0.016]} />
      <pointLight position={[0, 3.2, 1]} intensity={(grade.keyIntensity ?? 1) * 22} color={grade.key || '#e8b060'} distance={22} decay={2} />
      <pointLight position={[0, 1.6, 3]} intensity={8} color={grade.fill || '#3a2e22'} distance={12} decay={2} />

      <RoofShell grade={grade} />
      <Skyline grade={grade} />
      <ElevatorLobby doorState={doorState} score={film.score} />
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
    </group>
  )
}
