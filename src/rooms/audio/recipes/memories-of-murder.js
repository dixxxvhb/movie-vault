// Memories of Murder's own room recipe — the field in daylight: wind in the
// rice (a soft brown-noise bed), a thin open drone, and a far chime every so
// often that does not resolve anything.
import { drone, noiseWash, chime } from './kit.js'

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [110, 164.8], detuneCents: 5, gain: 0.015, cutoff: 520 })
  const field = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.07, gain: 0.015, cutoff: 1100 })

  let stopped = false
  let timer = null
  function scheduleChime() {
    if (stopped) return
    timer = setTimeout(() => {
      if (stopped) return
      chime(ctx, master, { freqs: [523.3, 784, 1046.5], gain: 0.03, decay: 4 })
      scheduleChime()
    }, 9000 + Math.random() * 6000)
  }
  scheduleChime()

  return function stop() {
    stopped = true
    clearTimeout(timer)
    bed.stop()
    field.stop()
  }
}
