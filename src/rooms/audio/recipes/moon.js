// Moon's own room recipe — minimal base-interior hum, plus a pluck that
// always answers itself half a second later: the room's own doubling
// motif (exactly TWO of everything), the same beat Wave T's pairId nudge
// uses visually for the two lamps.
import { noiseWash, pluck } from './kit.js'

export function start(ctx, master) {
  const bed = noiseWash(ctx, master, { color: 'white', lfoRate: 0.03, gain: 0.014, cutoff: 1100 })

  let stopped = false
  const timers = []
  function scheduleEcho() {
    if (stopped) return
    timers.push(setTimeout(() => {
      if (stopped) return
      const f = 440
      pluck(ctx, master, { freq: f, gain: 0.05, decay: 0.6 })
      timers.push(setTimeout(() => { if (!stopped) pluck(ctx, master, { freq: f, gain: 0.05, decay: 0.6 }) }, 500))
      scheduleEcho()
    }, 5200 + Math.random() * 5200))
  }
  scheduleEcho()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    bed.stop()
  }
}
