// Annihilation's own room recipe — the Shimmer's beauty at deliberately low
// emotional volume, per his own dock: a very quiet detuned shimmer, softer
// than Coherence's uneasy version, resolving nowhere.
import { drone, chime } from './kit.js'

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [220, 233], detuneCents: 8, gain: 0.02, cutoff: 900 })

  let stopped = false
  const timers = []
  function scheduleGlint() {
    if (stopped) return
    timers.push(setTimeout(() => {
      if (stopped) return
      chime(ctx, master, { freqs: [1318, 1568], gain: 0.025, decay: 2.6 })
      scheduleGlint()
    }, 9000 + Math.random() * 9000))
  }
  scheduleGlint()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    bed.stop()
  }
}
