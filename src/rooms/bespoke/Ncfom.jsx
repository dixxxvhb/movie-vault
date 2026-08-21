import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { counter as Counter, screenPanel as ScreenPanel } from '../props.jsx'
import { startWind } from '../audio/recipes/ncfom.js'
import {
  makeHighwaySignTexture, makePeanutsLabelTexture, makeCoinFaceTexture, makeCoinBlankTexture,
} from './ncfomTextures.js'
import DoorRow from '../DoorRow.jsx'
import { wasDrag } from '../../pointer.js'
import { registerColliders, setBounds, clearOwner } from '../colliders.js'
import Touchable from '../Touchable.jsx'
import { playOneShot } from '../audio/engine.js'

// 8.3 — "the gas station counter." One small shop, two stations: the
// customer side (where you approach the counter) and behind it (where the
// clerk would stand). Approaching the coin from the front makes it spin
// once and land, exactly like the film's own beat — but the room genuinely
// will not show you the face from that side, only from behind the counter,
// so the reveal costs you the walk. Wind is the only sound; per this
// session's own audio recipe (audio/recipes/ncfom.js) it ignores the HUD
// mute toggle entirely rather than trying to grey the button out from in
// here, which would require touching App.jsx.
//
// Wave M3: free walk. The counter and the shelves block straight-through
// movement; the only open path around the counter is past its RIGHT
// (+X) end — the shelves seal off the left corridor the whole way down.
// goBehind/goFront (the old walk-around click strip) stay clickable
// flights, but the coin's reveal no longer depends on which station you
// last clicked: it's gated on where the walker actually is right now
// (`behind`, read from camera.position each frame), so genuinely walking
// around costs and pays off exactly like clicking did.
const ROOM_W = 3.8
const ROOM_D = 4.6
const ROOM_H = 2.4
const DOOR_Z = ROOM_D / 2
const DOOR_W = 1.5
const DOOR_H = 2.05
const COUNTER_Z = -0.4

// FRONT matches configs.js's own ncfom.camera (the entry viewpoint FilmWorld
// already lands on) so goFront() returns to exactly where the room opened,
// not a second, slightly different "front".
const FRONT_STATION = { pos: [0, 1.5, 1.8], look: [0, 1.3, -1.4], fov: 44 }
const BEHIND_STATION = { pos: [0, 1.45, -1.55], look: [0, 1.25, 2.6], fov: 46 }

/* ------------------------------------------------------------------ shell */

function wallTexture(tint, seed) {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, S, S)
  let s = seed >>> 0
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  ctx.globalAlpha = 0.08
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = r() > 0.5 ? '#000' : '#fff'
    ctx.fillRect(r() * S, r() * S, 1.4, 1.4)
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2, 2)
  return tex
}

