// The beat/phrase clock. rAF time math ONLY — never the AudioContext's
// currentTime, never setInterval — so a room's visual systems (wipers,
// pulses, score-numeral beats) stay on the grid even while sound is muted
// and no AudioContext has ever been constructed. Audio recipes that need to
// line up with the same grid (recipes/kit.js's beatKit) read the same
// elapsed-time math and do their own sample-accurate scheduling against
// ctx.currentTime — the clock hands out the beat MATH, not a media clock.
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0

// Pure function: bpm + elapsed ms -> where the grid is right now. Exported so
// a non-React caller (an audio recipe scheduling ahead of the current frame)
// can ask "what beat is coming up" without needing a hook.
export function beatAt(bpm, elapsedMs) {
  const beatDur = 60000 / bpm
  const beatFloat = elapsedMs / beatDur
  const bar = Math.floor(beatFloat / 4)
  const beat = Math.floor(beatFloat) % 4
  const phase = beatFloat - Math.floor(beatFloat)
  return { beat, bar, phase, elapsedMs }
}

// React hook, R3F-side. Deliberately NOT `useState` — a beat clock ticks far
// faster than anything should re-render for, so this writes into a ref every
// frame (piggybacking R3F's own rAF-driven render loop, which is already
// independent of the AudioContext) and hands back that same ref. Callers
// read `ref.current` inside their own useFrame; nothing here schedules a
// React render.
export function useBeat(bpm = 100) {
  const ref = useRef({ beat: 0, bar: 0, phase: 0, elapsedMs: 0 })
  useFrame(() => {
    ref.current = beatAt(bpm, now())
  })
  return ref
}

// For a caller outside R3F's render loop entirely (shouldn't normally be
// needed, but recipes/kit.js's swellReverse timing wants a plain read).
export function clockNow() {
  return now()
}
