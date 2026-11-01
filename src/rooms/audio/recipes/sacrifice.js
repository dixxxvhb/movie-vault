// Sacrifice's own room recipe — the gala on the island: applause swelling up
// out of nothing, holding, thinning out, and as it goes, a low rumble from
// under the floor that hangs on after the room has gone quiet.
import { drone, noiseWash, pluck } from './kit.js'

export function start(ctx, master) {
  const room = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.06, gain: 0.016, cutoff: 500 })
  const rumble = drone(ctx, master, { freqs: [31, 46.5], detuneCents: 9, gain: 0.004, cutoff: 120 })
  let stopped = false
  const timers = []
  function later(fn, ms) { timers.push(setTimeout(() => { if (!stopped) fn() }, ms)) }

  // applause: a cloud of short claps, dense in the middle, thin at the ends
  function applause() {
    const len = 6000
    for (let t = 0; t < len; t += 22) {
      const shape = Math.sin((t / len) * Math.PI)
      if (Math.random() < shape) {
        later(() => pluck(ctx, master, { freq: 1600 + Math.random() * 2400, gain: 0.012 * shape + 0.003, decay: 0.04 }), t + Math.random() * 20)
      }
    }
    const g = rumble.node.gain
    later(() => g.setTargetAtTime(0.03, ctx.currentTime, 2.5), len * 0.6)
    later(() => g.setTargetAtTime(0.004, ctx.currentTime, 4), len + 9000)
    later(applause, 34000 + Math.random() * 14000)
  }
  later(applause, 3000)

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    room.stop()
    rumble.stop()
  }
}
