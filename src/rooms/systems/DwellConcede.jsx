import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { strobe, safeRed } from '../../flashPolicy.js'

// {afterSec, then}: after N seconds of presence in the room, swap to a
// wilder state — strobe red light + faster motion (malignant). Tracks its
// own mount time (not the shared clock, which keeps running across room
// swaps) so "after N seconds" means seconds since THIS room opened.
//
// The strobe used to be `Math.sin(t * 22) > 0.3 ? 40 : 0` on #c81010: a
// 3.5 Hz hard square wave in saturated red, firing automatically after 25
// seconds with no warning and no way off. That is a WCAG 2.3.1 failure on
// both the general flash and the red flash thresholds, and it was live.
// The room still concedes and still goes red — the concession IS the review,
// and losing it would be losing the joke — but the rate, the edge and the
// saturation now come from flashPolicy.js, which caps every blink in the
// Vault at 2.5 Hz and honours prefers-reduced-motion.
export default function DwellConcede({ afterSec = 25, onConcede }) {
  const start = useRef(null)
  const light = useRef()
  const red = useMemo(() => safeRed(0.85), [])
  useFrame(({ clock }) => {
    if (start.current === null) start.current = clock.elapsedTime
    const dwell = clock.elapsedTime - start.current
    const conceded = dwell > afterSec
    if (onConcede) onConcede(conceded)
    if (light.current) {
      // A floor of 0.18 keeps the room lit red between peaks rather than
      // slamming to black, which is the other half of the guideline: a
      // flash only counts as a flash if the luminance swing is large.
      light.current.intensity = conceded
        ? strobe(clock.elapsedTime, { hz: 2.2, soft: 0.3, floor: 0.18 }) * 34
        : 0
    }
  })
  return <pointLight ref={light} color={red} intensity={0} distance={7} decay={2} position={[0, 1.6, 0]} />
}
