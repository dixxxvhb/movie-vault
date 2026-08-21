import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// {surfaces, rate}: growing dark decal quads crawling across walls
// (amadeus stand-in — the frost-fast ink notation). `surfaces` is an array
// of {pos, rot} wall placements; each gets one growing quad, cycling.
export default function InkSpread({ surfaces = [{ pos: [0, 1.6, -2.18], rot: [0, 0, 0] }], rate = 0.08, color = '#1a1410' }) {
  const refs = useRef([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((m, i) => {
      if (!m) return
      const cyclePos = (t * rate + i * 0.6) % 1
      const grow = cyclePos < 0.7 ? cyclePos / 0.7 : 1 - (cyclePos - 0.7) / 0.3
      m.scale.setScalar(Math.max(0.001, grow))
      m.material.opacity = 0.5 * grow
    })
  })
  return (
    <group>
      {surfaces.map((s, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} position={s.pos} rotation={s.rot || [0, 0, 0]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={color} transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}
