import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { gaze } from '../../CameraRig.jsx'
import { lampPractical as LampPractical } from '../props.jsx'
import { setGradeOverride, clearGradeOverride } from '../gradeBus.js'
import { useRoomAudio } from '../audio/engine.js'
import { start as startBarbarianAudio } from '../audio/recipes/barbarian.js'
import { notifyDepth } from './barbarianBus.js'
import { makeIndexCardTexture, makeDoorRatingTexture, makeRainWindowTexture } from './barbarianTextures.js'
import DoorRow from '../DoorRow.jsx'
import { wasDrag } from '../../pointer.js'

// 7.6 — "the house on Barbary." The living room first (cozy, tidy, rain
// outside), the basement door standing open, then a straight descent
// through three composed stations: the corridor of doors, the hidden room,
// the rope-marked passage into handheld dark. Eye height drops a little at
// each station rather than a modeled staircase — this app's own doctrine is
// click-to-station, never free-walk (CameraRig.jsx's own header comment),
// so the "descent" is a sequence of places you land, the same trick
// Memento's corridor and Predestination's loop already use.
//
// Mid-visit, on an independent ~70s timer regardless of which station
// you're standing at: a full second of oversaturated sunny daylight, hard
// swap via gradeBus (no easing, same doctrine as Stby's own swerve), then
// back with no explanation — the Justin Long cut.
const PEEK = typeof window !== 'undefined' &&
  (window.location.search.includes('peekSmash') || window.location.hash.includes('peekSmash'))
const SMASH_PERIOD_MS = PEEK ? 3000 : 70000 + Math.random() * 6000
const SMASH_DURATION_MS = PEEK ? 1400 : 1000

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

const STATIONS = [
  { pos: [0.3, 1.55, 2.5], look: [-0.2, 1.3, -1.6], fov: 58 }, // -1, in code index 0: living room
  { pos: [0, 1.45, -3.0], look: [0, 1.28, -6], fov: 48 },    // 0: corridor of doors
  { pos: [0, 1.35, -5.4], look: [0, 1.18, -8], fov: 50 },    // 1: hidden room
  { pos: [0, 1.25, -7.6], look: [0, 1.05, -10.5], fov: 52 }, // 2: rope passage, deepest
]
// index into STATIONS is (stationIndex + 1); stationIndex -1 = living room
const stationFor = (i) => STATIONS[i + 1]

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
function StairsGlimpse() {
  const steps = 6
  return (
    <group position={[0, 0, LR_DOOR_Z - 0.05]}>
      {Array.from({ length: steps }, (_, i) => (
        <mesh key={i} position={[0, -i * 0.16, -i * 0.32]}>
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
  return (
    <group position={[0, 0, mid]}>
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
        <mesh key={i} position={[it.x, 1.05, it.z]} rotation={[0, it.ry, 0]}>
          <planeGeometry args={[0.7, 1.9]} />
          <meshStandardMaterial color="#221c16" roughness={0.9} />
        </mesh>
      ))}
    </>
  )
}

// Abstract masses only — never explicit, same discipline as Stby's
// FleshMass: a bed frame reduced to its own outline, a tripod REDUCED to
// three legs and a dark box, a bucket that is just a bucket.
function HiddenRoomProps() {
  return (
    <group position={[0, 0, -5.4]}>
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
    <group>
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

/* ------------------------------------------------------------------ room */

export default function Barbarian({ film, config, goToStation, doors = [], onDoor }) {
  const { grade } = config
  const [stationIndex, setStationIndex] = useState(-1)
  const stationRef = useRef(-1)
  stationRef.current = stationIndex

  const stepTo = (next) => {
    setStationIndex(next)
    notifyDepth(next)
    goToStation?.(stationFor(next), 'depth-' + next)
  }
  const moveOneStep = () => {
    // forward.z = -cos(yaw): cos(yaw) > 0 means forward.z < 0, i.e. facing
    // further into -Z — deeper down the descent (same convention Memento's
    // own split-grade read of gaze.yaw uses).
    const facingDeeper = Math.cos(gaze.yaw) > 0
    const dir = facingDeeper ? 1 : -1
    const next = clamp(stationRef.current + dir, -1, 2)
    if (next !== stationRef.current) stepTo(next)
  }

  useEffect(() => notifyDepth(-1), [])

  // Mid-visit smash cut, independent of station: one hard second of
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

  const deep = stationIndex >= 0

  return (
    <group>
      <fogExp2 attach="fog" args={[deep ? '#0c0a08' : (grade.fogColor || '#141416'), deep ? 0.09 : 0.03]} />
      <ambientLight intensity={deep ? 0.08 : (grade.ambient ?? 0.16)} color={grade.fill || '#141416'} />
      <pointLight position={[-1.0, 1.9, 0.6]} intensity={(grade.keyIntensity ?? 1) * 10} color={grade.key || '#e8a860'} distance={6} decay={2} />
      <pointLight position={[0.8, 1.3, 1.4]} intensity={6} color="#e8a860" distance={5} decay={2} />

      {stationIndex < 0 && (
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
      <HandheldSway active={stationIndex === 2} />

      <Passage z0={LR_DOOR_Z - 0.3} z1={-4.6} tint="#3a342c" dim={false} />
      <DoorRecesses />
      <HiddenRoomProps />
      <Passage z0={-4.6} z1={-6.6} tint="#2a2620" dim />
      <RopeMarks />
      <Passage z0={-6.6} z1={-9.4} tint="#161410" dim />

      <DoorRow
        doors={doors}
        position={DOOR_MOUNT.position}
        rotationY={DOOR_MOUNT.rotationY}
        spacing={DOOR_MOUNT.spacing}
        scale={DOOR_MOUNT.scale}
        grade={grade}
        onDoor={onDoor}
      />

      {/* click-to-advance boundaries, one per station gap, double-sided so
          whichever way you're facing (moveOneStep reads gaze.yaw) steps you
          one station in that direction — same trick as Memento's own
          CorridorClickPlanes */}
      {[LR_DOOR_Z - 0.9, -4.2, -6.5].map((z, i) => (
        <mesh
          key={i}
          position={[0, 1.3, z]}
          onClick={(e) => { e.stopPropagation(); if (wasDrag()) return; moveOneStep() }}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'auto' }}
        >
          <planeGeometry args={[TUBE_W, TUBE_H]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}
