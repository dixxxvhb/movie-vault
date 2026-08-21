import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import InfoSurfaces from '../InfoSurfaces.jsx'

// Drifting grain. Same shape as Room.jsx's Dust (keyed on count — a resized
// buffer attribute throws), tuned slower and dimmer: this is memory settling,
// not a lit motel room.
function Grain({ count = 200, color = '#ffe0b0' }) {
  const ref = useRef()
  const { positions, drift } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const drift = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 5.2
      positions[i * 3 + 1] = Math.random() * 2.6 + 0.08
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5.2
      drift[i * 3] = (Math.random() - 0.5) * 0.008
      drift[i * 3 + 1] = Math.random() * 0.005 + 0.0012
      drift[i * 3 + 2] = (Math.random() - 0.5) * 0.008
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
      if (p[i * 3 + 1] > 2.7) p[i * 3 + 1] = 0.08
    }
    g.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref} key={count}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.006} color={color} transparent opacity={0.4} sizeAttenuation depthWrite={false} />
    </points>
  )
}

// The placeholder room (Wave A). Every film that has not earned a bespoke
// recreation yet (Wave B) still gets somewhere to stand on day one — not a
// blank error state, a "developing memory": fog in the film's own color, a
// floor disc to stand on, one key light in the film's accent, drifting
// grain, and the record.
export default function Default({ film, config, infoVisible }) {
  const { grade } = config
  return (
    <group>
      <fog attach="fog" args={[grade.fogColor, 1.4, 8.6]} />

      <pointLight position={[0, 2.15, -1.2]} intensity={grade.keyIntensity} color={grade.key} distance={9} decay={2} />
      <pointLight position={[0, 1.1, 1.7]} intensity={grade.keyIntensity * 0.22} color={grade.fill} distance={7} decay={2} />

      {/* the floor disc: the one resolved thing in an otherwise undeveloped room */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.6, 48]} />
        <meshStandardMaterial color={grade.fogColor} roughness={1} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[2.54, 2.62, 64]} />
        <meshBasicMaterial color={grade.key} transparent opacity={0.5} />
      </mesh>

      <Grain count={200} color={grade.key} />

      <InfoSurfaces film={film} config={config} visible={infoVisible} />
    </group>
  )
}