function ShopShell() {
  const wallTex = useMemo(() => wallTexture('#8a7a5a', 401), [])
  const floorTex = useMemo(() => wallTexture('#5a4c34', 402), [])
  const sideW = (ROOM_W - DOOR_W) / 2
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial map={floorTex} roughness={0.92} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial map={wallTex} roughness={0.95} />
      </mesh>
      {/* -Z wall, behind the counter station */}
      <mesh position={[0, ROOM_H / 2, -ROOM_D / 2]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial map={wallTex} roughness={0.9} />
      </mesh>
      {/* +Z wall, split around the door */}
      <mesh position={[-(sideW / 2 + DOOR_W / 2), ROOM_H / 2, DOOR_Z]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[sideW, ROOM_H]} />
        <meshStandardMaterial map={wallTex} roughness={0.9} />
      </mesh>
      <mesh position={[sideW / 2 + DOOR_W / 2, ROOM_H / 2, DOOR_Z]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[sideW, ROOM_H]} />
        <meshStandardMaterial map={wallTex} roughness={0.9} />
      </mesh>
      <mesh position={[0, (DOOR_H + ROOM_H) / 2, DOOR_Z]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[DOOR_W, ROOM_H - DOOR_H]} />
        <meshStandardMaterial map={wallTex} roughness={0.9} />
      </mesh>
      <mesh position={[-ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial map={wallTex} roughness={0.88} />
      </mesh>
      <mesh position={[ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial map={wallTex} roughness={0.88} />
      </mesh>
    </group>
  )
}

// Sparse dusty goods — a few cans/boxes on two low shelves, never a full
// stocked wall (the brief's own word is "sparse").
function Shelves({ x }) {
  const items = useMemo(() => Array.from({ length: 5 }, (_, i) => ({
    z: -1.4 + i * 0.55,
    h: 0.16 + (i % 3) * 0.04,
    tone: i % 2 === 0 ? '#8a7048' : '#6a5a3a',
  })), [])
  return (
    <group position={[x, 0, 0]}>
      {[0.9, 1.6].map((y, si) => (
        <mesh key={si} position={[0, y, -0.6]}>
          <boxGeometry args={[0.35, 0.04, 2.4]} />
          <meshStandardMaterial color="#4a3c26" roughness={0.85} />
        </mesh>
      ))}
      {items.map((it, i) => (
        <mesh key={i} position={[0, 0.9 + it.h / 2 + 0.02, it.z]}>
          <boxGeometry args={[0.22, it.h, 0.16]} />
          <meshStandardMaterial color={it.tone} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

function Register() {
  return (
    <group position={[0.55, 0.955, -0.5]}>
      <mesh position={[0, 0.09, 0]}>
        <boxGeometry args={[0.32, 0.18, 0.26]} />
        <meshStandardMaterial color="#2c2a24" roughness={0.4} metalness={0.4} />
      </mesh>
      <ScreenPanel pos={[0, 0.2, 0.05]} rot={[-0.3, 0, 0]} w={0.24} h={0.1} color="#dfe4c0" intensity={0.5} />
    </group>
  )
}

function PeanutsBag() {
  const tex = useMemo(() => makePeanutsLabelTexture(), [])
  return (
    <group position={[-0.55, 0.955, -0.42]} rotation={[0, 0.3, 0]}>
      <mesh position={[0, 0.09, 0]}>
        <boxGeometry args={[0.14, 0.18, 0.06]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
    </group>
  )
}

/* -------------------------------------------------------------- the coin */

// state machine: 'still' -> 'lifting' -> 'held' -> 'lowering' -> 'spinning'
// -> 'landed'. The face chosen on landing is picked once and held (a ref,
// not re-rolled on re-render); which texture actually gets drawn on the
// visible faces is decided separately by `revealed` (true only once the
// walker is actually past the counter, Wave M3: derived from live position,
// not a click-only station flag) so the geometry genuinely carries no result
// at all from the front — this is not a camera trick, the mesh itself shows
// a blank disc there.
//
// Wave T: pick the coin up. First click (front only, matching the old
// front-only spin gate) arcs it to a held pose parented to the camera —
// done imperatively every frame from camera.matrixWorld rather than a real
// scene-graph reparent, which would fight R3F's own reconciler. Second click
// (from anywhere — you're allowed to walk it behind the counter while
// holding it) arcs it back down to its counter spot and hands off to the
// EXACT existing spin/land animation below, untouched.
// QA fix: the group's rest position used to be y=0 with the coin's own
// mesh carrying a +0.958 local offset up to counter height — fine while the
// group itself never moved, but the arc/held phases drive the GROUP's own
// world position directly, and that +0.958 kept stacking on top of it,
// launching the coin nearly half a meter above the camera (well outside the
// frustum: QA screenshot showed nothing there at all). REST_POS now carries
// the counter height itself; meshRef's own local y is a small delta around
// 0 (the spin bounce), never a second copy of the base height.
const REST_POS = new THREE.Vector3(0.15, 0.958, -0.35)
const SPIN_BOUNCE_Y = 0.007 // 0.965 - 0.958, the old absolute bounce peak
// low-center in view: at ~0.45m forward a 44deg-FOV frustum's own half-height
// is ~0.18m at that distance, so this stays inside the bottom of the frame.
// QA: the coin's own 0.055 radius read as a screen-filling disc at the first
// pass (0.55 scale, 0.3m out) — pulled back and shrunk so "small" is true.
const HELD_LOCAL = new THREE.Vector3(0.07, -0.12, -0.45)
const HELD_SCALE = 0.22
const ARC_MS = 300
const ARC_BUMP = 0.16
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function Coin({ behind }) {
  const [phase, setPhase] = useState('still')
  const faceRef = useRef(Math.random() > 0.5 ? 'star' : 'ring')
  const spinRef = useRef(0)
  const meshRef = useRef()
  const groupRef = useRef()
  const arcT = useRef(0)
  const arcFrom = useRef(new THREE.Vector3())
  const arcTo = useRef(new THREE.Vector3())
  const arcFromQuat = useRef(new THREE.Quaternion())
  const tmpVec = useRef(new THREE.Vector3())
  const { camera } = useThree()
  const starTex = useMemo(() => makeCoinFaceTexture('star'), [])
  const ringTex = useMemo(() => makeCoinFaceTexture('ring'), [])
  const blankTex = useMemo(() => makeCoinBlankTexture(), [])

  useFrame((_, dt) => {
    const g = groupRef.current
    if (!g) return

    if (phase === 'held') {
      tmpVec.current.copy(HELD_LOCAL).applyMatrix4(camera.matrixWorld)
      g.position.copy(tmpVec.current)
      g.quaternion.copy(camera.quaternion)
      g.scale.setScalar(HELD_SCALE)
      return
    }

    if (phase === 'lifting' || phase === 'lowering') {
      arcT.current = Math.min(1, arcT.current + (dt * 1000) / ARC_MS)
      const e = easeInOutCubic(arcT.current)
      g.position.lerpVectors(arcFrom.current, arcTo.current, e)
      g.position.y += Math.sin(e * Math.PI) * ARC_BUMP
      const scaleFrom = phase === 'lifting' ? 1 : HELD_SCALE
      const scaleTo = phase === 'lifting' ? HELD_SCALE : 1
      g.scale.setScalar(THREE.MathUtils.lerp(scaleFrom, scaleTo, e))
      if (phase === 'lifting') {
        g.quaternion.slerpQuaternions(new THREE.Quaternion(), camera.quaternion, e)
      } else {
        g.quaternion.slerpQuaternions(arcFromQuat.current, new THREE.Quaternion(), e)
      }
      if (arcT.current >= 1) {
        if (phase === 'lifting') {
          setPhase('held')
        } else {
          g.position.copy(REST_POS)
          g.quaternion.identity()
          g.scale.setScalar(1)
          spinRef.current = 0
          setPhase('spinning')
        }
      }
      return
    }

    // still / spinning / landed: rest pose (group), the existing spin/land
    // animation (meshRef's own local y+rotation) is byte-identical to before.
    g.position.copy(REST_POS)
    g.quaternion.identity()
    g.scale.setScalar(1)
    if (phase === 'spinning' && meshRef.current) {
      spinRef.current += dt
      meshRef.current.rotation.z += dt * 34
      meshRef.current.position.y = SPIN_BOUNCE_Y + Math.sin(Math.min(1, spinRef.current / 1.1) * Math.PI) * 0.05
      if (spinRef.current > 1.1) {
        setPhase('landed')
        meshRef.current.rotation.z = 0
        meshRef.current.position.y = 0
        playOneShot('coin')
      }
    }
  })

  const handleUse = () => {
    if (phase === 'still') {
      if (behind) return // front-only pickup, same law the old spin gate used
      arcFrom.current.copy(REST_POS)
      tmpVec.current.copy(HELD_LOCAL).applyMatrix4(camera.matrixWorld)
      arcTo.current.copy(tmpVec.current)
      arcT.current = 0
      playOneShot('coinSpin')
      setPhase('lifting')
    } else if (phase === 'held') {
      arcFrom.current.copy(groupRef.current.position)
      arcFromQuat.current.copy(camera.quaternion)
      arcTo.current.copy(REST_POS)
      arcT.current = 0
      setPhase('lowering')
    }
    // 'lifting' / 'lowering' / 'spinning' / 'landed': mid-animation, ignore
  }

  const revealed = behind && phase === 'landed'
  const faceTex = revealed ? (faceRef.current === 'star' ? starTex : ringTex) : blankTex

  return (
    <Touchable
      onUse={handleUse}
      reach={phase === 'held' ? 9999 : 2.2}
      anchor={[0.15, 0.958, -0.35]}
      noDip
    >
      <group ref={groupRef} position={REST_POS.toArray()}>
        <mesh ref={meshRef} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.008, 24]} />
          <meshStandardMaterial color="#c8a850" roughness={0.35} metalness={0.6} />
        </mesh>
        {/* a wider invisible catcher — the coin itself reads small and true
            to scale, but a hit target that tiny at counter distance is nearly
            unclickable; this widens the click area without widening the coin */}
        <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.18, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        {/* the readable face, a hair above the coin's own top so it never
            z-fights with the cylinder cap. DoubleSide (Wave T): `revealed`
            above already carries the whole law (blank unless behind AND
            landed) — the plane doesn't also need a viewer on one particular
            side of it for that law to hold, so this costs nothing and only
            ever adds a viewing angle rather than removing one. */}
        {phase === 'landed' && (
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.052, 24]} />
            <meshBasicMaterial map={faceTex} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    </Touchable>
  )
}

/* -------------------------------------------------------------- exterior */

function DoorGlow() {
  return (
    <group position={[0, ROOM_H / 2 - 0.1, DOOR_Z - 0.02]}>
      <mesh>
        <planeGeometry args={[DOOR_W - 0.1, DOOR_H - 0.1]} />
        <meshBasicMaterial color="#fff3cc" toneMapped={false} transparent opacity={0.32} />
      </mesh>
    </group>
  )
}

function HighwaySign({ film }) {
  const tex = useMemo(() => makeHighwaySignTexture(film), [film.slug, film.hot_take, film.score])
  return (
    <group position={[0.2, 1.6, DOOR_Z + 2.4]} rotation={[0, Math.PI, 0]}>
      <mesh>
        <planeGeometry args={[2.9, 1.9]} />
        <meshBasicMaterial map={tex} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* the post */}
      <mesh position={[0, -1.4, 0]}>
        <boxGeometry args={[0.1, 1.4, 0.1]} />
        <meshStandardMaterial color="#4a4438" roughness={0.8} metalness={0.2} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ doors */

// Bloodline doors (brief §6): the side wall past the shelves — clear of the
// counter, the coin, and the door/sign sightline both stations rely on.
const DOOR_MOUNT = { position: [ROOM_W / 2 - 0.05, 0, 0.6], rotationY: -Math.PI / 2, spacing: 0.9, scale: 0.72 }

/* -------------------------------------------------------------- colliders */

const OWNER_ID = 'bespoke:ncfom'
const WALL_T = 0.15
// the threshold the walker has to cross (moving north, -Z) to count as
// "behind the counter" — the counter's own back face, per COUNTER_Z/d=0.6
const BEHIND_Z = COUNTER_Z - 0.3

function ncfomRects() {
  const hw = ROOM_W / 2, hd = ROOM_D / 2
  const doorHalf = DOOR_W / 2
  return [
    // -Z wall (behind station side), solid
    { minX: -hw, maxX: hw, minZ: -hd - WALL_T, maxZ: -hd },
    // +Z wall (entry), split around the door
    { minX: -hw, maxX: -doorHalf, minZ: hd, maxZ: hd + WALL_T },
    { minX: doorHalf, maxX: hw, minZ: hd, maxZ: hd + WALL_T },
    // side walls
    { minX: -hw - WALL_T, maxX: -hw, minZ: -hd, maxZ: hd },
    { minX: hw, maxX: hw + WALL_T, minZ: -hd, maxZ: hd },
    // the counter itself — blocks straight through
    { minX: -1.1, maxX: 1.1, minZ: -0.7, maxZ: -0.1, top: 0.95 },
    // the shelves along the left wall — seal off that corridor entirely
    { minX: -1.875, maxX: -1.525, minZ: -1.8, maxZ: 0.6 },
  ]
}

const BOUNDS = { kind: 'rect', minX: -ROOM_W / 2 + 0.1, maxX: ROOM_W / 2 - 0.1, minZ: -ROOM_D / 2 + 0.1, maxZ: ROOM_D / 2 - 0.1 }

export default function Ncfom({ film, config, goToStation, doors = [], onDoor }) {
  const { grade } = config

  const [behind, setBehind] = useState(false)

  // Wind, and only wind — mounted directly (not via useRoomAudio), because
  // this recipe deliberately ignores the shared engine's mute gate. See
  // audio/recipes/ncfom.js for the full reasoning.
  useEffect(() => {
    const stop = startWind()
    return stop
  }, [])

  useEffect(() => {
    registerColliders(OWNER_ID, ncfomRects())
    setBounds(OWNER_ID, BOUNDS)
    return () => clearOwner(OWNER_ID)
  }, [])

  // position-gated, Wave M3: the coin's reveal (and the walk-around click's
  // own choice of direction) follows where the walker actually is, not
  // which flight was clicked last.
  useFrame(({ camera }) => {
    const now = camera.position.z < BEHIND_Z
    if (now !== behind) setBehind(now)
  })

  const goBehind = () => goToStation?.(BEHIND_STATION, 'behind')
  const goFront = () => goToStation?.(FRONT_STATION, 'front')

  return (
    <group>
      <fogExp2 attach="fog" args={[grade.fogColor || '#8a7a5a', 0.03]} />
      <pointLight position={[0.2, 2.2, DOOR_Z - 0.4]} intensity={(grade.keyIntensity ?? 1) * 8} color={grade.key || '#fff0c0'} distance={9} decay={2.2} />
      <pointLight position={[0, 1.4, -1]} intensity={6} color={grade.fill || '#8a7a5a'} distance={6} decay={2} />
      <ambientLight intensity={grade.ambient ?? 0.32} />

      <ShopShell />
      <DoorGlow />
      <HighwaySign film={film} />

      <Shelves x={-ROOM_W / 2 + 0.2} />
      <Counter pos={[0, 0, COUNTER_Z]} rot={[0, 0, 0]} w={2.2} d={0.6} h={0.95} color="#8a7a5a" />
      <Register />
      <PeanutsBag />
      <Coin behind={behind} />

      {/* the walk-around: a slim invisible strip past the counter's own
          end (the ONLY open path — the shelves seal the other side), for
          anyone who wants the flight instead of the walk */}
      <mesh
        position={[1.5, 1.2, COUNTER_Z]}
        onClick={(e) => { e.stopPropagation(); if (wasDrag()) return; behind ? goFront() : goBehind() }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        <planeGeometry args={[0.5, 2.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

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
