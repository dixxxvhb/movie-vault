// Gone Baby Gone's own room recipe — Helene's apartment after: a TV left on
// low in another register (a thin mains hum and hiss), the street through a
// cheap window, and nothing else. The room is the silence at the end.
import { drone, noiseWash } from './kit.js'

export function start(ctx, master) {
  const tv = drone(ctx, master, { freqs: [60, 120], detuneCents: 1, gain: 0.01, cutoff: 600 })
  const hiss = noiseWash(ctx, master, { color: 'white', lfoRate: 0.02, gain: 0.008, cutoff: 3200 })
  const street = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.05, gain: 0.025, cutoff: 500 })
  return function stop() {
    tv.stop()
    hiss.stop()
    street.stop()
  }
}
