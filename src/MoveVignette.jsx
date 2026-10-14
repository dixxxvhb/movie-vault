import React, { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { get, subscribe } from './settings.js'

// "Narrow the view while moving" (motion.moveVignette). While the camera is
// travelling, a station flight, a walk, a door's fly-in, the edges of the
// screen darken and the view closes toward the centre; when it stops, they
// open again. A tunnelling vignette is one of the few motion-sickness
// mitigations with real evidence behind it.
//
// Two halves because the Canvas and the DOM are separate React roots: the
// probe lives inside the Canvas and measures camera speed every frame, the
// overlay is plain DOM above it. They meet through one element ref, written
// directly so a moving camera never re-renders React.

let overlayEl = null
let enabled = !!get('motion.moveVignette')
subscribe(() => { enabled = !!get('motion.moveVignette') })

const FULL_AT = 1.6  // m/s of camera travel that reaches full strength
const FLOOR = 0.12   // m/s below this is a settle or a sway, not travel
const MAX = 0.9
const CUT_SPEED = 25 // m/s

export function MoveVignetteOverlay() {
  const ref = useRef(null)
  useEffect(() => {
    overlayEl = ref.current
    return () => { if (overlayEl === ref.current) overlayEl = null }
  }, [])
  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5, opacity: 0,
        background: 'radial-gradient(ellipse 62% 58% at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,.92) 100%)',
      }}
    />
  )
}

export default function MoveVignette() {
  const last = useRef(null)
  const level = useRef(0)
  useFrame(({ camera }, dt) => {
    if (!overlayEl) return
    const p = camera.position
    let target = 0
    if (enabled && last.current && dt > 0) {
      const raw = p.distanceTo(last.current) / dt
      // faster than anything the rig flies or walks is a cut (a world swap,
      // the 'cut' travel setting), not travel: nothing to narrow for
      const speed = raw > CUT_SPEED ? 0 : raw
      target = Math.min(1, Math.max(0, (speed - FLOOR) / (FULL_AT - FLOOR))) * MAX
    }
    last.current = last.current ? last.current.copy(p) : p.clone()
    // close fast, open slow: the edges should already be in when the move
    // starts and let go gently after it ends
    const k = target > level.current ? 10 : 2.5
    level.current += (target - level.current) * Math.min(1, dt * k)
    if (level.current < 0.004) level.current = 0
    overlayEl.style.opacity = level.current.toFixed(3)
  })
  return null
}
