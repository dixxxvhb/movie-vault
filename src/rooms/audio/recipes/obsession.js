// Obsession (2026)'s own room recipe — cartoon-dread under the wishing
// willow: a slightly-off, playful chime that lands a hair flat, register
// only, never a jingle.
import { chime } from './kit.js'

export function start(ctx, master) {
  let stopped = false
  const timers = []
  function scheduleWish() {
    if (stopped) return
    timers.push(setTimeout(() => {
      if (stopped) return
      chime(ctx, master, { freqs: [523.3, 620, 987], gain: 0.055, decay: 2.2 })
      scheduleWish()
    }, 4200 + Math.random() * 4800))
  }
  scheduleWish()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
  }
}
