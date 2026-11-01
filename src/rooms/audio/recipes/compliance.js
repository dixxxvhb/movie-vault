// Compliance's own room recipe — the back office: the fryer hissing through
// the kitchen doorway, the phone line's thin hum held open the whole time,
// and the occasional click on the line, like someone shifting the handset.
import { drone, noiseWash, pluck } from './kit.js'

export function start(ctx, master) {
  const fryer = noiseWash(ctx, master, { color: 'white', lfoRate: 0.12, gain: 0.01, cutoff: 5200 })
  const kitchen = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.05, gain: 0.018, cutoff: 500 })
  const line = drone(ctx, master, { freqs: [60, 180], detuneCents: 1, gain: 0.007, cutoff: 600 })
  let stopped = false
  let timer = null
  function click() {
    if (stopped) return
    timer = setTimeout(() => {
      if (stopped) return
      pluck(ctx, master, { freq: 1800, gain: 0.03, decay: 0.03 })
      click()
    }, 8000 + Math.random() * 12000)
  }
  click()
  return function stop() {
    stopped = true
    clearTimeout(timer)
    fryer.stop()
    kitchen.stop()
    line.stop()
  }
}
