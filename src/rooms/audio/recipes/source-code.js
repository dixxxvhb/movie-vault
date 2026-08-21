// Source Code's own room recipe — warm commuter-car sustain under a timed
// reset swell (the room's own ResetFlash period), the loop snapping back
// exactly like the room's own visual reset.
import { drone, swellReverse } from './kit.js'

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [82.4, 123.5], detuneCents: 4, gain: 0.03, cutoff: 500 })

  let stopped = false
  const timers = []
  function cycle() {
    if (stopped) return
    timers.push(setTimeout(() => {
      if (stopped) return
      swellReverse(ctx, master, { freq: 180, dur: 0.4, gain: 0.09 })
      cycle()
    }, 45000))
  }
  cycle()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    bed.stop()
  }
}
