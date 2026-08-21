import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// {period, duration, altGrade, altLights}: a hard swap of background/lighting
// for `duration` ms every `period` sec, no easing, then back (stby swerve,
// barbarian smash cut, exmachina power-cut red). This tier fakes the swap
// with a full-view tinted overlay + a bright colored light rather than
// mutating scene.background (kept single-owner at App level) — visually a
// hard cut either way since there's no crossfade.
export default function ScheduledCut({ period = 60, duration = 4000, altGrade = '#e8c060', altLights = null }) {
  const ref = useRef()
  const light = useRef()
  const durSec = duration / 1000
  useFrame(({ clock, camera }) => {
    if (!ref.current) return
    // phase-shifted so a fresh mount (elapsedTime near 0) always lands in
    // the OFF phase — without this every room opened on the wall (or every
    // peek/shot screenshot, which settles within a few seconds of load)
    // landed inside the cut window for any duration long enough to matter,
    // which read as the room being permanently blown out rather than cut
    // TO occasionally.
    const t = (clock.elapsedTime + period * 0.4) % period
    const active = t < durSec
    ref.current.material.opacity = active ? 0.6 : 0
    if (active) {
      ref.current.position.copy(camera.position)
      ref.current.quaternion.copy(camera.quaternion)
      ref.current.translateZ(-0.4)
    }
    if (light.current) light.current.intensity = active ? 40 : 0
  })
  return (
    <group>
      <pointLight ref={light} color={altGrade} intensity={0} distance={8} decay={2} position={[0, 1.6, 0]} />
      <mesh ref={ref} renderOrder={998}>
        <planeGeometry args={[5, 4]} />
        <meshBasicMaterial color={altGrade} transparent opacity={0} depthTest={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
