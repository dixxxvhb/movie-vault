import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { podium as Podium, chairRow as ChairRow, slab as Slab } from '../props.jsx'
import { useRoomAudio } from '../audio/engine.js'
import { start as startDisclosureAudio } from '../audio/recipes/disclosure-day.js'
import {
  makeSpeechScrollTexture, makePlinthSealTexture, makeBronzePlaqueTexture, makeRevealLabelTexture,
} from './disclosureDayTextures.js'
import DoorRow from '../DoorRow.jsx'
import { registerColliders, setBounds, clearOwner, resolveStep } from '../colliders.js'

// 5.2 — "the podium." Over-lit civic hall, podium, rows of empty chairs,
// flags without insignia. Speech text scrolls slowly and infinitely up
// every wall, saying nothing — the room is boring on purpose, and leaving
// it feels great, which is the review. A giant curtain marked REVEAL pulls
// back every ~45s onto an empty alcove: nothing, on schedule.
const ROOM_W = 6, ROOM_D = 7, ROOM_H = 3.4
const CURTAIN_PERIOD = 45
const CURTAIN_W = 2.6
const CURTAIN_H = 2.6
const CURTAIN_Y = 1.7
const CURTAIN_Z = -ROOM_D / 2 + 0.06

/* ------------------------------------------------------------- colliders */
// Wave M3: contract #3 — "podium + chair rows block; chair ROWS should have
// per-row rects with walkable gaps as rendered." Three rows at z -0.9/0.9/
// 2.4 (FlagsAndRows below) — one rect per row rather than one blob covering
// the whole seating block, so the 1.8m gaps between rows stay open aisles.
const ROOM_ID = 'bespoke:disclosure-day'
const WALL_T = 0.12

const DD_SHELL_RECTS = [
  { minX: -ROOM_W / 2 - WALL_T, maxX: -ROOM_W / 2, minZ: -ROOM_D / 2, maxZ: ROOM_D / 2 },
  { minX: ROOM_W / 2, maxX: ROOM_W / 2 + WALL_T, minZ: -ROOM_D / 2, maxZ: ROOM_D / 2 },
  { minX: -ROOM_W / 2, maxX: ROOM_W / 2, minZ: -ROOM_D / 2 - WALL_T, maxZ: -ROOM_D / 2 },
  { minX: -ROOM_W / 2, maxX: ROOM_W / 2, minZ: ROOM_D / 2, maxZ: ROOM_D / 2 + WALL_T },
]

const PODIUM_RECT = { minX: -0.3, maxX: 0.3, minZ: -2.85, maxZ: -2.35, top: 1.2 }

// One rect per chair row (count 7, spacing 0.62 — FlagsAndRows below).
const ROW_COUNT = 7
const ROW_SPACING = 0.62
const ROW_HALF_X = (ROW_SPACING * (ROW_COUNT - 1)) / 2 + 0.22
const CHAIR_ROW_RECTS = [-0.9, 0.9, 2.4].map((z) => ({
  minX: -ROW_HALF_X, maxX: ROW_HALF_X, minZ: z - 0.22, maxZ: z + 0.22, top: 0.44,
}))

const FLAG_RECTS = [-2.4, 2.4].map((x) => ({
  minX: x - 0.25, maxX: x + 0.25, minZ: -2.8 - 0.03, maxZ: -2.8 + 0.03, top: 2.2,
}))

const PLINTH_RECT = { minX: 1.45, maxX: 1.95, minZ: -1.35, maxZ: -0.85, top: 0.9 }

