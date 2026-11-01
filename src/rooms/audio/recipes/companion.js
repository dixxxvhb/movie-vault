// Companion's own room recipe — the lake house at night: water lapping soft
// under the deck, crickets out on the shore, and inside a clean synthetic
// tone held a little too perfectly, the way a made thing would hold it.
import { drone, noiseWash, chime } from './kit.js'

export function start(ctx, master) {
  const lake = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.18, gain: 0.026, cutoff: 480 })
  const tone = drone(ctx, master, { freqs: [329.6, 493.9], detuneCents: 0.5, gain: 0.006, cutoff: 1400 })
  let stopped = false
  const timers = []
  function later(fn, ms) { timers.push(setTimeout(() => { if (!stopped) fn() }, ms)) }

  function cricket() {
    const f = 4200 + Math.random() * 500
    for (let i = 0; i < 3; i++) later(() => chime(ctx, master, { freqs: [f], gain: 0.005, decay: 0.03 }), i * 70)
    later(cricket, 700 + Math.random() * 1600)
  }
  later(cricket, 1200)

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    lake.stop()
    tone.stop()
  }
}
