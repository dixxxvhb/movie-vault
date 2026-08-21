import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { gaze } from '../../CameraRig.jsx'
import { abstractFigure } from '../props.jsx'

// {corner, height}: an abstractFigure only visible when NOT near view
// center — reads `gaze` (live camera yaw/pitch, published by CameraRig) and
// fades in via smoothstep as the corner leaves the frame center (hereditary,
// malignant pre-dwell).
export default function PeripheralFigure({ corner = 'high', height = 2.2, pos = [1.6, 2.0, -1.8], color = '#0c0d10' }) {
  const ref = useRef()
  const targetYaw = useRef(0)
  useFrame(() => {
    if (!ref.current) return
    // angle between camera facing and the direction to the figure, roughly —
    // cheap approximation using yaw only (pitch corners read fine off this too)
    const toFigureYaw = Math.atan2(-pos[0], -pos[2])
    let d = Math.abs(gaze.yaw - toFigureYaw)
    while (d > Math.PI) d = Math.abs(d - Math.PI * 2)
    const edge = 0.35, full = 0.9
    const s = Math.min(1, Math.max(0, (d - edge) / (full - edge)))
    const smooth = s * s * (3 - 2 * s)
    ref.current.traverse((o) => {
      if (o.material) {
        o.material.transparent = true
        o.material.opacity = smooth
      }
    })
  })
  return (
    <group ref={ref} position={pos}>
      {abstractFigure({ pose: corner === 'high' ? 'stand' : 'crouch', color })}
    </group>
  )
}
