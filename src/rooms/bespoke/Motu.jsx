import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { throne as Throne } from '../props.jsx'
import { useRoomAudio, playOneShot } from '../audio/engine.js'
import { start as startMotuAudio } from '../audio/recipes/motu.js'
import { notifyPose } from './motuBus.js'
import { makeProclamationTexture, makePetitionTexture, makeSealTexture } from './motuTextures.js'
import DoorRow from '../DoorRow.jsx'
import { registerColliders, setBounds, registerFloor, clearOwner, resolveStep, walkPos } from '../colliders.js'
import Touchable from '../Touchable.jsx'
import { standardMat } from '../materials.js'
import { Bevel } from '../detail.jsx'
import { FogLayers, HazeCone } from '../atmosphere.jsx'

// P1 finishing pass (IMMERSION-V2-POLISH-SPEC.md): materials.js stone on the
// dais/walls, carved-band trim rings on the columns, bone-white accent ribs
// on the throne back, purple-green ground fog, and a soft glow duplicate
// behind each lightning bolt segment. Camp-grand, having a wonderful time —
// saturated grade, low grain, bloom allowed on the bolts/spot per the brief.
const floorMat = standardMat({ kind: 'concrete', tint: '#1a1424', wear: 0.4, roughness: 0.55, metalness: 0.12, repeat: [3, 3.4] })
const wallStoneMat = standardMat({ kind: 'concrete', tint: '#241a34', wear: 0.35, roughness: 0.85, repeat: [2.6, 1.8] })
const daisMat = standardMat({ kind: 'tile', tint: '#2a1e40', wear: 0.3, roughness: 0.4, metalness: 0.2, repeat: [1.6, 1.2] })
const boneMat = new THREE.MeshStandardMaterial({ color: '#e8dcc0', roughness: 0.4, metalness: 0.05 })

// 8.5 — "the throne, savored." A tall camp-cosmos hall: purple-green
// atmosphere, a spotlight that SNAPS onto the empty throne on a timer (hard
// cut, no fade in either direction, per the brief's own "snaps" verb), and
// lightning that arcs into held POSES rather than strikes — jagged emissive
// polylines that freeze for a beat, then swap, cued 1:1 with the audio
// recipe's own organ stab + thunder (bespoke/motuBus.js). One fixed
// station: this room performs its own menace and wants you to watch it do
// it, not walk around behind the set.
const ROOM_W = 5.4, ROOM_D = 6, ROOM_H = 4.2

const SPOT_PERIOD = 14   // seconds
const SPOT_ON = 5

const POSE_PERIOD = 2.7  // seconds between held lightning poses

// The dais under the throne: [0, 0.08, -2.2], size [2.2, 0.16, 1.6].
const DAIS_HALF_X = 1.1
const DAIS_HALF_Z = 0.8
const DAIS_CX = 0
const DAIS_CZ = -2.2
const DAIS_H = 0.16

/* ------------------------------------------------------------- colliders */
// Wave M3: contract #3 — "throne blocks; dais steps = either blocked or a
// floor ramp onto the dais (your call from the geometry)." At only 0.16m
// (a curb, not a step you'd need to climb), the dais reads as walkable-onto
// rather than an obstacle — registerFloor gives it a step-up floor height
// instead of a blocking rect, so the walker rides up onto it the same way
// M1's Y-damping already eases any floor change. The throne itself (on top
// of it) still blocks outright.
const ROOM_ID = 'bespoke:motu'

function motuFloor(x, z) {
  if (x >= DAIS_CX - DAIS_HALF_X && x <= DAIS_CX + DAIS_HALF_X &&
      z >= DAIS_CZ - DAIS_HALF_Z && z <= DAIS_CZ + DAIS_HALF_Z) {
    return DAIS_H
  }
  return 0
}

const THRONE_RECT = { minX: -0.5, maxX: 0.5, minZ: -2.7, maxZ: -1.7, top: 1.6 }
const COLUMN_RECTS = [[-2.3, -2.4], [2.3, -2.4]].map(([x, z]) => ({
  minX: x - 0.26, maxX: x + 0.26, minZ: z - 0.26, maxZ: z + 0.26, top: ROOM_H - 0.4,
}))
const WALL_T = 0.12
const MOTU_SHELL_RECTS = [
  { minX: -ROOM_W / 2 - WALL_T, maxX: -ROOM_W / 2, minZ: -ROOM_D / 2, maxZ: ROOM_D / 2 },
  { minX: ROOM_W / 2, maxX: ROOM_W / 2 + WALL_T, minZ: -ROOM_D / 2, maxZ: ROOM_D / 2 },
  { minX: -ROOM_W / 2, maxX: ROOM_W / 2, minZ: -ROOM_D / 2 - WALL_T, maxZ: -ROOM_D / 2 },
  { minX: -ROOM_W / 2, maxX: ROOM_W / 2, minZ: ROOM_D / 2, maxZ: ROOM_D / 2 + WALL_T },
]

