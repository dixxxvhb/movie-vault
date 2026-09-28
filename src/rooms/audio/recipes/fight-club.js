// Fight Club's own room recipe — the basement: a dirty, wide-detuned sub
// drone and a loose synthesized break underneath it, register and rhythm
// homage to the score's electronic pulse, no quoted loop.
import { drone, beatKit } from './kit.js'

export function start(ctx, master) {
  const grime = drone(ctx, master, { freqs: [49], detuneCents: 12, gain: 0.03, cutoff: 300 })
  const beat = beatKit(ctx, master, { bpm: 92, gain: 0.06 })

  return function stop() {
    beat.stop()
    grime.stop()
  }
}
