import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// {period, count, color}: a particle cloud erupts, circles, disperses on a
// timer (batman). Instanced (count usually > 20) and keyed on count so the
// buffer never resizes live.
export default function SwarmEvent({ period = 40, count = 60, color = '#1a1a22', origin = [0, 1.6, -1] }) {
  const ref = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const seeds = useMemo(() => Array.from({ length: count }, () => ({
    a: Math.random() * Math.PI * 2,
    r: 0.6 + Math.random() * 1.8,
    speed: 0.6 + Math.random() * 0.8,
    ph: Math.random() * Math.PI * 2,
    lift: Math.random() * 1.2,
  })), [count])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime % period
    // 0..1 phase within a short eruption window at the start of each cycle
    const active = t < 6
    const phase = active ? t / 6 : 0
    const env = active ? Math.sin(phase * Math.PI) : 0
    seeds.forEach((s, i) => {
      const ang = s.a + t * s.speed
      const rad = s.r * (0.3 + env)
      dummy.position.set(
        origin[0] + Math.cos(ang) * rad,
        origin[1] + s.lift * env + Math.sin(t * 2 + s.ph) * 0.08,
        origin[2] + Math.sin(ang) * rad
      )
      dummy.scale.setScalar(0.05 + env * 0.05)
      dummy.rotation.set(t, t * 1.3, 0)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.visible = env > 0.01
  })

  return (
    <instancedMesh ref={ref} args={[null, null, count]} key={count}>
      <coneGeometry args={[1, 2, 5]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </instancedMesh>
  )
}
