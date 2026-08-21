// Stardust's own room recipe — celeste-register shimmer, honoring the
// register his highlight called out (the score) without touching it: a
// slow rotation of bell partials, sparse and high, over near silence.
import { chime, drone } from './kit.js'

const NOTES = [1046.5, 1174.7, 1318.5, 1568.0, 1760.0]

export function start(ctx, master) {
  const air = drone(ctx, master, { freqs: [130.8], detuneCents: 3, gain: 0.012, cutoff: 900 })

  let stopped = false
  const timers = []
  function scheduleShimmer() {
    if (stopped) return
    const f = NOTES[Math.floor(Math.random() * NOTES.length)]
    chime(ctx, master, { freqs: [f, f * 1.5], gain: 0.05, decay: 3.4 })
    timers.push(setTimeout(scheduleShimmer, 2600 + Math.random() * 3400))
  }
  scheduleShimmer()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    air.stop()
  }
}
