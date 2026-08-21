// Triangle's own room recipe — the fog-locked deck: a low maritime drone
// under a rare high gull-ish chime, both sparse enough to feel like the
// same moment repeating rather than progressing (the Sally pile's own
// accumulation logic, in audio).
import { drone, chime } from './kit.js'

export function start(ctx, master) {
  const sea = drone(ctx, master, { freqs: [55, 61.8], detuneCents: 6, gain: 0.03, cutoff: 300 })

  let stopped = false
  const timers = []
  function scheduleGull() {
    if (stopped) return
    timers.push(setTimeout(() => {
      if (stopped) return
      chime(ctx, master, { freqs: [1760, 2093], gain: 0.03, decay: 1.4 })
      scheduleGull()
    }, 7000 + Math.random() * 8000))
  }
  scheduleGull()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    sea.stop()
  }
}
