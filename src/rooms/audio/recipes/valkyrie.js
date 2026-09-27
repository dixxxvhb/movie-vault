// Valkyrie's own room recipe — the map room: a low brass-register drone and a
// small dry tick once a second (the pencil fuse), steady, under everything.
import { drone, pluck } from './kit.js'

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [43.65, 65.4], detuneCents: 4, gain: 0.034, cutoff: 380 })

  let stopped = false
  let timer = null
  function tick() {
    if (stopped) return
    pluck(ctx, master, { freq: 2000, gain: 0.02, decay: 0.05 })
    timer = setTimeout(tick, 1000)
  }
  timer = setTimeout(tick, 1000)

  return function stop() {
    stopped = true
    clearTimeout(timer)
    bed.stop()
  }
}
