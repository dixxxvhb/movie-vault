// Coherence's own room recipe — an uneasy detuned shimmer: two close drones
// fighting slightly out of tune with each other, never resolving, plus a
// rare paired stutter-pluck standing in for the timeline glitching.
import { drone, pluck } from './kit.js'

export function start(ctx, master) {
  const a = drone(ctx, master, { freqs: [196], detuneCents: 14, gain: 0.03, cutoff: 700 })
  const b = drone(ctx, master, { freqs: [201], detuneCents: 10, gain: 0.026, cutoff: 620 })

  let stopped = false
  const timers = []
  function scheduleStutter() {
    if (stopped) return
    timers.push(setTimeout(() => {
      if (stopped) return
      const f = 380 + Math.random() * 40
      pluck(ctx, master, { freq: f, gain: 0.05, decay: 0.15 })
      pluck(ctx, master, { freq: f * 1.01, gain: 0.05, decay: 0.15 })
      scheduleStutter()
    }, 3400 + Math.random() * 4200))
  }
  scheduleStutter()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    a.stop(); b.stop()
  }
}
