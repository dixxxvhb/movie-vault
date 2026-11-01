// Requiem for a Dream's own room recipe — Sara's apartment: the fridge hum
// that slowly swells until it is the loudest thing in the room and then
// settles back, and under it the TV murmuring, a wash breathing at the rate
// of talk, with a far-off studio bell now and then. All synthesized.
import { drone, noiseWash, chime } from './kit.js'

export function start(ctx, master) {
  const fridge = drone(ctx, master, { freqs: [55, 110, 165], detuneCents: 4, gain: 0.012, cutoff: 320 })
  const tv = noiseWash(ctx, master, { color: 'white', lfoRate: 3.4, gain: 0.006, cutoff: 900 })
  const tvBody = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.7, gain: 0.012, cutoff: 1400 })
  let stopped = false
  const timers = []
  function later(fn, ms) { timers.push(setTimeout(() => { if (!stopped) fn() }, ms)) }

  // the swell: about twenty seconds up, then back down
  function swell() {
    const g = fridge.node.gain
    g.setTargetAtTime(0.05, ctx.currentTime, 7)
    later(() => g.setTargetAtTime(0.012, ctx.currentTime, 3), 22000)
    later(swell, 40000 + Math.random() * 15000)
  }
  function sting() {
    chime(ctx, master, { freqs: [880, 1108, 1320], gain: 0.008, decay: 0.8 })
    later(sting, 17000 + Math.random() * 14000)
  }
  later(swell, 6000)
  later(sting, 9000)

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    fridge.stop()
    tv.stop()
    tvBody.stop()
  }
}
