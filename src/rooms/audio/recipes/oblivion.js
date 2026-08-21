// Oblivion's own room recipe — the sky tower's clean minimalism: one pure,
// slightly detuned sustained tone, nothing else, Kosinski-slick and
// deliberately empty.
import { drone } from './kit.js'

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [196], detuneCents: 2, gain: 0.022, cutoff: 1400 })

  return function stop() {
    bed.stop()
  }
}
