import React, { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { gaze } from '../../CameraRig.jsx'

// {prop, max}: an instanced pile that adds one instance each time gaze
// leaves it, capped at `max` (triangle's Sally pile; silverlake's map
// re-arranges instead of grows — pass grow:false for that variant).
export default function LookAwayGrow({ pos = [0, 0, -1.6], max = 40, color = '#c8a860', grow = true }) {
  const ref = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const [n, setN] = useState(grow ? 3 : max)
  const wasLooking = useRef(true)
  const rearrangeTick = useRef(0)
  const layout = useRef(Array.from({ length: max }, (_, i) => ({
    a: (i / max) * Math.PI * 2 * 3.1,
    r: 0.05 + Math.sqrt(i) * 0.055,
  })))

  useFrame(() => {
    if (!ref.current) return
    const toYaw = Math.atan2(-pos[0], -pos[2])
    let d = Math.abs(gaze.yaw - toYaw)
    while (d > Math.PI) d = Math.abs(d - Math.PI * 2)
    const looking = d < 0.3
    if (wasLooking.current && !looking) {
      if (grow) setN((v) => Math.min(max, v + 1))
      else rearrangeTick.current += 1
    }
    wasLooking.current = looking

    if (!grow && rearrangeTick.current) {
      // reshuffle radii slightly on each look-away, without growing count
      layout.current.forEach((it) => { it.r += (Math.random() - 0.5) * 0.02 })
      rearrangeTick.current = 0
    }

    const count = ref.current.count
    for (let i = 0; i < count; i++) {
      const it = layout.current[i]
      dummy.position.set(pos[0] + Math.cos(it.a) * it.r, pos[1] + 0.02, pos[2] + Math.sin(it.a) * it.r)
      dummy.rotation.set(0, it.a, 0)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[null, null, n]} key={n}>
      <boxGeometry args={[0.05, 0.03, 0.05]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </instancedMesh>
  )
}
