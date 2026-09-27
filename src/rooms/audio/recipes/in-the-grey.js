// In the Grey's own room recipe — a swaggering mid-tempo break under a low
// drone, Ritchie-register momentum, no quoted cue.
import { drone, beatKit } from './kit.js'

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [49], detuneCents: 5, gain: 0.02, cutoff: 280 })
  const beat = beatKit(ctx, master, { bpm: 104, gain: 0.06 })

  return function stop() {
    beat.stop()
    bed.stop()
  }
}
