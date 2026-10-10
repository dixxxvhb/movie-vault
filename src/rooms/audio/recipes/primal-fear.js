// Primal Fear's own room recipe — the courtroom between sessions: a big
// room's air handling, a gavel knock that comes rarely, and a pair of low
// plucks a fifth apart that never agree on which one is the voice.
import { drone, noiseWash, pluck } from './kit.js'

export function start(ctx, master) {
  const air = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.03, gain: 0.022, cutoff: 600 })
  const bed = drone(ctx, master, { freqs: [65.4], detuneCents: 3, gain: 0.014, cutoff: 300 })
  let stopped = false
  const timers = []
  function later(fn, ms) { timers.push(setTimeout(() => { if (!stopped) fn() }, ms)) }
  let flip = false
  function two() {
    flip = !flip
    pluck(ctx, master, { freq: flip ? 196 : 293.7, gain: 0.04, decay: 1.6 })
    later(two, 4200 + Math.random() * 2400)
  }
  function gavel() {
    pluck(ctx, master, { freq: 180, gain: 0.08, decay: 0.15 })
    later(() => pluck(ctx, master, { freq: 180, gain: 0.06, decay: 0.15 }), 260)
    later(gavel, 30000 + Math.random() * 15000)
  }
  later(two, 2000)
  later(gavel, 12000)
  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    air.stop()
    bed.stop()
  }
}
