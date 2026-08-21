// Memento's own room recipe. Quiet, unresolved, never a melody — the brief's
// own words for it. A low detuned drone under the room the whole time,
// sparse plucks landing at random (never on a beat, the room has no beat to
// give them), and an occasional reversed-tape swell, rare enough that most
// visits only hear it once or twice.
import { drone, pluck, swellReverse } from './kit.js'

// contract: (ctx, master, clock) -> stop()
export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [41.2, 61.8], detuneCents: 5, gain: 0.032, cutoff: 260 })

  let stopped = false
  const timers = []

  function schedulePluck() {
    if (stopped) return
    const wait = 4200 + Math.random() * 7000
    timers.push(setTimeout(() => {
      if (stopped) return
      // a bare, slightly detuned register — never a run, never two notes
      // close enough together to read as a phrase
      const notes = [220, 246.9, 277.2, 329.6]
      const f = notes[Math.floor(Math.random() * notes.length)]
      pluck(ctx, master, { freq: f, gain: 0.1, decay: 2.2 + Math.random() * 1.4 })
      schedulePluck()
    }, wait))
  }

  function scheduleSwell() {
    if (stopped) return
    const wait = 26000 + Math.random() * 34000
    timers.push(setTimeout(() => {
      if (stopped) return
      swellReverse(ctx, master, { freq: 90 + Math.random() * 40, dur: 2.4 + Math.random(), gain: 0.09 })
      scheduleSwell()
    }, wait))
  }

  schedulePluck()
  scheduleSwell()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    bed.stop()
  }
}
