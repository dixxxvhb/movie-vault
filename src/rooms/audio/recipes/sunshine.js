// Sunshine's own room recipe — the brief's own register call: a warm
// sustained drone under a slow lowpass LFO "breathing" a noise bed's
// cutoff, the way the room's own dimming filter breathes light.
import { drone, noiseWash } from './kit.js'

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [49, 73.4], detuneCents: 4, gain: 0.035, cutoff: 600 })
  const breath = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.05, gain: 0.02, cutoff: 700 })

  return function stop() {
    bed.stop()
    breath.stop()
  }
}
