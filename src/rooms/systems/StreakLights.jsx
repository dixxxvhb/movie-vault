import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// {axis, speed, colors}: emissive quads sweeping past windows (bullettrain,
// maverick, cmiyc). axis: 'x' | 'z'. Instanced, keyed on count.
export default function StreakLights({ axis = 'x', speed = 3, colors = ['#e8d44d'], count = 24, span = 14, y = 1.4, z = -1.9 }) {
  const ref = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({
    off: (i / count) * span,
    len: 0.3 + Math.random() * 1.2,
    col: colors[i % colors.length],
    y: y + (Math.random() - 0.5) * 0.6,
  })), [count, span, colors.join(','), y])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime * speed
    seeds.forEach((s, i) => {
      const pos = ((s.off + t) % span) - span / 2
      if (axis === 'x') {
        dummy.position.set(pos, s.y, z)
        dummy.scale.set(s.len, 0.08, 1)
      } else {
        dummy.position.set(z, s.y, pos)
        dummy.scale.set(1, 0.08, s.len)
      }
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
      ref.current.setColorAt(i, new THREE.Color(s.col))
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[null, null, count]} key={count}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.85} side={THREE.DoubleSide} />
    </instancedMesh>
  )
}
