import React, { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { barShelf as BarShelf, counter as Counter } from '../props.jsx'
import { useRoomAudio } from '../audio/engine.js'
import { start as startPredestinationAudio } from '../audio/recipes/predestination.js'
import {
  makeLoopWallTexture, makeRingTextTexture, makeFixedScoreTexture, makeCertifiedBadgeTexture,
} from './predestinationTextures.js'
import DoorRow from '../DoorRow.jsx'
import { wasDrag } from '../../pointer.js'

// 9.1 — "the bar." Low amber light, bottle shelf, two stools mid-
// conversation, 70s-brown grade. Behind the bar a doorway opens onto a
// corridor that LOOPS: this is built as a real physical ring — six stations
// arranged in a hexagon rather than a straight hallway that teleports you
// back — so walking forward through it always feels like walking forward;
// station 5 simply connects to station 0 the same way every other pair of
// neighbors does, no seam to hide. A separate, purely decorative vertical
// ring above the bottles carries the hot take as curved, repeating text
// (RingGeometry's own UV wrap does the curving — see predestinationTextures
// .js) with the 9.1 fixed at its center: the one thing in the room that
// doesn't move or loop. A certified badge sits on a coaster by the stools.
const EYE = 1.55
const RING_N = 6
const RING_R = 2.6
// Center chosen so the FIRST ring point (theta = pi below) lands right at the
// bar door's own x, a couple steps past its z — and, just as important, so
// that point's tangent continues in -Z, the same direction you were already
// walking through the doorway. Getting this alignment right is what makes
// the bar-to-loop step read as one continuous walk forward rather than a
// hard swerve the instant you cross the threshold (QA pass: an earlier
// offset put the first tangent almost 90 degrees sideways, so the first
// click out of the bar spun the camera into a near-corner wall).
const BAR_DOOR_X = 1.0
const BAR_DOOR_Z = -1.55
const BAR_DOOR_W = 1.15
const BAR_DOOR_H = 2.05
const RING_CX = BAR_DOOR_X + RING_R
const RING_CZ = BAR_DOOR_Z - 0.45
const TUBE_W = 2.3
const TUBE_H = 2.3

function ringPoint(i) {
  const theta = (i / RING_N) * Math.PI * 2 + Math.PI
  return {
    x: RING_CX + Math.cos(theta) * RING_R,
    z: RING_CZ + Math.sin(theta) * RING_R,
    theta,
  }
}

function stationFor(i) {
  const p = ringPoint(i)
  const next = ringPoint(i + 1)
  const dx = next.x - p.x
  const dz = next.z - p.z
  const len = Math.hypot(dx, dz) || 1
  return {
    pos: [p.x, EYE, p.z],
    look: [p.x + (dx / len) * 3, EYE - 0.04, p.z + (dz / len) * 3],
    fov: 52,
  }
}

/* -------------------------------------------------------------------- bar */

function BarRoom() {
  const W = 4, D = 3, H = 2.5
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#3a2a1c" roughness={0.9} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#241a10" roughness={0.95} />
      </mesh>
      {/* back wall, split around the doorway */}
      <mesh position={[(BAR_DOOR_X - W / 2 - BAR_DOOR_W / 2) / 2 - 0.6, H / 2, BAR_DOOR_Z]}>
        <planeGeometry args={[W / 2 + BAR_DOOR_X - BAR_DOOR_W / 2 - 0.6, H]} />
        <meshStandardMaterial color="#4a3420" roughness={0.9} />
      </mesh>
      <mesh position={[BAR_DOOR_X + BAR_DOOR_W / 2 + (W / 2 - BAR_DOOR_X - BAR_DOOR_W / 2) / 2, H / 2, BAR_DOOR_Z]}>
        <planeGeometry args={[W / 2 - BAR_DOOR_X - BAR_DOOR_W / 2, H]} />
        <meshStandardMaterial color="#4a3420" roughness={0.9} />
      </mesh>
      <mesh position={[BAR_DOOR_X, (BAR_DOOR_H + H) / 2, BAR_DOOR_Z]}>
        <planeGeometry args={[BAR_DOOR_W, H - BAR_DOOR_H]} />
        <meshStandardMaterial color="#4a3420" roughness={0.9} />
      </mesh>
      {/* side + front walls */}
      <mesh position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#3a2818" roughness={0.9} />
      </mesh>
      <mesh position={[W / 2, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#3a2818" roughness={0.9} />
      </mesh>
      <mesh position={[0, H / 2, D / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#3a2818" roughness={0.9} />
      </mesh>
    </group>
  )
}

function Stools() {
  const stool = (x, z, rotY) => (
    <group key={x + '_' + z} position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.18, 0.16, 0.06, 16]} />
        <meshStandardMaterial color="#4a3020" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 10]} />
        <meshStandardMaterial color="#1c1410" roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  )
  return (
    <group>
      {stool(-0.55, -0.35, 0.5)}
      {stool(0.15, -0.75, -0.8)}
    </group>
  )
}

