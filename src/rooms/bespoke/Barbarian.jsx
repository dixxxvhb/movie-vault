import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { lampPractical as LampPractical } from '../props.jsx'
import { setGradeOverride, clearGradeOverride } from '../gradeBus.js'
import { useRoomAudio, playOneShot } from '../audio/engine.js'
import { start as startBarbarianAudio } from '../audio/recipes/barbarian.js'
import { notifyDepth } from './barbarianBus.js'
import { makeIndexCardTexture, makeDoorRatingTexture, makeRainWindowTexture } from './barbarianTextures.js'
import DoorRow from '../DoorRow.jsx'
import { registerColliders, setBounds, registerFloor, clearOwner } from '../colliders.js'
import Touchable from '../Touchable.jsx'

// 7.6 — "the house on Barbary." The living room first (cozy, tidy, rain
// outside), the basement door standing open, then a straight descent
// through the corridor of doors, the hidden room, and the rope-marked
// passage into handheld dark.
//
// Wave M3: converted from click-to-station to free walk. "Depth" is no
// longer a station index you click through — it's a zone derived from the
// walker's own z each frame (readDepthZ below), using the exact same z
// thresholds the old click-plane boundaries sat at, so every gated visual
// (living room props, the smash-cut timer, HandheldSway, DescentGlow) fires
// at the same physical spot it always did.
//
// Mid-visit, on an independent ~70s timer regardless of where you're
// standing: a full second of oversaturated sunny daylight, hard swap via
// gradeBus (no easing, same doctrine as Stby's own swerve), then back with
// no explanation — the Justin Long cut.
const PEEK = typeof window !== 'undefined' &&
  (window.location.search.includes('peekSmash') || window.location.hash.includes('peekSmash'))
const SMASH_PERIOD_MS = PEEK ? 3000 : 70000 + Math.random() * 6000
const SMASH_DURATION_MS = PEEK ? 1400 : 1000

// The three old click-plane boundaries, kept as the depth thresholds: a
// walker south of DEPTH_BOUNDS[0] is depth 0 (corridor of doors), south of
// [1] is depth 1 (hidden room), south of [2] is depth 2 (rope passage).
// North of [0] is depth -1, the living room.
const DEPTH_BOUNDS = [-2.7, -4.2, -6.5]
function depthForZ(z) {
  if (z > DEPTH_BOUNDS[0]) return -1
  if (z > DEPTH_BOUNDS[1]) return 0
  if (z > DEPTH_BOUNDS[2]) return 1
  return 2
}

/* ------------------------------------------------------------ living room */

const LR_W = 4, LR_D = 3.6, LR_H = 2.5
const LR_DOOR_Z = -LR_D / 2
const LR_DOOR_W = 1.0
const LR_DOOR_H = 2.0

