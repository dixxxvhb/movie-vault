import React, { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { throne as Throne } from '../props.jsx'
import { useRoomAudio } from '../audio/engine.js'
import { start as startMotuAudio } from '../audio/recipes/motu.js'
import { notifyPose } from './motuBus.js'
import { makeProclamationTexture, makePetitionTexture, makeSealTexture } from './motuTextures.js'
import DoorRow from '../DoorRow.jsx'

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

/* ------------------------------------------------------------------ shell */

function wallTex(tint, seed) {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, S, S)
  let s = seed >>> 0
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  ctx.globalAlpha = 0.07
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = r() > 0.5 ? '#000' : '#fff'
    ctx.fillRect(r() * S, r() * S, 1.5, 1.5)
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function ThroneHall() {
  const wallT = useMemo(() => wallTex('#241a34', 701), [])
  const floorT = useMemo(() => wallTex('#1a1424', 702), [])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial map={floorT} roughness={0.6} metalness={0.15} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial map={wallT} roughness={0.9} />
      </mesh>
      <mesh position={[0, ROOM_H / 2, -ROOM_D / 2]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial map={wallT} roughness={0.85} />
      </mesh>
      <mesh position={[0, ROOM_H / 2, ROOM_D / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial map={wallT} roughness={0.85} />
      </mesh>
      <mesh position={[-ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial map={wallT} roughness={0.85} />
      </mesh>
      <mesh position={[ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial map={wallT} roughness={0.85} />
      </mesh>
      {/* a raised dais under the throne */}
      <mesh position={[0, 0.08, -2.2]}>
        <boxGeometry args={[2.2, 0.16, 1.6]} />
        <meshStandardMaterial color="#2a1e38" roughness={0.5} metalness={0.2} />
      </mesh>
      {/* tall fluted columns, theatrical staging either side */}
      {[-2.3, 2.3].map((x, i) => (
        <mesh key={i} position={[x, ROOM_H / 2 - 0.2, -2.4]}>
          <cylinderGeometry args={[0.22, 0.26, ROOM_H - 0.4, 12]} />
          <meshStandardMaterial color="#3a2a4a" emissive="#4a2a6a" emissiveIntensity={0.25} roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

/* --------------------------------------------------------------- spotlight */

// A hard-cut spotlight: fully off, then fully on, no ramp — SNAPS, per the
// brief's own word. Set directly in useFrame (not React state) so the cut
// is genuinely instantaneous rather than riding a render's worth of lag.
function ThroneSpotlight() {
  const spot = useRef()
  const fixture = useRef()
  const pool = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime % SPOT_PERIOD
    const on = t < SPOT_ON
    if (spot.current) spot.current.intensity = on ? 110 : 0
    if (fixture.current) fixture.current.material.emissiveIntensity = on ? 2.2 : 0.15
    if (pool.current) pool.current.material.opacity = on ? 0.55 : 0
  })
  return (
    <group>
      <spotLight
        ref={spot}
        position={[0, ROOM_H - 0.3, -0.4]}
        target-position={[0, 0.9, -2.2]}
        angle={0.32}
        penumbra={0.4}
        distance={ROOM_H + 1}
        color="#f0e0ff"
        intensity={0}
        decay={2}
      />
      {/* the fixture itself, a small ceiling disc that flares when the
          spotlight snaps on — reads clearly even in a still frame, unlike
          a rendered light cone (which looked like a solid wedge of geometry
          from this room's own close quarters and got cut for it) */}
      <mesh ref={fixture} position={[0, ROOM_H - 0.15, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.32, 24]} />
        <meshStandardMaterial color="#f0e0ff" emissive="#f0e0ff" emissiveIntensity={0.15} toneMapped={false} />
      </mesh>
      {/* the light pool it snaps onto, flat on the dais */}
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
        <mesh key={i} position={s.mid} rotation={[0, 0, s.angleZ]}>
          <boxGeometry args={[0.05, s.len, 0.05]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.6} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function LightningPoses() {
  const [bolts, setBolts] = useState(() => [jaggedPoints(11, -1.6), jaggedPoints(23, 1.7)])
  const bucketRef = useRef(0)
  useFrame(({ clock }) => {
    const bucket = Math.floor(clock.elapsedTime / POSE_PERIOD)
    if (bucket !== bucketRef.current) {
      bucketRef.current = bucket
      setBolts([jaggedPoints(bucket * 7 + 11, -1.6 + Math.sin(bucket) * 0.4), jaggedPoints(bucket * 13 + 23, 1.7 + Math.cos(bucket) * 0.4)])
      notifyPose()
    }
  })
  return (
    <group>
      <BoltSegments pts={bolts[0]} color="#c9a0ff" />
      <BoltSegments pts={bolts[1]} color="#a0e8b0" />
    </group>
  )
}

/* -------------------------------------------------------------- signage */

function ProclamationScroll({ film }) {
  const tex = useMemo(() => makeProclamationTexture(film), [film.slug, film.hot_take])
  return (
    <group position={[-2.55, 2.1, -2.7]} rotation={[0, 0.35, 0]}>
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

function PetitionOnArmrest() {
  const tex = useMemo(() => makePetitionTexture(), [])
  return (
    <mesh position={[0.62, 0.72, -1.85]} rotation={[-Math.PI / 2, 0, -0.15]}>
      <planeGeometry args={[0.42, 0.52]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
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

  useRoomAudio(startMotuAudio)

  return (
    <group>
      <fogExp2 attach="fog" args={[grade.fogColor || '#1a1424', 0.045]} />
      <ambientLight intensity={grade.ambient ?? 0.16} color={grade.fill || '#2a5a3a'} />
      <pointLight position={[-2.2, 2.6, -1]} intensity={(grade.keyIntensity ?? 1) * 12} color={grade.key || '#a84fd6'} distance={9} decay={2} />
      <pointLight position={[2.2, 2.0, 1.4]} intensity={8} color={grade.fill || '#2a5a3a'} distance={8} decay={2} />

      <ThroneHall />
      <Throne pos={[0, 0.16, -2.2]} color="#3a2a44" accent="#e8dcc0" />
      <ThroneSpotlight />
      <LightningPoses />
      <ProclamationScroll film={film} />
      <PetitionOnArmrest />
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