function DisclosureColliders({ spawn }) {
  useEffect(() => {
    registerColliders(ROOM_ID, [...DD_SHELL_RECTS, PODIUM_RECT, ...CHAIR_ROW_RECTS, ...FLAG_RECTS, PLINTH_RECT])
    setBounds(ROOM_ID, {
      kind: 'rect',
      minX: -ROOM_W / 2 + 0.1, maxX: ROOM_W / 2 - 0.1,
      minZ: -ROOM_D / 2 + 0.1, maxZ: ROOM_D / 2 - 0.1,
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

/* ------------------------------------------------------------------ shell */

function flatTex(tint) {
  const S = 128
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, S, S)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function Hall() {
  const wallT = useMemo(() => flatTex('#d8d2b8'), [])
  const floorT = useMemo(() => flatTex('#c0bca0'), [])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial map={floorT} roughness={0.8} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial map={wallT} roughness={0.95} />
      </mesh>
      <mesh position={[0, ROOM_H / 2, -ROOM_D / 2]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial map={wallT} roughness={0.9} />
      </mesh>
      <mesh position={[0, ROOM_H / 2, ROOM_D / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial map={wallT} roughness={0.9} />
      </mesh>
      <mesh position={[-ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial map={wallT} roughness={0.9} />
      </mesh>
      <mesh position={[ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial map={wallT} roughness={0.9} />
      </mesh>
    </group>
  )
}

// Scrolling filler speech, one instance per wall band, all sharing one
// texture (offset animated per-instance so they don't all scroll in lock
// step) — infinite because it tiles, cheap because nothing redraws.
function ScrollBand({ pos, rot, w, h, tex, speed, repeatY }) {
  const matRef = useRef()
  useFrame((_, dt) => {
    if (matRef.current) matRef.current.map.offset.y += dt * speed
  })
  const ownTex = useMemo(() => {
    const t = tex.clone()
    t.repeat.set(1, repeatY)
    t.needsUpdate = true
    return t
  }, [tex, repeatY])
  return (
    <mesh position={pos} rotation={rot}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial ref={matRef} map={ownTex} toneMapped={false} />
    </mesh>
  )
}

function SpeechWalls() {
  const tex = useMemo(() => makeSpeechScrollTexture(), [])
  return (
    <>
      <ScrollBand pos={[-ROOM_W / 2 + 0.02, ROOM_H / 2, 1.4]} rot={[0, Math.PI / 2, 0]} w={ROOM_D - 1.4} h={ROOM_H - 0.3} tex={tex} speed={0.035} repeatY={3.4} />
      <ScrollBand pos={[ROOM_W / 2 - 0.02, ROOM_H / 2, 1.4]} rot={[0, -Math.PI / 2, 0]} w={ROOM_D - 1.4} h={ROOM_H - 0.3} tex={tex} speed={0.028} repeatY={3.4} />
      <ScrollBand pos={[0, ROOM_H / 2, ROOM_D / 2 - 0.02]} rot={[0, Math.PI, 0]} w={ROOM_W - 0.4} h={ROOM_H - 0.3} tex={tex} speed={0.031} repeatY={2.8} />
      <ScrollBand pos={[-1.9, ROOM_H / 2, -ROOM_D / 2 + 0.02]} rot={[0, 0, 0]} w={1.6} h={ROOM_H - 0.3} tex={tex} speed={0.04} repeatY={2.4} />
      <ScrollBand pos={[1.9, ROOM_H / 2, -ROOM_D / 2 + 0.02]} rot={[0, 0, 0]} w={1.6} h={ROOM_H - 0.3} tex={tex} speed={0.026} repeatY={2.4} />
    </>
  )
}

/* ---------------------------------------------------------- flags + rows */

function FlagsAndRows() {
  return (
    <group>
      <Slab pos={[-2.4, 1.1, -2.8]} size={[0.5, 2.2, 0.06]} color="#c8c0a8" />
      <Slab pos={[2.4, 1.1, -2.8]} size={[0.5, 2.2, 0.06]} color="#c8c0a8" />
      <Slab pos={[-2.4, 2.35, -2.8]} size={[0.05, 0.28, 0.08]} color="#8a8468" />
      <Slab pos={[2.4, 2.35, -2.8]} size={[0.05, 0.28, 0.08]} color="#8a8468" />
      {[-0.9, 0.9, 2.4].map((z, i) => (
        <ChairRow key={i} pos={[0, 0, z]} count={7} spacing={0.62} color="#9a9480" seatH={0.44} />
      ))}
    </group>
  )
}

/* ---------------------------------------------------------------- curtain */

function RevealCurtain() {
  const left = useRef()
  const right = useRef()
  const labelRef = useRef()
  const labelTex = useMemo(() => makeRevealLabelTexture(), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime % CURTAIN_PERIOD
    const openPhase = t > CURTAIN_PERIOD * 0.35 && t < CURTAIN_PERIOD * 0.65
    const local = openPhase ? (t - CURTAIN_PERIOD * 0.35) / (CURTAIN_PERIOD * 0.3) : 0
    const openAmt = openPhase ? Math.min(1, local * 3) * Math.min(1, (1 - local) * 3 + 0.001) : 0
    const spread = Math.max(openAmt, 0) * (CURTAIN_W / 2)
    if (left.current) left.current.position.x = -CURTAIN_W / 4 - spread
    if (right.current) right.current.position.x = CURTAIN_W / 4 + spread
    if (labelRef.current) labelRef.current.material.opacity = 1 - Math.min(1, openAmt * 1.6)
  })
  return (
    <group position={[0, CURTAIN_Y, CURTAIN_Z]}>
      {/* the alcove behind — empty, on purpose, per the brief */}
      <mesh position={[0, 0, -0.15]}>
        <planeGeometry args={[CURTAIN_W - 0.1, CURTAIN_H - 0.1]} />
        <meshStandardMaterial color="#0a0a0a" roughness={1} />
      </mesh>
      <mesh ref={left} position={[-CURTAIN_W / 4, 0, 0.03]}>
        <planeGeometry args={[CURTAIN_W / 2, CURTAIN_H]} />
        <meshStandardMaterial color="#7a2a2a" roughness={0.9} />
      </mesh>
      <mesh ref={right} position={[CURTAIN_W / 4, 0, 0.03]}>
        <planeGeometry args={[CURTAIN_W / 2, CURTAIN_H]} />
        <meshStandardMaterial color="#7a2a2a" roughness={0.9} />
      </mesh>
      <mesh ref={labelRef} position={[0, CURTAIN_H / 2 + 0.32, 0.06]}>
        <planeGeometry args={[2.4, 0.5]} />
        <meshBasicMaterial map={labelTex} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* --------------------------------------------------------------- signage */

function PlinthSeal({ score }) {
  const tex = useMemo(() => makePlinthSealTexture(score), [score])
  return (
    <group position={[1.7, 0, -1.1]}>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.5, 0.9, 0.5]} />
        <meshStandardMaterial color="#b8b090" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.911, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 32]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

// The plaque: sized generously, hung with real margin on a side wall clear
// of the chairs, curtain, and plinth — QA note on this file: a plaque this
// dense clips at the edges if it's crammed into a corner, so it gets its
// own uncontested stretch of wall.
function BronzePlaque({ film }) {
  const tex = useMemo(() => makeBronzePlaqueTexture(film), [film.slug, film.hot_take])
  return (
    <mesh position={[-ROOM_W / 2 + 0.03, 1.6, -1.9]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[2.6, 1.95]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ doors */

// Pulled a little off the front wall itself (which carries a scroll band
// flush against it) so a mounted door reads as standing IN the wall rather
// than z-fighting the texture plane behind it.
const DOOR_MOUNT = { position: [0, 0, ROOM_D / 2 - 0.4], rotationY: Math.PI, spacing: 0.95, scale: 0.72 }

/* ------------------------------------------------------------------ room */

export default function DisclosureDay({ film, config, doors = [], onDoor }) {
  const { grade } = config

  useRoomAudio(startDisclosureAudio)

  return (
    <group>
      <DisclosureColliders spawn={config.camera?.pos} />
      <fogExp2 attach="fog" args={[grade.fogColor || '#d8d2b8', 0.012]} />
      {/* over-lit and flat: several soft, even sources rather than one
          dramatic key — the brief's own "over-lit civic grade" */}
      <ambientLight intensity={grade.ambient ?? 0.55} color="#ffffff" />
      <pointLight position={[0, ROOM_H - 0.2, -1]} intensity={(grade.keyIntensity ?? 1) * 16} color={grade.key || '#f4f0e0'} distance={12} decay={2} />
      <pointLight position={[-2, ROOM_H - 0.2, 1.5]} intensity={9} color="#f4f0e0" distance={10} decay={2} />
      <pointLight position={[2, ROOM_H - 0.2, 1.5]} intensity={9} color="#f4f0e0" distance={10} decay={2} />

      <Hall />
      <SpeechWalls />
      <FlagsAndRows />
      <Podium pos={[0, 0, -2.6]} color="#3a3a42" />
      <RevealCurtain />
      <PlinthSeal score={film.score} />
      <BronzePlaque film={film} />

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
