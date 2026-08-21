// Top Gun: Maverick's own room recipe — the canyon run: a rushing
// noiseWash standing in for wind past the cockpit, plus a rare low
// afterburner swell, register only.
import { noiseWash, swellReverse } from './kit.js'

export function start(ctx, master) {
  const wind = noiseWash(ctx, master, { color: 'white', lfoRate: 0.5, gain: 0.03, cutoff: 2200 })

  let stopped = false
  const timers = []
  function scheduleBurn() {
    if (stopped) return
    timers.push(setTimeout(() => {
      if (stopped) return
      swellReverse(ctx, master, { freq: 60, dur: 1.8, gain: 0.11 })
      scheduleBurn()
    }, 15000 + Math.random() * 10000))
  }
  scheduleBurn()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    wind.stop()
  }
}
