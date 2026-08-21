import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// {afterSec, then}: after N seconds of presence in the room, swap to a
// wilder state — strobe red light + faster motion (malignant). Tracks its
// own mount time (not the shared clock, which keeps running across room
// swaps) so "after N seconds" means seconds since THIS room opened.
export default function DwellConcede({ afterSec = 25, onConcede }) {
  const start = useRef(null)
  const light = useRef()
  useFrame(({ clock }) => {
    if (start.current === null) start.current = clock.elapsedTime
    const dwell = clock.elapsedTime - start.current
    const conceded = dwell > afterSec
    if (onConcede) onConcede(conceded)
    if (light.current) {
      const strobe = conceded ? (Math.sin(clock.elapsedTime * 22) > 0.3 ? 40 : 0) : 0
      light.current.intensity = strobe
    }
  })
  return <pointLight ref={light} color="#c81010" intensity={0} distance={7} decay={2} position={[0, 1.6, 0]} />
}
