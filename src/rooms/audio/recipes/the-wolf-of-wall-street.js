// The Wolf of Wall Street's own room recipe — the Stratton Oakmont floor: a
// crowd roar bed that never drops, phones going off all over the room, and
// every so often the roar climbs into a cheer and settles back.
import { noiseWash, chime, swellReverse } from './kit.js'

export function start(ctx, master) {
  const roar = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.4, gain: 0.05, cutoff: 900 })
  const chatter = noiseWash(ctx, master, { color: 'white', lfoRate: 2.6, gain: 0.006, cutoff: 1600 })
  let stopped = false
  const timers = []
  function later(fn, ms) { timers.push(setTimeout(() => { if (!stopped) fn() }, ms)) }

  // a desk phone: a short electronic double trill
  function phone() {
    const f = 1400 + Math.random() * 500
    for (let i = 0; i < 6; i++) later(() => chime(ctx, master, { freqs: [i % 2 ? f : f * 1.26], gain: 0.008, decay: 0.07 }), i * 60)
    later(phone, 1500 + Math.random() * 3500)
  }
  function cheer() {
    swellReverse(ctx, master, { freq: 330, dur: 2.4, gain: 0.04 })
    const g = roar.node.gain
    g.setTargetAtTime(0.09, ctx.currentTime, 0.6)
    later(() => g.setTargetAtTime(0.05, ctx.currentTime, 2), 2600)
    later(cheer, 24000 + Math.random() * 16000)
  }
  later(phone, 800)
  later(cheer, 12000)

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    roar.stop()
    chatter.stop()
  }
}
