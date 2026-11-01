// Heat's own room recipe — the coffee shop booth at night: the diner's hum
// and murmur, a cup set down now and then, and under all of it a low cold
// synth bed, two notes held a long time.
import { drone, noiseWash, chime } from './kit.js'

export function start(ctx, master) {
  const hum = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.08, gain: 0.022, cutoff: 700 })
  const bed = drone(ctx, master, { freqs: [55, 82.4], detuneCents: 7, gain: 0.018, cutoff: 300 })
  const high = drone(ctx, master, { freqs: [659.3], detuneCents: 3, gain: 0.003, cutoff: 1200 })
  let stopped = false
  const timers = []
  function later(fn, ms) { timers.push(setTimeout(() => { if (!stopped) fn() }, ms)) }

  function cup() {
    chime(ctx, master, { freqs: [2400, 3600], gain: 0.008, decay: 0.12 })
    later(cup, 9000 + Math.random() * 14000)
  }
  later(cup, 4000)

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    hum.stop()
    bed.stop()
    high.stop()
  }
}
