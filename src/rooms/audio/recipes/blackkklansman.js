// BlacKkKlansman's own room recipe — the intelligence office at Colorado
// Springs PD, late 70s: fluorescent hum over office air, and now and then the
// rotary phone on Ron's desk rings, two bursts of a bell, and stops.
import { drone, noiseWash, chime } from './kit.js'

export function start(ctx, master) {
  const tubes = drone(ctx, master, { freqs: [120, 240], detuneCents: 2, gain: 0.008, cutoff: 700 })
  const air = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.05, gain: 0.024, cutoff: 600 })
  let stopped = false
  const timers = []
  function later(fn, ms) { timers.push(setTimeout(() => { if (!stopped) fn() }, ms)) }

  // one ring: the clapper hammering two bells for about a second and a half
  function burst(at) {
    for (let i = 0; i < 28; i++) {
      later(() => chime(ctx, master, { freqs: [i % 2 ? 1040 : 1280, 2350], gain: 0.012, decay: 0.09 }), at + i * 50)
    }
  }
  function ring() {
    burst(0)
    burst(3400)
    later(ring, 26000 + Math.random() * 20000)
  }
  later(ring, 7000)

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    tubes.stop()
    air.stop()
  }
}
