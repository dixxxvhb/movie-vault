import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { barShelf as BarShelf, counter as Counter } from '../props.jsx'
import { useRoomAudio } from '../audio/engine.js'
import { start as startPredestinationAudio } from '../audio/recipes/predestination.js'
import {
  makeLoopWallTexture, makeRingTextTexture, makeFixedScoreTexture, makeCertifiedBadgeTexture,
} from './predestinationTextures.js'
import DoorRow from '../DoorRow.jsx'
import { registerColliders, setBounds, clearOwner, teleportWalker } from '../colliders.js'

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
//
// Wave M3: free walk, RingClickPlanes deleted. The loop was ALREADY real
// before this wave — ringPoint(RING_N) === ringPoint(0), a genuine closed
// hexagon in world space, not six stations linked by a script — so walking
// it forward, all the way around, just works with ordinary wall colliders:
// there is no seam that needs papering over, because there is no seam.
// `inLoop` (which half of the room is dressed) is now read from the
// walker's own position (inside the bar box or not) instead of a station
// index. `teleportWalker` (colliders.js, this wave's one authorized engine
// touch) still gets used here: once per completed lap, in either direction,
// it re-seeds the canonical walker position from exactly where the camera
// already is — a deliberate no-op positionally (the wrap reads as
// completely invisible, per brief) that exists purely to zero out whatever
// tiny drift the axis-separated collision solver could accumulate over
// many laps, so the mechanism the spec asks for is real and exercised, not
// just decorative.
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
const BAR_W = 4, BAR_D = 3, BAR_H = 2.5

function ringPoint(i) {
  const theta = (i / RING_N) * Math.PI * 2 + Math.PI
  return {
    x: RING_CX + Math.cos(theta) * RING_R,
    z: RING_CZ + Math.sin(theta) * RING_R,
    theta,
  }
}

/* -------------------------------------------------------------------- bar */

