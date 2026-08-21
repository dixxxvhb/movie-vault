import React, { useEffect, useRef, useState } from 'react'

// The portal wash. Pattern-copied from ColdOpen.jsx: a DOM overlay because it
// has to cover the very first frames of whatever mounts underneath, before
// any texture has decoded, and it must never hold a WebGL resource that
// outlives it.
//
// One overlay, both directions. Walking INTO a photo and collapsing back out
// of one are the same wash played the same way: a chemical white-out that
// peaks (fully covering — this is where the world actually swaps underneath
// it) then fades, revealing whatever is there. `onPeak` fires the swap;
// `onDone` tells the parent this overlay is finished and can stop being
// rendered. Interruptible exactly like ColdOpen: any input skips straight to
// the end — nobody should be stuck behind a white-out because they moved the
// mouse too soon.
const PEAK = 780   // matches CameraRig's FLIGHT_MS, so the wash covers the flight
const FADE = 600
const TOTAL = PEAK + FADE
const PEAK_PCT = (PEAK / TOTAL) * 100

const WASH = `
@keyframes vault-develop-wash {
   0%   { opacity: 0; }
  ${PEAK_PCT}% { opacity: 1; }
 100%   { opacity: 0; }
}
@keyframes vault-develop-grain {
  0%, 100% { transform: translate(0,0); }
  25%      { transform: translate(-1.5%,1%); }
  50%      { transform: translate(1%,-1.5%); }
  75%      { transform: translate(-1%,1.5%); }
}
`

export default function Develop({ onPeak, onDone }) {
  const [done, setDone] = useState(false)
  const peaked = useRef(false)
  const finished = useRef(false)

  useEffect(() => {
    const firePeak = () => {
      if (peaked.current) return
      peaked.current = true
      onPeak?.()
    }
    const finish = () => {
      if (finished.current) return
      finished.current = true
      firePeak()
      setDone(true)
      onDone?.()
    }
    const t1 = setTimeout(firePeak, PEAK)
    const t2 = setTimeout(finish, TOTAL)
    // any input at all skips straight to the end state
    const evts = ['pointerdown', 'keydown', 'wheel']
    evts.forEach((e) => window.addEventListener(e, finish, { once: true, passive: true }))
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      evts.forEach((e) => window.removeEventListener(e, finish))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (done) return null

  return (
    <>
      <style>{WASH}</style>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, #fdf7e9 0%, #e9dcbc 68%, #ccba8f 100%)',
          animation: `vault-develop-wash ${TOTAL}ms ease-in-out forwards`,
          willChange: 'opacity',
        }}
      />
      {/* grain, resolving — the "chemical wash" part of the wash */}
      <div
        style={{
          position: 'fixed', inset: '-4% -4%', zIndex: 61, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(20,14,6,.55) 1px, transparent 1.4px)',
          backgroundSize: '3px 3px',
          mixBlendMode: 'multiply',
          animation:
            `vault-develop-wash ${TOTAL}ms ease-in-out forwards, ` +
            `vault-develop-grain 130ms steps(3) infinite`,
        }}
      />
    </>
  )
}