function MotuColliders({ spawn }) {
  useEffect(() => {
    registerColliders(ROOM_ID, [...MOTU_SHELL_RECTS, THRONE_RECT, ...COLUMN_RECTS])
    registerFloor(ROOM_ID, motuFloor)
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

// A carved-band trim ring: two stacked tori (a wider base + a thinner bone
// lip) suggesting a capital/base carving without a bespoke lathe geometry.
function ColumnBand({ y, radius }) {
  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.035, 8, 20]} />
        <meshStandardMaterial color="#3a2a4a" roughness={0.4} metalness={0.35} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <torusGeometry args={[radius * 0.96, 0.016, 8, 20]} />
        <primitive object={boneMat} attach="material" />
      </mesh>
    </group>
  )
}

function ThroneHall() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <primitive object={floorMat} attach="material" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <primitive object={wallStoneMat} attach="material" />
      </mesh>
      <mesh position={[0, ROOM_H / 2, -ROOM_D / 2]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <primitive object={wallStoneMat} attach="material" />
      </mesh>
      <mesh position={[0, ROOM_H / 2, ROOM_D / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <primitive object={wallStoneMat} attach="material" />
      </mesh>
      <mesh position={[-ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <primitive object={wallStoneMat} attach="material" />
      </mesh>
      <mesh position={[ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <primitive object={wallStoneMat} attach="material" />
      </mesh>
      {/* a raised dais under the throne — beveled stone, not a naked box */}
      <Bevel pos={[0, 0.08, -2.2]} w={2.2} h={0.16} d={1.6} radius={0.03} mat={daisMat} />
      {/* tall fluted columns, theatrical staging either side, each with a
          carved-band base + capital ring in bone-white against the stone */}
      {[-2.3, 2.3].map((x, i) => (
        <group key={i}>
          <mesh position={[x, ROOM_H / 2 - 0.2, -2.4]}>
            <cylinderGeometry args={[0.22, 0.26, ROOM_H - 0.4, 12]} />
            <meshStandardMaterial color="#3a2a4a" emissive="#4a2a6a" emissiveIntensity={0.25} roughness={0.5} metalness={0.3} />
          </mesh>
          <group position={[x, 0, -2.4]}>
            <ColumnBand y={0.5} radius={0.27} />
            <ColumnBand y={ROOM_H - 0.55} radius={0.24} />
          </group>
        </group>
      ))}
    </group>
  )
}

// Bone-white ribs across the throne's own back panel (local [0,1.2,-0.45],
// size [1,1.6,0.14] per props.jsx's throne) — the "beveled bone-motif"
// staging the brief asks for, laid over the shared prop rather than forking
// it, since throne() is used elsewhere at default (non-bone) styling too.
function ThroneBoneRibs({ pos }) {
  return (
    <group position={pos}>
      {[-0.32, 0, 0.32].map((x, i) => (
        <Bevel key={i} pos={[x, 1.2, -0.37]} w={0.09} h={1.5} d={0.03} radius={0.012} mat={boneMat} />
      ))}
      <Bevel pos={[0, 1.92, -0.37]} w={0.86} h={0.09} d={0.04} radius={0.012} mat={boneMat} />
    </group>
  )
}

/* --------------------------------------------------------------- spotlight */

// A hard-cut spotlight: fully off, then fully on, no ramp — SNAPS, per the
// brief's own word. Set directly in useFrame (not React state) so the cut
// is genuinely instantaneous rather than riding a render's worth of lag.
function ThroneSpotlight({ aimUntilRef, aimPosRef }) {
  const spot = useRef()
  const fixture = useRef()
  const pool = useRef()
  const hazeGroup = useRef()
  const target = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => {
    if (spot.current) spot.current.target = target
  }, [target])
  useFrame(({ clock }) => {
    // Wave T: press the petition -> the spotlight SNAPS to the player for
    // 2s (hard cut, same "no ramp" law the timer-driven version already
    // follows), then snaps back to the throne — a plain performance.now()
    // deadline check, so it overrides the normal timer cleanly and never
    // fights it.
    const aiming = performance.now() < aimUntilRef.current
    const t = clock.elapsedTime % SPOT_PERIOD
    const on = aiming || t < SPOT_ON
    if (spot.current) spot.current.intensity = on ? 110 : 0
    if (fixture.current) fixture.current.material.emissiveIntensity = on ? 2.2 : 0.15
    if (pool.current) pool.current.material.opacity = on ? 0.55 : 0
    // the hard-edged HazeCone snaps with the spotlight — no fade, matching
    // the brief's own "snaps" verb for this fixture.
    if (hazeGroup.current) hazeGroup.current.visible = on
    const px = aiming ? aimPosRef.current.x : 0
    const pz = aiming ? aimPosRef.current.z : -2.2
    target.position.set(px, 0.9, pz)
    if (pool.current) pool.current.position.set(px, 0.17, pz)
  })
  return (
    <group>
      <spotLight
        ref={spot}
        position={[0, ROOM_H - 0.3, -0.4]}
        angle={0.32}
        penumbra={0.4}
        distance={ROOM_H + 1}
        color="#f0e0ff"
        intensity={0}
        decay={2}
      />
      <group ref={hazeGroup} visible={false}>
        <HazeCone pos={[0, ROOM_H - 0.5, -0.4]} length={3.4} radius={0.85} color="#e0c8ff" opacity={0.3} />
      </group>
      {/* the fixture itself, a small ceiling disc that flares when the
          spotlight snaps on — reads clearly even in a still frame, unlike
          a rendered light cone (which looked like a solid wedge of geometry
          from this room's own close quarters and got cut for it) */}
      <mesh ref={fixture} position={[0, ROOM_H - 0.15, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.32, 24]} />
        <meshStandardMaterial color="#f0e0ff" emissive="#f0e0ff" emissiveIntensity={0.15} toneMapped={false} />
      </mesh>
      {/* the light pool it snaps onto, flat on the dais (or wherever it's
          currently aimed) */}
      <mesh ref={pool} position={[0, 0.17, -2.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.1, 32]} />
        <meshBasicMaterial color="#f0e0ff" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* --------------------------------------------------------------- lightning */

// Jagged emissive polylines that hold a pose for POSE_PERIOD, then swap —
// never a continuous strike/flicker. New geometry only on a bucket change,
// so it genuinely freezes rather than animating between poses.
function jaggedPoints(seed, originX) {
  let s = seed >>> 0
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  const pts = []
  let x = originX, y = ROOM_H - 0.2
  const z = -3.4 + r() * 0.6
  while (y > 0.4) {
    pts.push(new THREE.Vector3(x, y, z))
    y -= 0.35 + r() * 0.4
    x += (r() - 0.5) * 0.9
  }
  pts.push(new THREE.Vector3(x, 0.4, z))
  return pts
}

// A jagged bolt built from short emissive box segments rather than a
// THREE.Line — WebGL ignores lineWidth on most platforms (a three.js/browser
// limitation, not a room bug), so a real "line" render as a barely-visible
// single pixel; boxes give the bolt actual on-screen thickness.
function BoltSegments({ pts, color }) {
  const segs = useMemo(() => {
    const out = []
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1]
      const mid = a.clone().add(b).multiplyScalar(0.5)
      const len = a.distanceTo(b)
      const dir = b.clone().sub(a)
      out.push({ mid, len, angleZ: Math.atan2(dir.x, dir.y) })
    }
    return out
  }, [pts])
  return (
    <group>
      {segs.map((s, i) => (
        <group key={i} position={s.mid} rotation={[0, 0, s.angleZ]}>
          {/* crisp emissive core */}
          <mesh>
            <boxGeometry args={[0.05, s.len, 0.05]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.6} toneMapped={false} />
          </mesh>
          {/* soft glow: a wider, dimmer, additive duplicate behind the core —
              cheap halo that reads even before the shared bloom pass kicks
              in on a still frame */}
          <mesh>
            <boxGeometry args={[0.16, s.len, 0.16]} />
            <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function LightningPoses({ aimUntilRef, aimPosRef }) {
  const [bolts, setBolts] = useState(() => [jaggedPoints(11, -1.6), jaggedPoints(23, 1.7)])
  const bucketRef = useRef(0)
  const boltGroupRef = useRef()
  useFrame(({ clock }, dt) => {
    const bucket = Math.floor(clock.elapsedTime / POSE_PERIOD)
    if (bucket !== bucketRef.current) {
      bucketRef.current = bucket
      setBolts([jaggedPoints(bucket * 7 + 11, -1.6 + Math.sin(bucket) * 0.4), jaggedPoints(bucket * 13 + 23, 1.7 + Math.cos(bucket) * 0.4)])
      notifyPose()
    }
    // Wave T: while the petition's aim window is open, the whole bolt pair
    // drifts (fast damp, not a hard teleport — a bolt visibly leaping is
    // more legible than one silently appearing in a new place) toward the
    // player's position instead of their usual throne-side spots.
    const aiming = performance.now() < aimUntilRef.current
    // bolts are authored around originX ~0 and z ~-3.4 (jaggedPoints) — the
    // offset that puts them at the player is just the delta from that.
    const targetX = aiming ? aimPosRef.current.x : 0
    const targetZ = aiming ? aimPosRef.current.z + 3.4 : 0
    if (boltGroupRef.current) {
      boltGroupRef.current.position.x = THREE.MathUtils.damp(boltGroupRef.current.position.x, targetX, 14, dt)
      boltGroupRef.current.position.z = THREE.MathUtils.damp(boltGroupRef.current.position.z, targetZ, 14, dt)
    }
  })
  return (
    <group ref={boltGroupRef}>
      <BoltSegments pts={bolts[0]} color="#c9a0ff" />
      <BoltSegments pts={bolts[1]} color="#a0e8b0" />
    </group>
  )
}

/* -------------------------------------------------------------- signage */

function ProclamationScroll({ film }) {
  const tex = useMemo(() => makeProclamationTexture(film), [film.slug, film.hot_take])
  // P1 review: pulled in from the column edge and sized down slightly so the
  // arrival composition reads the whole scroll instead of cropping it
  // against the right column at the spawn framing.
  return (
    <group position={[1.85, 2.05, -1.75]} rotation={[0, -0.42, 0]} scale={0.86}>
      <mesh>
        <planeGeometry args={[1.5, 1.0]} />
        <meshBasicMaterial map={tex} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* rolled ends */}
      {[-0.76, 0.76].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 1.02, 12]} />
          <meshStandardMaterial color="#5a3a10" roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

function PetitionOnArmrest({ onPress }) {
  const tex = useMemo(() => makePetitionTexture(), [])
  return (
    <Touchable reach={5} anchor={[0.62, 0.72, -1.85]} onUse={onPress}>
      <mesh position={[0.62, 0.72, -1.85]} rotation={[-Math.PI / 2, 0, -0.15]}>
        <planeGeometry args={[0.42, 0.52]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </Touchable>
  )
}

function RoyalSeal({ score }) {
  const tex = useMemo(() => makeSealTexture(score), [score])
  return (
    <mesh position={[0, 0.17, -2.0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.22, 32]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ doors */

const DOOR_MOUNT = { position: [0, 0, ROOM_D / 2 - 0.05], rotationY: Math.PI, spacing: 0.95, scale: 0.75 }

/* ------------------------------------------------------------------ room */

export default function Motu({ film, config, doors = [], onDoor }) {
  const { grade } = config
  // Wave T: press the petition -> spotlight snaps to the player + lightning
  // aims at them for 2s, then both snap back. A plain deadline (no React
  // state) so ThroneSpotlight/LightningPoses can read it every frame
  // without a re-render on every press.
  const aimUntilRef = useRef(0)
  const aimPosRef = useRef({ x: 0, z: 0 })
  const handlePetitionPress = () => {
    const p = walkPos()
    aimPosRef.current = { x: p.x, z: p.z }
    aimUntilRef.current = performance.now() + 2000
    playOneShot('chime', { freqs: [392, 587, 784], gain: 0.06, decay: 1.1 })
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info('[motu] petition pressed — spotlight + lightning aim at (%.2f, %.2f)', p.x, p.z)
    }
  }

  useRoomAudio(startMotuAudio)

  return (
    <group>
      <MotuColliders spawn={config.camera?.pos} />
      <fogExp2 attach="fog" args={[grade.fogColor || '#1a1424', 0.045]} />
      <ambientLight intensity={grade.ambient ?? 0.24} color={grade.fill || '#2a5a3a'} />
      <pointLight position={[-2.2, 2.6, -1]} intensity={(grade.keyIntensity ?? 1) * 12} color={grade.key || '#a84fd6'} distance={9} decay={2} />
      <pointLight position={[2.2, 2.0, 1.4]} intensity={8} color={grade.fill || '#2a5a3a'} distance={8} decay={2} />
      {/* a low green rim toward the entry, so the far wall behind the
          player's back also carries a cast rather than falling to void */}
      <pointLight position={[0, 1.2, 2.6]} intensity={2.4} color="#3aa860" distance={5} decay={2} />

      {/* camp-cosmos ground fog: two scrolling purple/green layers, the only
          atmosphere this room earns per the toolkit's "one or two per room" */}
      <FogLayers pos={[0, 0.04, -0.5]} size={[ROOM_W, ROOM_D]} color="rgba(150,80,200,0.5)" opacity={0.22} speed={0.015} />
      <FogLayers pos={[0, 0.07, -0.5]} size={[ROOM_W, ROOM_D]} color="rgba(60,160,110,0.4)" opacity={0.16} speed={0.011} />

      <ThroneHall />
      <Throne pos={[0, 0.16, -2.2]} color="#3a2a44" accent="#e8dcc0" />
      <ThroneBoneRibs pos={[0, 0.16, -2.2]} />
      <ThroneSpotlight aimUntilRef={aimUntilRef} aimPosRef={aimPosRef} />
      <LightningPoses aimUntilRef={aimUntilRef} aimPosRef={aimPosRef} />
      <ProclamationScroll film={film} />
      <PetitionOnArmrest onPress={handlePetitionPress} />
      <RoyalSeal score={film.score} />

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
