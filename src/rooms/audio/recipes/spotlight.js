// Spotlight's own room recipe — the office, not the score: a 60 Hz
// fluorescent-ballast hum under a sparse, patient piano-register figure
// (plucks on a slow minor shape, long rests), the sound of reading.
import { drone, pluck } from './kit.js'

const FIGURE = [220, 261.6, 196, 174.6]

export function start(ctx, master) {
  const ballast = drone(ctx, master, { freqs: [60, 120], detuneCents: 1, gain: 0.012, cutoff: 400 })

  let stopped = false
  let timer = null
  let i = 0
  function step() {
    if (stopped) return
    pluck(ctx, master, { freq: FIGURE[i % FIGURE.length], gain: 0.045, decay: 1.8 })
    i++
    // a phrase of four, then a long rest
    const wait = i % 4 === 0 ? 7000 + Math.random() * 4000 : 2200 + Math.random() * 400
    timer = setTimeout(step, wait)
  }
  timer = setTimeout(step, 1800)

  return function stop() {
    stopped = true
    clearTimeout(timer)
    ballast.stop()
  }
}
