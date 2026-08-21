// Hereditary's own room recipe — the brief's own register call: sparse low
// dread under a rare, isolated high tick, nothing between them, the room
// never apologizing for the silence.
import { drone, pluck } from './kit.js'

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [36.7], detuneCents: 3, gain: 0.02, cutoff: 180 })

  let stopped = false
  const timers = []
  function scheduleTick() {
    if (stopped) return
    timers.push(setTimeout(() => {
      if (stopped) return
      pluck(ctx, master, { freq: 2200, gain: 0.028, decay: 0.3 })
      scheduleTick()
    }, 14000 + Math.random() * 16000))
  }
  scheduleTick()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    bed.stop()
  }
}
