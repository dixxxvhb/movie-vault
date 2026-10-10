// Frailty's own room recipe — the cellar under the rose garden: a damp, dead
// room tone, a bare bulb's filament buzz, and once in a long while a single
// dull blow from above, like a spade going into the dirt.
import { drone, noiseWash, pluck } from './kit.js'

export function start(ctx, master) {
  const bulb = drone(ctx, master, { freqs: [120], detuneCents: 1, gain: 0.008, cutoff: 500 })
  const damp = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.025, gain: 0.03, cutoff: 260 })
  let stopped = false
  let timer = null
  function spade() {
    if (stopped) return
    timer = setTimeout(() => {
      if (stopped) return
      pluck(ctx, master, { freq: 62, gain: 0.07, decay: 0.5 })
      spade()
    }, 14000 + Math.random() * 14000)
  }
  spade()
  return function stop() {
    stopped = true
    clearTimeout(timer)
    bulb.stop()
    damp.stop()
  }
}
