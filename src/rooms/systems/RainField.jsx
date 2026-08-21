import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// {density, wind}: streak particles + floor splash shimmer (br2049, pressure
// windows {insideOnly:true} — same system, just parked close against a glass
// plane instead of filling the room).
export default function RainField({ density = 400, wind = 0.3, area = [8, 6, 8], insideOnly = false, color = '#bcd6e0' }) {
  const ref = useRef()
  const count = insideOnly ? Math.min(density, 160) : density
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * area[0]
      positions[i * 3 + 1] = Math.random() * area[1]
      positions[i * 3 + 2] = insideOnly ? -area[2] * 0.48 + (Math.random() - 0.5) * 0.3 : (Math.random() - 0.5) * area[2]
      speeds[i] = 4 + Math.random() * 4
    }
    return { positions, speeds }
  }, [count, area[0], area[1], area[2], insideOnly])

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const p = g.geometry.attributes.position.array
    const step = Math.min(dt, 0.05)
    for (let i = 0; i < count; i++) {
      p[i * 3 + 1] -= speeds[i] * step
      p[i * 3] += wind * step
      if (p[i * 3 + 1] < 0) {
        p[i * 3 + 1] = area[1]
        p[i * 3] = (Math.random() - 0.5) * area[0]
      }
    }
    g.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref} key={count}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.02} color={color} transparent opacity={0.5} sizeAttenuation depthWrite={false} />
    </points>
  )
}
