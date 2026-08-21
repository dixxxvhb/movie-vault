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

// Memento's own cold detail: entering the room that IS the origin myth gets a
// wash that runs slightly longer and settles its grain slower than every
// other film's — the one wash in the whole app that isn't the standard beat.
// `slow` scales peak/fade together so PEAK_PCT (and the keyframe shape) stays
// identical; only the wall-clock duration changes.
const SLOW_FACTOR = 1.55

export default function Develop({ onPeak, onDone, slow = false }) {
  const peak = slow ? Math.round(PEAK * SLOW_FACTOR) : PEAK
  const fade = slow ? Math.round(FADE * SLOW_FACTOR) : FADE
  const total = peak + fade
  const peakPct = (peak / total) * 100

  const [done, setDone] = useState(false)
  const peaked = useRef(false)
  const finished = useRef(false)

  const wash = `
@keyframes vault-develop-wash {
   0%   { opacity: 0; }
  ${peakPct}% { opacity: 1; }
 100%   { opacity: 0; }
}
@keyframes vault-develop-grain {
  0%, 100% { transform: translate(0,0); }
  25%      { transform: translate(-1.5%,1%); }
  50%      { transform: translate(1%,-1.5%); }
  75%      { transform: translate(-1%,1.5%); }
}
`

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
    const t1 = setTimeout(firePeak, peak)
    const t2 = setTimeout(finish, total)
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

  // grain settles slower too, not just the overall wash — a flat 130ms step
  // rate scaled by the same factor so Memento's chemical bath reads as
  // thicker/slower rather than just longer
  const grainStep = slow ? Math.round(130 * SLOW_FACTOR) : 130

  return (
    <>
      <style>{wash}</style>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, #fdf7e9 0%, #e9dcbc 68%, #ccba8f 100%)',
          animation: `vault-develop-wash ${total}ms ease-in-out forwards`,
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
            `vault-develop-wash ${total}ms ease-in-out forwards, ` +
            `vault-develop-grain ${grainStep}ms steps(3) infinite`,
        }}
      />
    </>
  )
}