function CertifiedCoaster() {
  const tex = useMemo(() => makeCertifiedBadgeTexture(), [])
  return (
    <mesh position={[-0.3, 0.951, -0.5]} rotation={[-Math.PI / 2, 0, 0.15]}>
      <circleGeometry args={[0.1, 24]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  )
}

/* ---------------------------------------------------------- ring of text */

function TextRing({ film }) {
  const tex = useMemo(() => makeRingTextTexture(film.hot_take), [film.slug, film.hot_take])
  const scoreTex = useMemo(() => makeFixedScoreTexture(film.score), [film.score])
  const cx = -1.0, cz = -1.4, cy = 1.95
  return (
    <group position={[cx, cy, cz]}>
      <mesh>
        <ringGeometry args={[0.42, 0.58, 64]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* the 9.1: the only fixed point, at the ring's own center */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshBasicMaterial map={scoreTex} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------- the loop */

function RingCell({ from, to, tex }) {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const len = Math.hypot(dx, dz)
  const angle = Math.atan2(dx, dz)
  const mid = { x: (from.x + to.x) / 2, z: (from.z + to.z) / 2 }
  return (
    <group position={[mid.x, 0, mid.z]} rotation={[0, angle, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[TUBE_W, len * 1.05]} />
        <meshStandardMaterial map={tex} roughness={0.92} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, TUBE_H, 0]}>
        <planeGeometry args={[TUBE_W, len * 1.05]} />
        <meshStandardMaterial map={tex} roughness={0.95} />
      </mesh>
      <mesh position={[-TUBE_W / 2, TUBE_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[len * 1.05, TUBE_H]} />
        <meshStandardMaterial map={tex} roughness={0.88} />
      </mesh>
      <mesh position={[TUBE_W / 2, TUBE_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[len * 1.05, TUBE_H]} />
        <meshStandardMaterial map={tex} roughness={0.88} />
      </mesh>
      {/* a thin amber ribbon along the wall, echoing the bar's own ring
          motif into the corridor */}
      <mesh position={[-TUBE_W / 2 + 0.01, 1.6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[len * 1.02, 0.05]} />
        <meshStandardMaterial color="#e8b860" emissive="#e8b860" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

// One click-to-advance plane per station, positioned just ahead of it —
// clicking always steps forward one station, mod the ring length, which is
// the whole trick: there is no "last" station to special-case, the modulo
// IS the loop closing on itself.
function RingClickPlanes({ onAdvance }) {
  return (
    <>
      {Array.from({ length: RING_N }, (_, i) => {
        const p = ringPoint(i)
        const next = ringPoint(i + 1)
        const mid = { x: (p.x + next.x) / 2, z: (p.z + next.z) / 2 }
        const angle = Math.atan2(next.x - p.x, next.z - p.z)
        return (
          <mesh
            key={i}
            position={[mid.x, TUBE_H / 2, mid.z]}
            rotation={[0, angle, 0]}
            onClick={(e) => { e.stopPropagation(); if (wasDrag()) return; onAdvance() }}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
            onPointerOut={() => { document.body.style.cursor = 'auto' }}
          >
            <planeGeometry args={[TUBE_W, TUBE_H]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
      {/* the doorway threshold itself, from the bar side */}
      <mesh
        position={[BAR_DOOR_X, BAR_DOOR_H / 2, BAR_DOOR_Z]}
        onClick={(e) => { e.stopPropagation(); if (wasDrag()) return; onAdvance() }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        <planeGeometry args={[BAR_DOOR_W, BAR_DOOR_H]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

function LoopGlow() {
  const ref = useRef()
  useFrame(({ camera }) => {
    if (!ref.current) return
    ref.current.position.copy(camera.position)
  })
  return <pointLight ref={ref} color="#c9a06a" intensity={70} distance={6} decay={1.8} />
}

/* ------------------------------------------------------------------ doors */

// Bloodline doors (brief §6): the bar's own front wall, clear of the
// counter/shelf/ring and the doorway to the loop.
const DOOR_MOUNT = { position: [-1.2, 0, 1.3], rotationY: Math.PI, spacing: 0.9, scale: 0.72 }

/* ------------------------------------------------------------------ room */

export default function Predestination({ film, config, doors = [], goToStation, onDoor }) {
  const { grade } = config
  const [stationIndex, setStationIndex] = useState(-1) // -1 = the bar
  const stationRef = useRef(-1)
  stationRef.current = stationIndex

  const loopTex = useMemo(() => makeLoopWallTexture('#2c2016'), [])

  const advance = () => {
    const next = stationRef.current < 0 ? 0 : (stationRef.current + 1) % RING_N
    setStationIndex(next)
    goToStation?.(stationFor(next), 'loop-' + next)
  }

  useRoomAudio(startPredestinationAudio)

  const inLoop = stationIndex >= 0

  return (
    <group>
      <fogExp2 attach="fog" args={[grade.bg || '#241a10', inLoop ? 0.05 : 0.02]} />
      <ambientLight intensity={grade.ambient ?? 0.14} />
      <pointLight position={[0.4, 1.9, -0.4]} intensity={(grade.keyIntensity ?? 1) * 6} color={grade.key || '#e8b860'} distance={8} decay={2.2} />
      <pointLight position={[0.2, 1.2, 0.3]} intensity={8} color={grade.fill || '#3a2414'} distance={6} decay={2} />
      <pointLight position={[-1.0, 1.5, -0.9]} intensity={3.5} color="#e8a850" distance={4} decay={2.2} />

      {!inLoop && (
        <>
          <BarRoom />
          <Counter pos={[-1.0, 0, -1.15]} rot={[0, 0, 0]} w={1.8} d={0.55} h={0.95} color="#4a3020" />
          <BarShelf pos={[-1.0, 0.95, -1.42]} rot={[0, 0, 0]} count={12} w={1.6} color="#2a1c10" glint="#e8a850" />
          <Stools />
          <CertifiedCoaster />
          <TextRing film={film} />
        </>
      )}

      {Array.from({ length: RING_N }, (_, i) => {
        const from = ringPoint(i)
        const to = ringPoint(i + 1)
        return <RingCell key={i} from={from} to={to} tex={loopTex} />
      })}
      <RingClickPlanes onAdvance={advance} />
      {inLoop && <LoopGlow />}

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
