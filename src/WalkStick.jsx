import React, { useEffect, useRef } from 'react'
import { setStickVec } from './walkKeys.js'

// Wave M1: the mobile walk stick. Pure DOM (not a Canvas/R3F component) so
// it sits above everything with a plain fixed div, same as the film HUD
// strip — the canvas itself never needs to know this exists. Positioned
// bottom-left, on purpose: drag-look still owns the whole canvas including
// the right side and everywhere above the ring, so a thumb resting here
// never fights a thumb looking around on the other side of the screen.
const RING = 96
const RADIUS = RING / 2

export default function WalkStick() {
  const ringRef = useRef(null)
  const nubRef = useRef(null)
  const active = useRef(null) // {id, cx, cy} while a touch owns the stick

  useEffect(() => {
    const ring = ringRef.current
    const nub = nubRef.current
    if (!ring || !nub) return

    const setNub = (dx, dz) => {
      // dz is forward(+)/back(-) in walk space; the ring's own +Y screen
      // axis is down, so the nub's on-screen y is the inverse of dz.
      nub.style.transform = `translate(${dx * RADIUS}px, ${-dz * RADIUS}px)`
    }

    const start = (e) => {
      const t = e.changedTouches[0]
      const rect = ring.getBoundingClientRect()
      active.current = { id: t.identifier, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 }
      ring.style.opacity = '0.6'
      e.preventDefault()
    }

    const move = (e) => {
      if (!active.current) return
      const t = [...e.changedTouches].find((tt) => tt.identifier === active.current.id)
      if (!t) return
      let dx = (t.clientX - active.current.cx) / RADIUS
      let dz = -(t.clientY - active.current.cy) / RADIUS
      const len = Math.hypot(dx, dz)
      if (len > 1) { dx /= len; dz /= len }
      setNub(dx, dz)
      setStickVec({ x: dx, z: dz })
      e.preventDefault()
    }

    const end = (e) => {
      if (!active.current) return
      const t = [...e.changedTouches].find((tt) => tt.identifier === active.current.id)
      if (!t) return
      active.current = null
      ring.style.opacity = '0.35'
      setNub(0, 0)
      setStickVec({ x: 0, z: 0 })
      e.preventDefault()
    }

    ring.addEventListener('touchstart', start, { passive: false })
    // move/end on window: a thumb that slides off the ring's own hit area
    // must keep steering (and must still reliably zero out on release).
    window.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('touchend', end, { passive: false })
    window.addEventListener('touchcancel', end, { passive: false })
    return () => {
      ring.removeEventListener('touchstart', start)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end)
      window.removeEventListener('touchcancel', end)
      // StrictMode double-mount / a room swap mid-touch: never leave a
      // ghost vector steering the walker after this stick is gone.
      setStickVec({ x: 0, z: 0 })
    }
  }, [])

  return (
    <div
      ref={ringRef}
      style={{
        position: 'fixed',
        left: 22,
        bottom: 84,
        width: RING,
        height: RING,
        borderRadius: '50%',
        background: 'rgba(250, 243, 232, 0.06)',
        border: '1px solid rgba(250, 243, 232, 0.22)',
        opacity: 0.35,
        touchAction: 'none',
        zIndex: 5,
        transition: 'opacity 160ms ease',
      }}
    >
      <div
        ref={nubRef}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 34,
          height: 34,
          marginLeft: -17,
          marginTop: -17,
          borderRadius: '50%',
          background: 'rgba(250, 243, 232, 0.28)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
