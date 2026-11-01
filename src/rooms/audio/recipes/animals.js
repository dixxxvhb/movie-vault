// Animals' own room recipe — the campaign office at night: the city low
// through the glass, a far-off rise of something like a siren now and then,
// and a wall clock ticking off the hours nobody is calling.
import { drone, noiseWash, pluck, swellReverse } from './kit.js'

export function start(ctx, master) {
  const city = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.04, gain: 0.03, cutoff: 380 })
  const hvac = drone(ctx, master, { freqs: [98], detuneCents: 3, gain: 0.006, cutoff: 400 })
  let stopped = false
  const timers = []
  function later(fn, ms) { timers.push(setTimeout(() => { if (!stopped) fn() }, ms)) }

  function tick() {
    pluck(ctx, master, { freq: 2600, gain: 0.025, decay: 0.05 })
    later(tick, 1000)
  }
  function siren() {
    swellReverse(ctx, master, { freq: 740, dur: 3.2, gain: 0.008 })
    later(siren, 30000 + Math.random() * 25000)
  }
  later(tick, 500)
  later(siren, 14000)

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    city.stop()
    hvac.stop()
  }
}
