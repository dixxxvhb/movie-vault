// Poor Things' own room recipe — the Lisbon terrace's storybook brightness:
// a light, curious arpeggio of plucks in a bright register, never
// resolving into a phrase, evoking the film's playful score's mood without
// quoting it.
import { pluck } from './kit.js'

const NOTES = [523.3, 587.3, 659.3, 784.0, 880.0]

export function start(ctx, master) {
  let stopped = false
  const timers = []
  function scheduleNote() {
    if (stopped) return
    const wait = 900 + Math.random() * 1800
    timers.push(setTimeout(() => {
      if (stopped) return
      const f = NOTES[Math.floor(Math.random() * NOTES.length)]
      pluck(ctx, master, { freq: f, gain: 0.06, decay: 1.1 + Math.random() * 0.6 })
      scheduleNote()
    }, wait))
  }
  scheduleNote()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
  }
}
