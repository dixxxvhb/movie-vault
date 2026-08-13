import React, { useMemo, useRef } from 'react'
// eslint-disable-next-line no-unused-vars
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { wallpaper, wallpaperRough, carpet, ceiling } from './roomTextures.js'

// Room is built in METERS so the space reads at true human scale and so a
// WebXR pass later needs no re-authoring.
export const ROOM = {
  W: 4.2,   // x: -2.1 .. 2.1
  H: 2.7,   // y: 0 .. 2.7
  D: 4.0,   // z: -2.0 .. 2.0
}
const HW = ROOM.W / 2
const HD = ROOM.D / 2

// Wall identities. North is the Ledger wall — you spawn facing it.
export const WALLS = {
  north: { pos: [0, ROOM.H / 2, -HD], rot: [0, 0, 0], size: [ROOM.W, ROOM.H], variant: 0 },
  east: { pos: [HW, ROOM.H / 2, 0], rot: [0, -Math.PI / 2, 0], size: [ROOM.D, ROOM.H], variant: 1 },
  south: { pos: [0, ROOM.H / 2, HD], rot: [0, Math.PI, 0], size: [ROOM.W, ROOM.H], variant: 2 },
  west: { pos: [-HW, ROOM.H / 2, 0], rot: [0, Math.PI / 2, 0], size: [ROOM.D, ROOM.H], variant: 3 },
}

function Wall({ pos, rot, size, variant }) {
  const map = useMemo(() => wallpaper(variant), [variant])
  const rough = useMemo(() => wallpaperRough(variant), [variant])
  return (
    <mesh position={pos} rotation={rot} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial map={map} roughnessMap={rough} roughness={0.94} metalness={0} />
    </mesh>
  )
}

function Baseboards() {
  const h = 0.11
  const t = 0.02
  const mat = <meshStandardMaterial color="#221a12" roughness={0.8} />
  return (
    <group>
      <mesh position={[0, h / 2, -HD + t]}>
        <boxGeometry args={[ROOM.W, h, t * 2]} />{mat}
      </mesh>
      <mesh position={[0, h / 2, HD - t]}>
        <boxGeometry args={[ROOM.W, h, t * 2]} />{mat}
      </mesh>
      <mesh position={[-HW + t, h / 2, 0]}>
        <boxGeometry args={[t * 2, h, ROOM.D]} />{mat}
      </mesh>
      <mesh position={[HW - t, h / 2, 0]}>
        <boxGeometry args={[t * 2, h, ROOM.D]} />{mat}
      </mesh>
    </group>
  )
}

// West wall window: sickly neon bleeding in through bent venetian blinds.
// This is the room's only cool light and the reason the space has depth.
function Window() {
  const slats = useMemo(() => {
    const out = []
    for (let i = 0; i < 15; i++) out.push(0.06 + i * 0.062)
    return out
  }, [])
  return (
    <group position={[-HW + 0.03, 1.55, 0.75]} rotation={[0, Math.PI / 2, 0]}>
      {/* The night outside is a cold streetlight, NOT neon. Dixon's own design
          doctrine bans the neon/noir drawer as AI slop; a sodium-and-moonlight
          window does the same job (cold counterpoint to the warm practical)
          without wearing a costume. Tone-mapped on purpose — an untone-mapped
          emissive at this size floods the room and eats the lamp. */}
      <mesh>
        <planeGeometry args={[0.78, 0.92]} />
        <meshBasicMaterial color="#5c6b84" />
      </mesh>
      {/* blinds */}
      {slats.map((y, i) => (
        <mesh key={i} position={[0, 0.46 - y, 0.012]} rotation={[i === 7 ? 0.5 : 0.18, 0, 0]}>
          <planeGeometry args={[0.78, 0.048]} />
          <meshStandardMaterial color="#8d8069" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* frame */}
      <mesh position={[0, 0, -0.015]}>
        <planeGeometry args={[0.9, 1.04]} />
        <meshStandardMaterial color="#171009" roughness={1} />
      </mesh>
    </group>
  )
}

// South wall door — recessed, shut, the way out. Becomes the Queue wall later.
function Door() {
  return (
    <group position={[0.95, 0, HD - 0.02]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 1.02, 0]}>
        <planeGeometry args={[0.9, 2.04]} />
        <meshStandardMaterial color="#3a2a1c" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.02, -0.012]}>
        <planeGeometry args={[1.0, 2.14]} />
        <meshStandardMaterial color="#191008" roughness={1} />
      </mesh>
      {/* knob */}
      <mesh position={[0.34, 1.0, 0.03]}>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshStandardMaterial color="#8a7647" roughness={0.35} metalness={0.8} />
      </mesh>
    </group>
  )
}

