// Se7en's own room recipe — the desert at the end, in register only: a low,
// dry Shore-register drone under open-country wind, and a rare single low
// knock (the box) that lands out of nowhere and is not followed by anything.
import { drone, noiseWash, pluck } from './kit.js'

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [41.2, 61.7], detuneCents: 5, gain: 0.03, cutoff: 240 })
  const wind = noiseWash(ctx, master, { color: 'white', lfoRate: 0.04, gain: 0.022, cutoff: 1400 })

  let stopped = false
  let timer = null
  function scheduleKnock() {
    if (stopped) return
    timer = setTimeout(() => {
      if (stopped) return
      pluck(ctx, master, { freq: 70, gain: 0.06, decay: 1.2 })
      scheduleKnock()
    }, 16000 + Math.random() * 12000)
  }
  scheduleKnock()

  return function stop() {
    stopped = true
    clearTimeout(timer)
    bed.stop()
    wind.stop()
  }
}
