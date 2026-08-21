// The Dark Knight's own room recipe (Tier 2 audio pass) — the interrogation
// room's own half-order/half-entropy split, in register only: a steady, low
// controlled drone for the ordered side answered by irregular flicker-ticks
// (the entropic side's own texture) landing at random, never on a clean
// pulse. No quoted cue, register and rhythm homage only.
import { drone, pluck } from './kit.js'

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [55, 82.4], detuneCents: 3, gain: 0.035, cutoff: 320 })

  let stopped = false
  const timers = []
  function scheduleFlicker() {
    if (stopped) return
    const wait = 1800 + Math.random() * 5200
    timers.push(setTimeout(() => {
      if (stopped) return
      pluck(ctx, master, { freq: 1400 + Math.random() * 1800, gain: 0.05, decay: 0.12 })
      scheduleFlicker()
    }, wait))
  }
  scheduleFlicker()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    bed.stop()
  }
}