// The practical: a cheap motel table lamp on a nightstand. Everything warm in
// the room comes from here, so its position drives the whole light design.
export const LAMP = [1.42, 0.78, -1.35]

function Nightstand() {
  return (
    <group position={[1.45, 0, -1.35]}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[0.52, 0.56, 0.42]} />
        <meshStandardMaterial color="#3d2c1d" roughness={0.75} />
      </mesh>
      {/* drawer front — the archive, opens in a later milestone */}
      <mesh position={[0, 0.36, 0.212]}>
        <planeGeometry args={[0.44, 0.18]} />
        <meshStandardMaterial color="#31220f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.36, 0.222]}>
        <boxGeometry args={[0.12, 0.02, 0.02]} />
        <meshStandardMaterial color="#8a7647" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* lamp base + shade */}
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.045, 0.075, 0.12, 16]} />
        <meshStandardMaterial color="#4a3a22" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.08, 8]} />
        <meshStandardMaterial color="#2a2018" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.79, 0]}>
        <cylinderGeometry args={[0.10, 0.145, 0.17, 24, 1, true]} />
        <meshStandardMaterial
          color="#e8d3a8"
          roughness={0.85}
          side={THREE.DoubleSide}
          emissive="#ffb968"
          emissiveIntensity={0.55}
        />
      </mesh>
    </group>
  )
}

// Dust in the lamp cone. Cheap, and it's most of what makes air feel like air.
function Dust({ count = 260 }) {
  const ref = useRef()
  const { positions, drift } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const drift = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3.4
      positions[i * 3 + 1] = Math.random() * 2.3 + 0.2
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3.4
      drift[i * 3] = (Math.random() - 0.5) * 0.012
      drift[i * 3 + 1] = Math.random() * 0.008 + 0.002
      drift[i * 3 + 2] = (Math.random() - 0.5) * 0.012
    }
    return { positions, drift }
  }, [count])

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const p = g.geometry.attributes.position.array
    const step = Math.min(dt, 0.05)
    for (let i = 0; i < count; i++) {
      p[i * 3] += drift[i * 3] * step * 60 * 0.016
      p[i * 3 + 1] += drift[i * 3 + 1] * step * 60 * 0.016
      p[i * 3 + 2] += drift[i * 3 + 2] * step * 60 * 0.016
      if (p[i * 3 + 1] > 2.55) p[i * 3 + 1] = 0.15
    }
    g.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.0055}
        color="#ffe0b0"
        transparent
        opacity={0.34}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

export default function Room({ dim = false }) {
  const floorMap = useMemo(() => carpet(), [])
  const ceilMap = useMemo(() => ceiling(), [])
  // Dixon's Thread rule: the room dims while the string is up, so the lines
  // read as the only thing lit rather than as decoration hung on a bright wall.
  const lights = useRef()
  useFrame((_, dt) => {
    const g = lights.current
    if (!g) return
    g.children.forEach((l) => {
      if (l.userData.base === undefined) l.userData.base = l.intensity
      l.intensity = THREE.MathUtils.damp(
        l.intensity, l.userData.base * (dim ? 0.34 : 1), 6, dt
      )
    })
  })

  return (
    <group>
      {Object.entries(WALLS).map(([k, w]) => (
        <Wall key={k} {...w} />
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM.W, ROOM.D]} />
        <meshStandardMaterial map={floorMap} roughness={0.98} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.H, 0]}>
        <planeGeometry args={[ROOM.W, ROOM.D]} />
        <meshStandardMaterial map={ceilMap} roughness={1} />
      </mesh>

      <Baseboards />
      <Window />
      <Door />
      <Nightstand />
      <Dust />

      {/* --- lighting: one warm practical, one cold intruder --- */}
      <group ref={lights}>
      <ambientLight intensity={0.34} color="#7d8aa2" />

      {/* the lamp itself */}
      <pointLight position={LAMP} intensity={6.5} color="#ffc078" distance={8} decay={2} />
      {/* motivated wash across the Ledger wall so the photos sit in a pool */}
      <spotLight
        position={[0.5, 2.5, -0.7]}
        target-position={[0, 1.5, -HD]}
        angle={0.95}
        penumbra={1}
        intensity={14}
        color="#ffcb93"
        distance={10}
        decay={2}
      />
      {/* streetlight through the blinds — cool counterpoint, kept under the lamp */}
      <pointLight position={[-HW + 0.45, 1.55, 0.75]} intensity={1.7} color="#93a8c6" distance={4.5} decay={2} />
      {/* barely-there fill so the far corners aren't pure black */}
      <pointLight position={[0, 1.7, 1.7]} intensity={1.5} color="#8fa5c4" distance={6.5} decay={2} />
      </group>
    </group>
  )
}
