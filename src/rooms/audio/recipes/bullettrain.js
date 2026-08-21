// Bullet Train's own room recipe — bright momentum: kit.js's own beatKit at
// a brisk pop tempo, gain kept light so it reads bright rather than heavy,
// plus two alternating bell-ish ticks standing in for the car's two
// bickering light sources (lemon, tangerine), original pattern.
import { beatKit, chime } from './kit.js'

export function start(ctx, master) {
  const groove = beatKit(ctx, master, { bpm: 128, gain: 0.07 })

  let stopped = false
  const timers = []
  let toggle = 0
  function scheduleBicker() {
    if (stopped) return
    timers.push(setTimeout(() => {
      if (stopped) return
      chime(ctx, master, { freqs: toggle ? [880, 1320] : [740, 1108], gain: 0.045, decay: 0.9 })
      toggle = toggle ? 0 : 1
      scheduleBicker()
    }, 1900 + Math.random() * 1600))
  }
  scheduleBicker()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    groove.stop()
  }
}
