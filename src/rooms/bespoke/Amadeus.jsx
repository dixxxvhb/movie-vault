import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { bed as Bed, table as Table } from '../props.jsx'
import { useRoomAudio } from '../audio/engine.js'
import { start as startAmadeusAudio } from '../audio/recipes/amadeus.js'
import {
  makeInkTexture, makePageBaseTexture, makeInkScoreTexture, makeMarginTakeTexture,
} from './amadeusTextures.js'
import DoorRow from '../DoorRow.jsx'

// 9.3 — "the deathbed dictation." Candlelit bedchamber: bed, heavy drape
// planes, a chair pulled close, warm candle grade against one cold blue
// window. Generative ink writes our own invented notation across a page,
// then spreads onto the walls faster than any hand could, growing like
// frost. At long intervals a ripple crosses the room's own wall surfaces —
// the laugh as physics, never as sound. One desk in the corner the
// candlelight never reaches. Score as an ink flourish; hot take in a page
// margin.
const ROOM_W = 4.2
const ROOM_D = 4.6
const ROOM_H = 2.6

/* -------------------------------------------------------------------- ink */

// Growth state lives on refs, not React state — every tick would otherwise
// re-render the whole room. `stage` textures are regenerated periodically
// (never every frame; a canvas redraw is not free) using a FIXED seed per
// surface, so more marks are always a superset of fewer marks — growth, not
// random re-scatter, same trick the caption typewriter elsewhere uses.
const PAGE_SEED = 71
const WALL_SEEDS = [812, 933]
const PAGE_MAX = 46
const WALL_MAX = 34
const GROW_SECONDS = 55        // how long until the page + both walls are full
const WALL_START_FRAC = 0.35   // walls don't start until the page is this full

