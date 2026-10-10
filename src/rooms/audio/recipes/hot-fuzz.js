// Hot Fuzz's own room recipe — Sandford on a summer morning: birdsong over a
// warm village bed, a church bell now and then, and every so often a quick
// whip of sound, the cut that turns filling in a form into an action scene.
import { drone, chime, swellReverse } from './kit.js'

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [110, 164.8], detuneCents: 4, gain: 0.014, cutoff: 700 })
  let stopped = false
  const timers = []
  function later(fn, ms) { timers.push(setTimeout(() => { if (!stopped) fn() }, ms)) }

  function bird() {
    const f = 2600 + Math.random() * 1400
    chime(ctx, master, { freqs: [f, f * 1.12], gain: 0.012, decay: 0.18 })
    later(bird, 900 + Math.random() * 2600)
  }
  function bell() {
    chime(ctx, master, { freqs: [392, 784, 1176], gain: 0.04, decay: 4 })
    later(bell, 26000 + Math.random() * 14000)
  }
  function whip() {
    swellReverse(ctx, master, { freq: 880, dur: 0.35, gain: 0.05 })
    later(whip, 18000 + Math.random() * 12000)
  }
  later(bird, 600)
  later(bell, 5000)
  later(whip, 9000)

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    bed.stop()
  }
}
