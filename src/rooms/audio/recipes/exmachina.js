// Ex Machina's own room recipe — a cold, minimal research-facility hum with
// a rare hard swell standing in for the scheduled power-cut, register only.
import { noiseWash, swellReverse } from './kit.js'

export function start(ctx, master) {
  const bed = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.02, gain: 0.02, cutoff: 500 })

  let stopped = false
  const timers = []
  function scheduleCut() {
    if (stopped) return
    timers.push(setTimeout(() => {
      if (stopped) return
      swellReverse(ctx, master, { freq: 300, dur: 0.5, gain: 0.08 })
      scheduleCut()
    }, 24000 + Math.random() * 6000))
  }
  scheduleCut()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    bed.stop()
  }
}
