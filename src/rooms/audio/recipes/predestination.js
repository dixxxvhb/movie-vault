// Predestination's own room recipe: warm room hum + a soft clock-tick figure
// that loops with no downbeat — a rhythm you can't find the "one" in, which
// is the whole point of a room built around a loop with no start.
import { drone, pluck } from './kit.js'

// contract: (ctx, master, clock) -> stop()
export function start(ctx, master) {
  const hum = drone(ctx, master, { freqs: [49, 73.4], detuneCents: 4, gain: 0.05, cutoff: 320 })

  let stopped = false
  const timers = []
  // an irregular tick pattern (not a steady meter) so no beat ever reads as
  // "one" — five slightly uneven gaps that repeat, rather than a clean loop
  const gaps = [640, 610, 700, 580, 660]
  let i = 0
  function tick() {
    if (stopped) return
    pluck(ctx, master, { freq: 1800, gain: 0.05, decay: 0.12 })
    timers.push(setTimeout(tick, gaps[i % gaps.length]))
    i++
  }
  tick()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    hum.stop()
  }
}
