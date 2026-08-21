import React, { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// {period, jitter}: a white flash overlay that sweeps the room on a clock
// (coherence, source-code). Clock-driven rather than setInterval-driven on
// purpose — StrictMode double-fires effects, and a `useFrame` read of
// clock.elapsedTime needs no listener to clean up at all.
export default function ResetFlash({ period = 60, jitter = 0.15 }) {
  const ref = useRef()
  const { camera } = useThree()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const p = period * (1 + (Math.sin(period * 0.7) * jitter))
    const t = clock.elapsedTime % p
    // a fast spike near the top of every cycle, near-zero the rest of the time
    const spike = Math.max(0, 1 - t / 0.22)
    ref.current.material.opacity = spike * spike * 0.85
    ref.current.position.copy(camera.position)
    ref.current.quaternion.copy(camera.quaternion)
    ref.current.translateZ(-0.3)
  })
  return (
    <mesh ref={ref} renderOrder={999}>
      <planeGeometry args={[4, 3]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0} depthTest={false} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}