function InkSurfaces() {
  const pageBase = useMemo(() => makePageBaseTexture(), [])
  const pageMeshRef = useRef()
  const wallMeshRefs = [useRef(), useRef()]
  const lastCountsRef = useRef([-1, -1, -1])
  const tRef = useRef(0)

  useFrame((_, dt) => {
    tRef.current += dt
    const growth = Math.min(1, tRef.current / GROW_SECONDS)

    const pageCount = Math.floor(growth * PAGE_MAX)
    if (pageCount !== lastCountsRef.current[0] && pageMeshRef.current) {
      lastCountsRef.current[0] = pageCount
      const tex = makeInkTexture(PAGE_SEED, pageCount, 480, 620, '#241a10', 0.35)
      const mat = pageMeshRef.current.material
      if (mat.map) mat.map.dispose()
      mat.map = tex
      mat.needsUpdate = true
    }

    const wallGrowth = Math.max(0, (growth - WALL_START_FRAC) / (1 - WALL_START_FRAC))
    wallMeshRefs.forEach((ref, i) => {
      const count = Math.floor(wallGrowth * WALL_MAX)
      if (count !== lastCountsRef.current[i + 1] && ref.current) {
        lastCountsRef.current[i + 1] = count
        const tex = makeInkTexture(WALL_SEEDS[i], count, 512, 640, '#e8dcc0', 0.22)
        const mat = ref.current.material
        if (mat.map) mat.map.dispose()
        mat.map = tex
        mat.needsUpdate = true
      }
    })
  })

  return (
    <group>
      {/* the page, propped on the desk-side table */}
      <mesh ref={pageMeshRef} position={[0.75, 0.615, -1.3]} rotation={[-Math.PI / 2, 0, -0.08]}>
        <planeGeometry args={[0.42, 0.55]} />
        <meshBasicMaterial map={pageBase} toneMapped={false} />
      </mesh>
      {/* two walls the ink spreads onto once the page is filling in */}
      <mesh ref={wallMeshRefs[0]} position={[-ROOM_W / 2 + 0.01, 1.5, -0.4]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D * 0.7, 2]} />
        <meshBasicMaterial transparent opacity={0} toneMapped={false} />
      </mesh>
      <mesh ref={wallMeshRefs[1]} position={[0.4, 1.5, -ROOM_D / 2 + 0.01]}>
        <planeGeometry args={[ROOM_W * 0.7, 2]} />
        <meshBasicMaterial transparent opacity={0} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ---------------------------------------------------------------- ripple */

// The laugh, rendered as physics: a traveling bulge crossing a wall's own
// surface at long intervals, built by displacing a subdivided plane's
// vertices along its local Z rather than any shader — cheap at this vertex
// count, and it never touches audio (kit.js owns the room's actual sound).
function RippleWall({ pos, rot, w, h, color }) {
  const geo = useMemo(() => new THREE.PlaneGeometry(w, h, 28, 1), [w, h])
  const baseZ = useMemo(() => {
    const arr = geo.attributes.position.array
    const out = new Float32Array(arr.length / 3)
    for (let i = 0; i < out.length; i++) out[i] = arr[i * 3 + 2]
    return out
  }, [geo])
  const stateRef = useRef({ active: false, start: 0 })
  const nextAtRef = useRef(8 + Math.random() * 6)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!stateRef.current.active && t > nextAtRef.current) {
      stateRef.current = { active: true, start: t }
    }
    const pos3 = geo.attributes.position
    if (stateRef.current.active) {
      const elapsed = t - stateRef.current.start
      const dur = 1.4
      const front = elapsed / dur
      for (let i = 0; i < pos3.count; i++) {
        const x = pos3.getX(i)
        const u = x / w + 0.5
        const d = u - front
        const bump = Math.exp(-d * d * 50) * 0.07
        pos3.setZ(i, baseZ[i] + bump)
      }
      pos3.needsUpdate = true
      if (elapsed > dur + 0.2) {
        stateRef.current = { active: false, start: 0 }
        nextAtRef.current = t + 24 + Math.random() * 10
        for (let i = 0; i < pos3.count; i++) pos3.setZ(i, baseZ[i])
        pos3.needsUpdate = true
      }
    }
  })

  return (
    <mesh geometry={geo} position={pos} rotation={rot}>
      <meshStandardMaterial color={color} roughness={0.95} side={THREE.DoubleSide} />
    </mesh>
  )
}

/* --------------------------------------------------------------- chamber */

