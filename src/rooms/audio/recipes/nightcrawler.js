// Nightcrawler's own room recipe: a distant city noise wash (the overlook's
// sodium-grid sprawl, heard rather than seen up close) plus a faint
// electrical hum — the guardrail lighting, a transformer somewhere behind
// you, the low-grade buzz of "this place has power but nobody's home."
import { noiseWash, drone } from './kit.js'

// contract: (ctx, master, clock) -> stop()
export function start(ctx, master) {
  const city = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.045, gain: 0.05, cutoff: 1400 })
  // the hum: a tight, barely-detuned pair right at mains-frequency register,
  // through a narrow-ish lowpass so it reads as electrical rather than tonal
  const hum = drone(ctx, master, { freqs: [60, 120], detuneCents: 2, gain: 0.02, cutoff: 260 })

  return function stop() {
    city.stop()
    hum.stop()
  }
}
