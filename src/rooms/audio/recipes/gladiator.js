// Gladiator's own room recipe — the arena: a wide low open-fifth drone, a far
// brown-noise crowd bed breathing slowly, and a rare swell rising out of it
// (the crowd turning), never a quoted theme.
import { drone, noiseWash, swellReverse } from './kit.js'

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [55, 82.4, 110], detuneCents: 6, gain: 0.034, cutoff: 500 })
  const crowd = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.03, gain: 0.016, cutoff: 700 })

  let stopped = false
  let timer = null
  function scheduleSwell() {
    if (stopped) return
    timer = setTimeout(() => {
      if (stopped) return
      swellReverse(ctx, master, { freq: 110, dur: 3, gain: 0.06 })
      scheduleSwell()
    }, 20000 + Math.random() * 10000)
  }
  scheduleSwell()

  return function stop() {
    stopped = true
    clearTimeout(timer)
    bed.stop()
    crowd.stop()
  }
}
