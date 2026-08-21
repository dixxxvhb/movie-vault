import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { counter as Counter, screenPanel as ScreenPanel } from '../props.jsx'
import { startWind } from '../audio/recipes/ncfom.js'
import {
  makeHighwaySignTexture, makePeanutsLabelTexture, makeCoinFaceTexture, makeCoinBlankTexture,
} from './ncfomTextures.js'
import DoorRow from '../DoorRow.jsx'

// 8.3 — "the gas station counter." One small shop, two stations: the
// customer side (where you approach the counter) and behind it (where the
// clerk would stand). Approaching the coin from the front makes it spin
// once and land, exactly like the film's own beat — but the room genuinely
// will not show you the face from that side, only from behind the counter,
// so the reveal costs you the walk. Wind is the only sound; per this
// session's own audio recipe (audio/recipes/ncfom.js) it ignores the HUD
// mute toggle entirely rather than trying to grey the button out from in
// here, which would require touching App.jsx.
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

// state machine: 'still' -> 'spinning' -> 'landed'. The face chosen on
// landing is picked once and held (a ref, not re-rolled on re-render); which
// texture actually gets drawn on the visible faces is decided separately by
// `revealed` (true only at the behind-the-counter station) so the geometry
// genuinely carries no result at all from the front — this is not a camera
// trick, the mesh itself shows a blank disc there.
function Coin({ station, onSpin }) {
  const [phase, setPhase] = useState('still')
  const faceRef = useRef(Math.random() > 0.5 ? 'star' : 'ring')
  const spinRef = useRef(0)
  const meshRef = useRef()
  const starTex = useMemo(() => makeCoinFaceTexture('star'), [])
  const ringTex = useMemo(() => makeCoinFaceTexture('ring'), [])
  const blankTex = useMemo(() => makeCoinBlankTexture(), [])

  useFrame((_, dt) => {
    if (!meshRef.current) return
    if (phase === 'spinning') {
      spinRef.current += dt
      meshRef.current.rotation.z += dt * 34
      meshRef.current.position.y = 0.965 + Math.sin(Math.min(1, spinRef.current / 1.1) * Math.PI) * 0.05
      if (spinRef.current > 1.1) {
        setPhase('landed')
        meshRef.current.rotation.z = 0
        meshRef.current.position.y = 0.958
      }
    }
  })

  const revealed = station === 'behind' && phase === 'landed'
  const faceTex = revealed ? (faceRef.current === 'star' ? starTex : ringTex) : blankTex

  const handleClick = (e) => {
    e.stopPropagation()
    if (phase !== 'still' || station !== 'front') return
    setPhase('spinning')
    spinRef.current = 0
    onSpin?.()
  }

  return (
    <group
      position={[0.15, 0, -0.35]}
      onClick={handleClick}
      onPointerOver={(e) => { e.stopPropagation(); if (phase === 'still' && station === 'front') document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = 'auto' }}
    >
      <mesh ref={meshRef} position={[0, 0.958, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.008, 24]} />
        <meshStandardMaterial color="#c8a850" roughness={0.35} metalness={0.6} />
      </mesh>
      {/* a wider invisible catcher — the coin itself reads small and true
          to scale, but a hit target that tiny at counter distance is nearly
          unclickable; this widens the click area without widening the coin */}
      <mesh position={[0, 0.96, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.18, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* the readable face, a hair above the coin's own top so it never
          z-fights with the cylinder cap */}
      {phase === 'landed' && (
        <mesh position={[0, 0.963, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.052, 24]} />
          <meshBasicMaterial map={faceTex} toneMapped={false} />
        </mesh>
      )}
    </group>
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

/* ------------------------------------------------------------------ room */

export default function Ncfom({ film, config, goToStation, doors = [], onDoor }) {
  const { grade } = config

  const [station, setStation] = useState('front')

  // Wind, and only wind — mounted directly (not via useRoomAudio), because
  // this recipe deliberately ignores the shared engine's mute gate. See
  // audio/recipes/ncfom.js for the full reasoning.
  useEffect(() => {
    const stop = startWind()
    return stop
  }, [])

  const goBehind = () => { setStation('behind'); goToStation?.(BEHIND_STATION, 'behind') }
  const goFront = () => { setStation('front'); goToStation?.(FRONT_STATION, 'front') }

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
      <Coin station={station} />

      {/* the walk-around: a slim invisible strip past the counter's own
          end, so approaching from either side is a real step, not a menu
          toggle sitting on top of the coin */}
      <mesh
        position={[1.5, 1.2, COUNTER_Z]}
        onClick={(e) => { e.stopPropagation(); station === 'front' ? goBehind() : goFront() }}
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
