// The Game's own room recipe — deliberately staged: a plain, faintly
// artificial tick landing at an unnaturally exact interval (a real room
// never sounds this regular), the sonic equivalent of the visible seams
// and price tags — "predictable by design."
import { pluck } from './kit.js'

export function start(ctx, master) {
  let stopped = false
  const timers = []
  function tick() {
    if (stopped) return
    pluck(ctx, master, { freq: 660, gain: 0.045, decay: 0.2 })
    timers.push(setTimeout(tick, 4000)) // exact, never varied — that's the joke
  }
  timers.push(setTimeout(tick, 2000))

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
  }
}
