// Under the Silver Lake's own room recipe — a dreamy, slightly woozy pad
// under a soft irregular pulse, standing in for the film's own hazy
// conspiracy hum without touching its score.
import { drone, pluck } from './kit.js'

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [110, 164.8], detuneCents: 7, gain: 0.028, cutoff: 500 })

  let stopped = false
  const timers = []
  function schedulePulse() {
    if (stopped) return
    pluck(ctx, master, { freq: 330, gain: 0.04, decay: 0.5 })
    timers.push(setTimeout(schedulePulse, 2600 + Math.random() * 1800))
  }
  schedulePulse()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    bed.stop()
  }
}
