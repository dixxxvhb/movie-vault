import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// {period}: a curtain plane scales open onto an empty alcove, closes
// (disclosure-day). Purely a curtain: whatever it reveals is just the room
// behind it, staged empty by the config, not rendered here.
export default function CurtainReveal({ period = 45, pos = [0, 1.6, -2.2], w = 1.8, h = 2.6, color = '#7a2a2a' }) {
  const left = useRef()
  const right = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime % period
    // open for the middle third of each cycle
    const openPhase = t > period * 0.35 && t < period * 0.65
    const local = openPhase ? (t - period * 0.35) / (period * 0.3) : 0
    const swing = openPhase ? Math.sin(Math.min(1, local) * Math.PI) : 0
    const openAmt = openPhase ? Math.min(1, local * 3) * Math.min(1, (1 - local) * 3 + 0.001) : 0
    const spread = Math.max(openAmt, 0) * (w / 2)
    if (left.current) left.current.position.x = pos[0] - w / 4 - spread
    if (right.current) right.current.position.x = pos[0] + w / 4 + spread
    void swing
  })
  return (
    <group>
      <mesh ref={left} position={[pos[0] - w / 4, pos[1], pos[2]]}>
        <planeGeometry args={[w / 2, h]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      <mesh ref={right} position={[pos[0] + w / 4, pos[1], pos[2]]}>
        <planeGeometry args={[w / 2, h]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
    </group>
  )
}
