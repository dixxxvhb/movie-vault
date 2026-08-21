// Catch Me If You Can's own room recipe — the concourse walk: a warm,
// brassy sustained register underneath a soft, evenly-walked pluck line —
// original register-and-rhythm homage to a mid-century jet-set stride,
// never the actual horn hits.
import { drone, pluck } from './kit.js'

const WALK = [130.8, 146.8, 164.8, 196.0]
const STEP_MS = 480

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [65.4, 98], detuneCents: 4, gain: 0.03, cutoff: 500 })

  let stopped = false
  const timers = []
  let i = 0
  function step() {
    if (stopped) return
    pluck(ctx, master, { freq: WALK[i % WALK.length], gain: 0.05, decay: 0.4 })
    i++
    timers.push(setTimeout(step, STEP_MS + (Math.random() * 60 - 30)))
  }
  timers.push(setTimeout(step, 600))

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    bed.stop()
  }
}
