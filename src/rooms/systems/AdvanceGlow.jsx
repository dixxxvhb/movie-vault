import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// {from, color, speed, resetAt, intensity}: a light + glow plane creeping
// toward the camera, never arrives — resets at `resetAt` distance and
// creeps again (rogue-one hum-in-the-dark; minority-report rolling-ball
// variant passes prop:'sphere' and gets a sphere instead of a plane).
//
// P2 round 2: `intensity` is a small 0-2ish multiplier on both the point
// light and the mesh's own opacity ceiling, default 1 (= the light's
// original fixed 26 and the mesh's original 0.5-0.8 opacity band —
// existing rooms unaffected). Added because oblivion's drone orb (prop:
// 'sphere') was blowing its small box room to a solid white patch and the
// fix belongs on the system, not a config-side hack — every other caller
// (rogue-one, minority-report) never sets it and stays exactly as before.
export default function AdvanceGlow({ from = [0, 1.4, -6], color = '#8aff9a', speed = 0.25, resetAt = 5.2, axis = 'z', prop = 'plane', intensity = 1 }) {
  const ref = useRef()
  const light = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime * speed
    const travel = (t % 1) * resetAt
    const pos = [...from]
    const idx = axis === 'z' ? 2 : axis === 'x' ? 0 : 1
    pos[idx] = from[idx] + (from[idx] < 0 ? travel : -travel)
    ref.current.position.set(...pos)
    if (light.current) light.current.position.set(...pos)
    const fade = Math.min(1, (1 - (t % 1)) * 2)
    ref.current.material.opacity = (0.5 + fade * 0.3) * intensity
  })
  return (
    <group>
      <pointLight ref={light} color={color} intensity={26 * intensity} distance={6} decay={2} />
      <mesh ref={ref}>
        {prop === 'sphere'
          ? <sphereGeometry args={[0.18, 16, 16]} />
          : <planeGeometry args={[1.6, 1]} />}
        <meshBasicMaterial color={color} transparent opacity={0.6 * intensity} />
      </mesh>
    </group>
  )
}