function wallTex(tint, seed) {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, S, S)
  let s = seed >>> 0
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  ctx.globalAlpha = 0.06
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = r() > 0.5 ? '#000' : '#fff'
    ctx.fillRect(r() * S, r() * S, 1.4, 1.4)
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function LivingRoomShell() {
  const wallT = useMemo(() => wallTex('#c9b896', 601), [])
  const floorT = useMemo(() => wallTex('#8a6a48', 602), [])
  const sideW = (LR_W - LR_DOOR_W) / 2
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[LR_W, LR_D]} />
        <meshStandardMaterial map={floorT} roughness={0.85} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, LR_H, 0]}>
        <planeGeometry args={[LR_W, LR_D]} />
        <meshStandardMaterial map={wallT} roughness={0.95} />
      </mesh>
      <mesh position={[0, LR_H / 2, LR_D / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[LR_W, LR_H]} />
        <meshStandardMaterial map={wallT} roughness={0.9} />
      </mesh>
      {/* -Z wall, split around the basement door */}
      <mesh position={[-(sideW / 2 + LR_DOOR_W / 2), LR_H / 2, LR_DOOR_Z]}>
        <planeGeometry args={[sideW, LR_H]} />
        <meshStandardMaterial map={wallT} roughness={0.9} />
      </mesh>
      <mesh position={[sideW / 2 + LR_DOOR_W / 2, LR_H / 2, LR_DOOR_Z]}>
        <planeGeometry args={[sideW, LR_H]} />
        <meshStandardMaterial map={wallT} roughness={0.9} />
      </mesh>
      <mesh position={[0, (LR_DOOR_H + LR_H) / 2, LR_DOOR_Z]}>
        <planeGeometry args={[LR_DOOR_W, LR_H - LR_DOOR_H]} />
        <meshStandardMaterial map={wallT} roughness={0.9} />
      </mesh>
      <mesh position={[-LR_W / 2, LR_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[LR_D, LR_H]} />
        <meshStandardMaterial map={wallT} roughness={0.88} />
      </mesh>
      <mesh position={[LR_W / 2, LR_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[LR_D, LR_H]} />
        <meshStandardMaterial map={wallT} roughness={0.88} />
      </mesh>
    </group>
  )
}

function Couch() {
  return (
    <group position={[-1.2, 0, 0.9]} rotation={[0, 0.25, 0]}>
      <mesh position={[0, 0.24, 0]}>
        <boxGeometry args={[1.3, 0.4, 0.6]} />
        <meshStandardMaterial color="#5a6a58" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.5, -0.26]}>
        <boxGeometry args={[1.3, 0.5, 0.14]} />
        <meshStandardMaterial color="#5a6a58" roughness={0.9} />
      </mesh>
      {[-0.62, 0.62].map((x, i) => (
        <mesh key={i} position={[x, 0.42, 0]}>
          <boxGeometry args={[0.14, 0.44, 0.6]} />
          <meshStandardMaterial color="#4a5a48" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function RainWindow() {
  const tex = useMemo(() => makeRainWindowTexture(), [])
  return (
    <mesh position={[LR_W / 2 - 0.02, 1.5, -0.6]} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={[1.1, 1.4]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  )
}

// The stairs, glimpsed through the open basement doorway rather than walked
// as a continuous mesh — a handful of descending step slabs fading into
// the dark past the door frame, enough to read as "stairs down."
const STAIR_N = 6
const STAIR_STEP_H = 0.16
const STAIR_STEP_D = 0.32
const STAIR_Z0 = LR_DOOR_Z - 0.05    // matches StairsGlimpse's own group z
const STAIR_DEPTH = STAIR_N * STAIR_STEP_D
const STAIR_DROP = STAIR_N * STAIR_STEP_H

// Wave M3: the walker's floor fn, reconstructed straight from StairsGlimpse's
// own module constants above rather than authored separately — the walker's
// eye eases down exactly as far as the six visible slabs actually descend
// (0.96m over 1.92m of depth), flat before the top step and flat again once
// past the last one. The corridor/prop groups below call this same function
// so their rendered geometry sinks in lockstep with where the camera's feet
// actually are; nothing here is stepped, it is one continuous ramp, same as
// a real staircase reads while you're walking down it rather than looking at
// it from the side.
function stairRampY(z) {
  const into = STAIR_Z0 - z
  if (into <= 0) return 0
  if (into >= STAIR_DEPTH) return -STAIR_DROP
  return -STAIR_DROP * (into / STAIR_DEPTH)
}

function StairsGlimpse() {
  return (
    <group position={[0, 0, STAIR_Z0]}>
      {Array.from({ length: STAIR_N }, (_, i) => (
        <mesh key={i} position={[0, -i * STAIR_STEP_H, -i * STAIR_STEP_D]}>
          <boxGeometry args={[LR_DOOR_W - 0.1, 0.14, 0.3]} />
          <meshStandardMaterial color="#1c1712" roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

function LitDoorSignage({ film }) {
  const cardTex = useMemo(() => makeIndexCardTexture(), [])
  const ratingTex = useMemo(() => makeDoorRatingTexture(film.score), [film.score])
  return (
    <group>
      {/* the door itself, standing open against the side wall it swung
          back to rest on — the rating stenciled on its own face */}
      <mesh position={[-LR_DOOR_W / 2 - 0.02, LR_DOOR_H / 2, LR_DOOR_Z + 0.9]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.9, LR_DOOR_H]} />
        <meshStandardMaterial color="#4a3a28" roughness={0.7} />
      </mesh>
      <mesh position={[-LR_DOOR_W / 2 - 0.015, LR_DOOR_H / 2 + 0.1, LR_DOOR_Z + 0.9]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshBasicMaterial map={ratingTex} transparent toneMapped={false} />
      </mesh>
      {/* index card taped to the frame, right at the threshold */}
      <mesh position={[LR_DOOR_W / 2 + 0.03, 1.5, LR_DOOR_Z + 0.02]} rotation={[0, -0.2, 0]}>
        <planeGeometry args={[0.34, 0.4]} />
        <meshBasicMaterial map={cardTex} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ---------------------------------------------------------- the descent */

const TUBE_W = 1.9, TUBE_H = 2.3

function Passage({ z0, z1, tint, dim }) {
  const tex = useMemo(() => wallTex(tint, Math.round(z0 * 97) + 900), [tint, z0])
  const len = z0 - z1
  const mid = (z0 + z1) / 2
  const yOff = stairRampY(mid)
  return (
    <group position={[0, yOff, mid]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TUBE_W, len]} />
        <meshStandardMaterial map={tex} roughness={0.95} color={dim ? '#888' : '#fff'} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, TUBE_H, 0]}>
        <planeGeometry args={[TUBE_W, len]} />
        <meshStandardMaterial map={tex} roughness={0.96} color={dim ? '#666' : '#fff'} />
      </mesh>
      <mesh position={[-TUBE_W / 2, TUBE_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[len, TUBE_H]} />
        <meshStandardMaterial map={tex} roughness={0.9} color={dim ? '#777' : '#fff'} />
      </mesh>
      <mesh position={[TUBE_W / 2, TUBE_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[len, TUBE_H]} />
        <meshStandardMaterial map={tex} roughness={0.9} color={dim ? '#777' : '#fff'} />
      </mesh>
    </group>
  )
}

// door-shaped recesses along the corridor of doors — plain flat insets, our
// own geometry, never a real door you can open (per the brief: "nobody
// should descend," and none of these lead anywhere either)
function DoorRecesses() {
  const items = [
    { x: -TUBE_W / 2 + 0.02, z: -3.6, ry: Math.PI / 2 },
    { x: -TUBE_W / 2 + 0.02, z: -4.3, ry: Math.PI / 2 },
    { x: TUBE_W / 2 - 0.02, z: -3.9, ry: -Math.PI / 2 },
  ]
  return (
    <>
      {items.map((it, i) => (
        <mesh key={i} position={[it.x, 1.05 + stairRampY(it.z), it.z]} rotation={[0, it.ry, 0]}>
          <planeGeometry args={[0.7, 1.9]} />
          <meshStandardMaterial color="#221c16" roughness={0.9} />
        </mesh>
      ))}
    </>
  )
}

/* ------------------------------------------------------------- doors */
// Wave T: the corridor was fully open (DoorRecesses are flat side insets,
// "never a real door you can open" per their own comment) — no physical
// gate anywhere in the descent. Two real doors go in at the same z
// thresholds depthForZ already uses to swap which segment is dressed
// (DEPTH_BOUNDS[0]/[1]), so opening a door and crossing into the next
// visual zone are the same physical step: door 0 gates the corridor of
// doors (light), door 1 gates the hidden room and is the heaviest —
// slower swing, a lower-pitched thunk landing at the end of its travel.
// No third door before the rope passage: that dead end was already
// ungated by design ("nobody should descend further than the rope").
const DOOR_INSET = 0.06   // collider stays inset from both side walls —
                          // defensive margin against the "full-span rect"
                          // penetration fallback documented on corridorColliders
                          // above; the door MESH still reads visually closed
const DOOR_THICK = 0.12
const DOORS = [
  { z: DEPTH_BOUNDS[0], heavy: false },
  { z: DEPTH_BOUNDS[1], heavy: true },
]

function doorRect(z) {
  return {
    minX: -TUBE_W / 2 + DOOR_INSET, maxX: TUBE_W / 2 - DOOR_INSET,
    minZ: z - DOOR_THICK / 2, maxZ: z + DOOR_THICK / 2,
  }
}

function BasementDoor({ z, heavy, index }) {
  const DUR = heavy ? 1500 : 700
  const OPEN_ANGLE = Math.PI * 0.42
  const doorW = TUBE_W - 0.06
  const doorH = TUBE_H - 0.08
  const hingeX = -TUBE_W / 2 + 0.02

  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  const pivot = useRef(null)
  const anim = useRef({ playing: false, t0: 0 })
  const thunkDone = useRef(false)
  const doorTex = useMemo(() => wallTex(heavy ? '#221c16' : '#8a7048', 4100 + index), [heavy, index])

  const ownerId = 'room:barbarian:door' + index
  useEffect(() => {
    registerColliders(ownerId, open ? [] : [doorRect(z)])
    return () => clearOwner(ownerId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, z])

  const handleUse = () => {
    if (openRef.current) return
    openRef.current = true
    setOpen(true)
    thunkDone.current = false
    anim.current = { playing: true, t0: performance.now() }
  }

  useFrame(() => {
    const g = pivot.current
    if (!g) return
    const a = anim.current
    if (a.playing) {
      const t = Math.min(1, (performance.now() - a.t0) / DUR)
      const e = 1 - Math.pow(1 - t, 3)
      g.rotation.y = OPEN_ANGLE * e
      if (t >= 1) {
        a.playing = false
        if (heavy && !thunkDone.current) {
          thunkDone.current = true
          // heavier, lower-pitched than the shared thunk default — the
          // hidden room's own door landing at the end of its travel
          playOneShot('thunk', { startFreq: 70, endFreq: 22, gain: 0.3 })
        }
      }
    }
  })

  return (
    <Touchable onUse={handleUse} reach={2.0} foley="creak" disabled={open} anchor={[0, 1.1, z]}>
      <group position={[hingeX, stairRampY(z), z]}>
        <group ref={pivot}>
          <mesh position={[doorW / 2, doorH / 2, 0]}>
            <boxGeometry args={[doorW, doorH, 0.07]} />
            <meshStandardMaterial map={doorTex} roughness={0.9} color={heavy ? '#6a6258' : '#c9b896'} />
          </mesh>
          <mesh position={[doorW - 0.1, doorH / 2, 0.05]}>
            <boxGeometry args={[0.03, 0.05, 0.03]} />
            <meshStandardMaterial color="#241c14" roughness={0.4} metalness={0.5} />
          </mesh>
        </group>
      </group>
    </Touchable>
  )
}

// Abstract masses only — never explicit, same discipline as Stby's
// FleshMass: a bed frame reduced to its own outline, a tripod REDUCED to
// three legs and a dark box, a bucket that is just a bucket.
function HiddenRoomProps() {
  return (
    <group position={[0, stairRampY(-5.4), -5.4]}>
      {/* bed frame, skeletal */}
      <group position={[-0.5, 0, -0.3]}>
        {[[-0.55, -0.45], [0.55, -0.45], [-0.55, 0.45], [0.55, 0.45]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.24, z]}>
            <boxGeometry args={[0.06, 0.48, 0.06]} />
            <meshStandardMaterial color="#1c1712" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 0.48, 0]}>
          <boxGeometry args={[1.2, 0.05, 1.0]} />
          <meshStandardMaterial color="#1c1712" roughness={0.9} />
        </mesh>
      </group>
      {/* tripod suggestion: three thin legs converging, a small dark mass
          on top, never a lens or a screen */}
      <group position={[0.7, 0, 0.4]}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.18, 0.35, Math.sin(a) * 0.18]} rotation={[0.25, a, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.7, 6]} />
              <meshStandardMaterial color="#161310" roughness={0.9} />
            </mesh>
          )
        })}
        <mesh position={[0, 0.72, 0]}>
          <boxGeometry args={[0.14, 0.1, 0.1]} />
          <meshStandardMaterial color="#0e0c0a" roughness={0.85} />
        </mesh>
      </group>
      {/* the bucket, just a bucket */}
      <mesh position={[-0.9, 0.14, 0.5]}>
        <cylinderGeometry args={[0.18, 0.15, 0.28, 16]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.7} metalness={0.2} />
      </mesh>
    </group>
  )
}

// A rope, marking the wall down the deepest passage — segments of dark tan
// cylinder, roughly knotted, never a real climbing line.
function RopeMarks() {
  const segs = useMemo(() => Array.from({ length: 9 }, (_, i) => ({
    z: -6.8 - i * 0.32,
    y: 0.9 + Math.sin(i * 1.3) * 0.5,
    rot: (i % 2 ? 1 : -1) * 0.3,
  })), [])
  return (
    <group position={[0, -STAIR_DROP, 0]}>
      {segs.map((s, i) => (
        <mesh key={i} position={[-TUBE_W / 2 + 0.05, s.y, s.z]} rotation={[0, 0, s.rot]}>
          <cylinderGeometry args={[0.025, 0.025, 0.4, 8]} />
          <meshStandardMaterial color="#8a7048" roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

function HandheldSway({ active }) {
  useFrame(({ camera, clock }) => {
    if (!active) return
    const t = clock.elapsedTime
    camera.position.x += Math.sin(t * 3.3) * 0.007 + Math.sin(t * 7.9) * 0.003
    camera.position.y += Math.cos(t * 2.6) * 0.005
    camera.rotation.z += Math.sin(t * 2.9) * 0.005
  })
  return null
}

function DescentGlow() {
  const ref = useRef()
  useFrame(({ camera }) => { if (ref.current) ref.current.position.copy(camera.position) })
  return <pointLight ref={ref} color="#c9b090" intensity={40} distance={5} decay={2} />
}

/* ------------------------------------------------------------------ doors */

const DOOR_MOUNT = { position: [1.7, 0, 1.75], rotationY: Math.PI, spacing: 0.9, scale: 0.72 }

/* -------------------------------------------------------------- colliders */
// Wave M3: walls for the living room (split around the basement doorway) +
// the couch, then walls for the whole basement corridor run (a dead end at
// its deepest point — nobody descends further than the rope). Registered as
// plain axis-aligned rects; the corridor never turns, so this is exact, not
// an approximation.
const WALL_T = 0.15
const CORRIDOR_Z_FAR = -9.4

function livingRoomColliders() {
  return [
    // NOTE: no +Z wall. LivingRoomShell never draws one — the front of the
    // box is the "camera side," an intentionally open composition (the
    // entry station itself sits at z=2.5, past LR_D/2=1.8, looking back in
    // through the missing wall). A collider there would seal the player
    // out of their own spawn point, so the LR_D/2..2.8 stretch stays open
    // and the bounds rect below is what keeps the player from wandering off
    // past it.
    // -X / +X walls
    { minX: -LR_W / 2 - WALL_T, maxX: -LR_W / 2, minZ: -LR_D / 2, maxZ: LR_D / 2 },
    { minX: LR_W / 2, maxX: LR_W / 2 + WALL_T, minZ: -LR_D / 2, maxZ: LR_D / 2 },
    // -Z wall, split around the basement doorway
    { minX: -LR_W / 2, maxX: -LR_DOOR_W / 2, minZ: LR_DOOR_Z - WALL_T, maxZ: LR_DOOR_Z },
    { minX: LR_DOOR_W / 2, maxX: LR_W / 2, minZ: LR_DOOR_Z - WALL_T, maxZ: LR_DOOR_Z },
    // the couch — a conservative AABB around its own 0.25rad rotation
    { minX: -1.95, maxX: -0.45, minZ: 0.4, maxZ: 1.4 },
  ]
}

// NOTE: no far dead-end rect on purpose. A rect that caps the FULL width of
// a passage head-on trips the solver's own "already penetrating" fallback
// (pushAxis's cross-axis check treats "your x sits inside this wall's full-
// width span" as embedded-in-a-prop rather than "walking straight at a
// wall," and shoves you sideways out of the corridor entirely — reproduced
// while building this room: holding W into the rope passage's end walked
// the player clean through the side wall). The bounds rect's own minZ below
// is the real stop here: a plain independent clamp has no such cross-talk,
// and it sits snug against the same depth the dead end would have capped.
function corridorColliders() {
  return [
    { minX: -TUBE_W / 2 - WALL_T, maxX: -TUBE_W / 2, minZ: CORRIDOR_Z_FAR, maxZ: LR_DOOR_Z },
    { minX: TUBE_W / 2, maxX: TUBE_W / 2 + WALL_T, minZ: CORRIDOR_Z_FAR, maxZ: LR_DOOR_Z },
  ]
}

/* ------------------------------------------------------------------ room */

export default function Barbarian({ film, config, doors = [], onDoor }) {
  const { grade } = config

  // Wave M3: depth is now read straight off the walker every frame instead
  // of being a station index you click through. depthRef avoids a setState
  // (and a notifyDepth call) on every single frame — only on the frames
  // where the zone actually changes.
  const [depthIndex, setDepthIndex] = useState(-1)
  const depthRef = useRef(-1)

  useFrame(({ camera }) => {
    const d = depthForZ(camera.position.z)
    if (d !== depthRef.current) {
      depthRef.current = d
      setDepthIndex(d)
      notifyDepth(d)
    }
  })

  useEffect(() => {
    const ownerId = 'room:' + (film?.slug ?? 'barbarian')
    registerColliders(ownerId, [...livingRoomColliders(), ...corridorColliders()])
    setBounds(ownerId, {
      kind: 'rect',
      minX: -LR_W / 2 + 0.05,
      maxX: LR_W / 2 - 0.05,
      minZ: CORRIDOR_Z_FAR + 0.05,
      // +0.9 past the entry station (z=2.5), not LR_D/2 — see the "no +Z
      // wall" note in livingRoomColliders above.
      maxZ: 2.8,
    })
    registerFloor(ownerId, stairRampY)
    return () => clearOwner(ownerId)
  }, [film?.slug])

  useEffect(() => notifyDepth(-1), [])

  // Mid-visit smash cut, independent of depth: one hard second of
  // oversaturated daylight, then back, no easing either direction — same
  // "zero easing" doctrine as Stby's own swerve.
  const [smashed, setSmashed] = useState(false)
  useEffect(() => {
    let live = true
    const timers = []
    function schedule() {
      timers.push(setTimeout(() => {
        if (!live) return
        setSmashed(true)
        timers.push(setTimeout(() => {
          if (!live) return
          setSmashed(false)
          schedule()
        }, SMASH_DURATION_MS))
      }, SMASH_PERIOD_MS))
    }
    schedule()
    return () => { live = false; timers.forEach(clearTimeout) }
  }, [])

  useEffect(() => {
    if (smashed) {
      setGradeOverride({ bg: '#fff6da', fogColor: '#fff6da', sat: 0.35, contrast: 0.1, key: '#fff8e0', fill: '#ffe8b0', ambient: 1.3, keyIntensity: 2.2 })
    } else {
      clearGradeOverride()
    }
  }, [smashed])
  useEffect(() => clearGradeOverride, [])

  useRoomAudio(startBarbarianAudio)

  const deep = depthIndex >= 0

  return (
    <group>
      <fogExp2 attach="fog" args={[deep ? '#0c0a08' : (grade.fogColor || '#141416'), deep ? 0.09 : 0.03]} />
      <ambientLight intensity={deep ? 0.08 : (grade.ambient ?? 0.16)} color={grade.fill || '#141416'} />
      <pointLight position={[-1.0, 1.9, 0.6]} intensity={(grade.keyIntensity ?? 1) * 10} color={grade.key || '#e8a860'} distance={6} decay={2} />
      <pointLight position={[0.8, 1.3, 1.4]} intensity={6} color="#e8a860" distance={5} decay={2} />

      {depthIndex < 0 && (
        <>
          <LivingRoomShell />
          <Couch />
          <LampPractical pos={[-0.4, 0.6, 0.4]} color="#ffc888" intensity={1.1} />
          <RainWindow />
          <StairsGlimpse />
          <LitDoorSignage film={film} />
        </>
      )}

      {deep && <DescentGlow />}
      <HandheldSway active={depthIndex === 2} />

      <Passage z0={LR_DOOR_Z - 0.3} z1={-4.6} tint="#3a342c" dim={false} />
      <DoorRecesses />
      <HiddenRoomProps />
      <Passage z0={-4.6} z1={-6.6} tint="#2a2620" dim />
      <RopeMarks />
      <Passage z0={-6.6} z1={-9.4} tint="#161410" dim />

      {DOORS.map((d, i) => <BasementDoor key={i} z={d.z} heavy={d.heavy} index={i} />)}

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