function Chamber({ grade }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#241a10" roughness={0.9} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#1c140c" roughness={0.95} />
      </mesh>
      {/* the ripple-capable walls: left side + far wall */}
      <RippleWall pos={[-ROOM_W / 2, 1.5, -0.4]} rot={[0, Math.PI / 2, 0]} w={ROOM_D * 0.7} h={2} color="#3a2a1a" />
      <RippleWall pos={[0.4, 1.5, -ROOM_D / 2]} rot={[0, 0, 0]} w={ROOM_W * 0.7} h={2} color="#34261a" />
      {/* right wall, plain */}
      <mesh position={[ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial color="#2c2014" roughness={0.92} />
      </mesh>
      {/* the cold window, far wall, blue counter-light source */}
      <mesh position={[1.55, 1.7, -ROOM_D / 2 + 0.015]}>
        <planeGeometry args={[0.7, 0.9]} />
        <meshStandardMaterial color="#3a5a72" emissive="#3a6a88" emissiveIntensity={0.35} roughness={0.3} />
      </mesh>
      {/* +Z wall behind entry camera */}
      <mesh position={[0, ROOM_H / 2, ROOM_D / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial color="#241a10" roughness={0.94} />
      </mesh>
    </group>
  )
}

function DrapePanels() {
  return (
    <group>
      {[-1.3, -0.6].map((x, i) => (
        <mesh key={i} position={[x, 1.5, -ROOM_D / 2 + 0.06]} rotation={[0, 0, 0]}>
          <planeGeometry args={[0.42, 2.1]} />
          <meshStandardMaterial color="#4a1c1c" roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

// A chair pulled in close to the bed — the visitor's own seat.
function PulledChair() {
  return (
    <group position={[0.15, 0, 0.55]} rotation={[0, -0.3, 0]}>
      <mesh position={[0, 0.46, 0]}>
        <boxGeometry args={[0.42, 0.06, 0.42]} />
        <meshStandardMaterial color="#2c2014" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.76, -0.19]}>
        <boxGeometry args={[0.42, 0.6, 0.06]} />
        <meshStandardMaterial color="#2c2014" roughness={0.85} />
      </mesh>
      {[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.23, z]}>
          <boxGeometry args={[0.04, 0.46, 0.04]} />
          <meshStandardMaterial color="#1c140c" roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

// The lit-exclusion desk: a corner desk the candlelight never reaches — no
// light source is placed anywhere near it, and it sits far enough from both
// candle practicals (distance-decayed point lights) that it stays genuinely
// dim rather than merely dark-colored.
function ShadowDesk() {
  return (
    <group position={[-1.55, 0, 1.75]} rotation={[0, 0.5, 0]}>
      <Table pos={[0, 0, 0]} w={0.7} d={0.45} h={0.62} color="#1a140c" />
    </group>
  )
}

function CandleFlame({ pos }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.intensity = (0.85 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23.7) * 0.05) * 9
  })
  return (
    <group position={pos}>
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#ffcf8a" emissive="#ffcf8a" emissiveIntensity={1.8} />
      </mesh>
      <pointLight ref={ref} color="#ffb060" intensity={8} distance={3.2} decay={2} />
    </group>
  )
}

/* ------------------------------------------------------------ score/take */

function InkScorePlaque({ score }) {
  const tex = useMemo(() => makeInkScoreTexture(score), [score])
  return (
    <mesh position={[0.75, 1.55, -ROOM_D / 2 + 0.02]}>
      <planeGeometry args={[0.5, 0.5]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

function MarginTake({ film }) {
  const tex = useMemo(() => makeMarginTakeTexture(film.hot_take), [film.slug, film.hot_take])
  // propped against the page, angled into its own "margin" rather than
  // centered — small, per the brief.
  return (
    <mesh position={[1.1, 0.66, -1.15]} rotation={[-Math.PI / 2, 0, -0.08]}>
      <planeGeometry args={[0.3, 0.55]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ doors */

// Bloodline doors (brief §6): the wall beside the window, clear of the
// drapes, the desk, and the entry sightline toward the bed.
const DOOR_MOUNT = { position: [ROOM_W / 2 - 0.05, 0.8, 0.6], rotationY: -Math.PI / 2, spacing: 0.9, scale: 0.72 }

/* ------------------------------------------------------------------ room */

export default function Amadeus({ film, config, doors = [], onDoor }) {
  const { grade } = config

  useRoomAudio(startAmadeusAudio)

  return (
    <group>
      <fogExp2 attach="fog" args={[grade.bg || '#180f08', 0.05]} />
      <ambientLight intensity={grade.ambient ?? 0.08} />
      <pointLight position={[1.55, 2, -ROOM_D / 2 + 0.3]} intensity={4} color="#3a6a88" distance={3} decay={2} />

      <Chamber grade={grade} />
      <DrapePanels />
      <Bed pos={[-0.6, 0, 0.3]} rot={[0, 0.12, 0]} color="#6a5a48" frame="#2c2014" />
      <PulledChair />
      <Table pos={[0.75, 0, -1.3]} rot={[0, -0.08, 0]} w={0.55} d={0.42} h={0.6} color="#2c2014" />
      <ShadowDesk />
      <CandleFlame pos={[0.75, 0.62, -1.05]} />
      <CandleFlame pos={[-0.75, 0.72, 0.15]} />

      <InkSurfaces />
      <InkScorePlaque score={film.score} />
      <MarginTake film={film} />

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