function BarRoom() {
  const W = BAR_W, D = BAR_D, H = BAR_H
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

/* -------------------------------------------------------------- colliders */
const WALL_T = 0.15

function barColliders() {
  return [
    // NOTE: no front (+Z) wall collider. The entry station (z=1.3) sits
    // close enough to it (BAR_D/2=1.5) that a full-span rect there trips
    // colliders.js's own "already penetrating" cross-axis fallback on the
    // very first frame — any wall spanning the room's FULL width, checked
    // while the walker is merely near it on the other axis, reads as
    // "embedded in a wall" rather than "approaching one," and the fallback
    // shoves the walker out to a corner instead of stopping them cleanly
    // (reproduced while building this room, and again in Barbarian's
    // corridor dead end — see that room's own note). The overall bounds
    // rect below is the real stop on this side, same fix as Barbarian's.
    // -X / +X walls
    { minX: -BAR_W / 2 - WALL_T, maxX: -BAR_W / 2, minZ: -BAR_D / 2, maxZ: BAR_D / 2 },
    { minX: BAR_W / 2, maxX: BAR_W / 2 + WALL_T, minZ: -BAR_D / 2, maxZ: BAR_D / 2 },
    // back wall (BarRoom draws it at BAR_DOOR_Z, not -D/2 — mirrored here),
    // split around the loop doorway
    { minX: -BAR_W / 2, maxX: BAR_DOOR_X - BAR_DOOR_W / 2, minZ: BAR_DOOR_Z - WALL_T, maxZ: BAR_DOOR_Z },
    { minX: BAR_DOOR_X + BAR_DOOR_W / 2, maxX: BAR_W / 2, minZ: BAR_DOOR_Z - WALL_T, maxZ: BAR_DOOR_Z },
    // the counter (Counter's own w/d, unrotated — see below)
    { minX: -1.9, maxX: -0.1, minZ: -1.425, maxZ: -0.875 },
    // the two stools
    { minX: -0.75, maxX: -0.35, minZ: -0.55, maxZ: -0.15 },
    { minX: -0.05, maxX: 0.35, minZ: -0.95, maxZ: -0.55 },
  ]
}

// The loop's own hollow middle has no floor drawn in it at all (RingCell
// only renders the trapezoid BETWEEN two waypoints) — a conservative square
// blocker at the ring's center keeps the walker from cutting across it.
// Sized well inside the tube's own inner wall (the hexagon's apothem minus
// the tube's half-width) so it can never eat into legitimate walking room.
const RING_APOTHEM = RING_R * Math.cos(Math.PI / RING_N)
const RING_VOID_HALF = Math.max(0.3, (RING_APOTHEM - TUBE_W / 2) * 0.7)
// The tube's OUTER edge, as a circle — an axis-aligned rect wall can't
// follow a hexagon's six angled segments, so the outer containment is a
// bounds circle instead (swapped in/out below, since the bar box and the
// loop can't share one convex bounds shape). Slightly inset so it never
// reads as a hard pop against the rendered wall.
const RING_OUTER_R = RING_APOTHEM + TUBE_W / 2 - 0.05

function loopVoidCollider() {
  return [{
    minX: RING_CX - RING_VOID_HALF, maxX: RING_CX + RING_VOID_HALF,
    minZ: RING_CZ - RING_VOID_HALF, maxZ: RING_CZ + RING_VOID_HALF,
  }]
}

// The bar bounds' own margin has to stay LOOSER than the inLoop switch
// threshold below (0.4) — otherwise the bounds clamp catches the walker
// approaching the doorway before the region check ever flips to swap in the
// loop's own (much larger) circle, and the two fight to a deadlock right at
// the threshold (reproduced while building this room).
const BAR_BOUNDS = {
  kind: 'rect',
  minX: -BAR_W / 2 - 0.6, maxX: BAR_W / 2 + 0.6,
  minZ: -BAR_D / 2 - 0.6, maxZ: BAR_D / 2 + 0.6,
}
const LOOP_BOUNDS = { kind: 'circle', cx: RING_CX, cz: RING_CZ, r: RING_OUTER_R }

/* ------------------------------------------------------------------ room */

export default function Predestination({ film, config, doors = [], onDoor }) {
  const { grade } = config
  const [inLoop, setInLoop] = useState(false)
  const inLoopRef = useRef(false)

  const loopTex = useMemo(() => makeLoopWallTexture('#2c2016'), [])

  const ownerIdRef = useRef(null)
  useEffect(() => {
    const ownerId = 'room:' + (film?.slug ?? 'predestination')
    ownerIdRef.current = ownerId
    registerColliders(ownerId, [...barColliders(), ...loopVoidCollider()])
    // Start with the bar's own bounds — the bar box and the loop's outer
    // edge are two disjoint convex shapes (a rect and a circle, nowhere near
    // each other), so one owner can't hold both at once the way GenericRoom
    // holds one bounds for its one shell. The walk-position check below
    // swaps which shape is active the instant the walker crosses from one
    // region into the other.
    setBounds(ownerId, BAR_BOUNDS)
    return () => clearOwner(ownerId)
  }, [film?.slug])

  // Wave M3: which half of the room is dressed, read from the walker's own
  // position (inside the bar box or not) instead of a station index — plus
  // the loop-wrap tracking (see the header comment's account of why
  // teleportWalker fires here as a deliberate positional no-op).
  const loopAngleRef = useRef(0)
  const prevAngleRef = useRef(null)
  useFrame(({ camera }) => {
    const x = camera.position.x, z = camera.position.z
    const nowInBar = x > -BAR_W / 2 - 0.4 && x < BAR_W / 2 + 0.4 && z > -BAR_D / 2 - 0.4 && z < BAR_D / 2 + 0.4
    const nowInLoop = !nowInBar
    if (nowInLoop !== inLoopRef.current) {
      inLoopRef.current = nowInLoop
      setInLoop(nowInLoop)
      if (ownerIdRef.current) setBounds(ownerIdRef.current, nowInLoop ? LOOP_BOUNDS : BAR_BOUNDS)
    }

    const dx = x - RING_CX, dz = z - RING_CZ
    const dist = Math.hypot(dx, dz)
    if (dist < 1.5) {
      // too close to the ring center (i.e. still in/near the bar) for the
      // angle to mean anything — reset so we don't count a bogus lap the
      // moment the walker steps back into the loop later.
      prevAngleRef.current = null
      return
    }
    const angle = Math.atan2(dx, dz)
    if (prevAngleRef.current != null) {
      let delta = angle - prevAngleRef.current
      while (delta > Math.PI) delta -= Math.PI * 2
      while (delta < -Math.PI) delta += Math.PI * 2
      loopAngleRef.current += delta
      if (Math.abs(loopAngleRef.current) >= Math.PI * 2) {
        const dir = loopAngleRef.current > 0 ? 1 : -1
        loopAngleRef.current -= dir * Math.PI * 2
        // THE LOOP BECOMES REAL: a full lap closes back on itself. Re-seed
        // the canonical walker position from right where the camera already
        // sits — geometrically a no-op (see header comment) — so the wrap
        // fires and is provably exercised without ever being visible.
        teleportWalker(x, z)
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.info('[predestination] loop wrap dir=%d at x=%.2f z=%.2f', dir, x, z)
        }
      }
    }
    prevAngleRef.current = angle
  })

  useRoomAudio(startPredestinationAudio)

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
