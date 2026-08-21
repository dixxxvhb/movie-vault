// Pressure (2026)'s own room recipe — mostly the room's own RainField
// system doing the talking: a very quiet map-room hum under an even
// quieter rain-adjacent noise bed, near-silent by design ("a weather
// report, and proud of it").
import { drone, noiseWash } from './kit.js'

export function start(ctx, master) {
  const hum = drone(ctx, master, { freqs: [65.4], detuneCents: 3, gain: 0.018, cutoff: 260 })
  const rain = noiseWash(ctx, master, { color: 'white', lfoRate: 0.15, gain: 0.02, cutoff: 3400 })

  return function stop() {
    hum.stop()
    rain.stop()
  }
}
