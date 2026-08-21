// Enemy's own room recipe: "queasy detuned drone, close intervals" per the
// brief. A drone built with unusually wide detune (audible slow beating
// rather than a clean chorus) and a second voice sitting a close interval
// away (a minor second, not a fifth or a unison) so the two never quite
// agree with each other — the doubled-object wrongness, in sound.
import { drone, pluck } from './kit.js'

// contract: (ctx, master, clock) -> stop()
export function start(ctx, master) {
  // the base voice
  const bed = drone(ctx, master, { freqs: [55], detuneCents: 22, gain: 0.045, cutoff: 320 })
  // its double, a close interval up (minor second-ish, ~106 cents) —
  // present the whole time, never resolving, the doubled object's own drone
  const twin = drone(ctx, master, { freqs: [58.3], detuneCents: 18, gain: 0.032, cutoff: 300 })

  let stopped = false
  const timers = []
  // sparse, close-interval dyads — two plucks a beat apart, close together
  // in pitch, never a run
  function scheduleDyad() {
    if (stopped) return
    const wait = 6000 + Math.random() * 9000
    timers.push(setTimeout(() => {
      if (stopped) return
      const base = 196 + Math.random() * 80
      pluck(ctx, master, { freq: base, gain: 0.08, decay: 2.0 })
      timers.push(setTimeout(() => {
        if (!stopped) pluck(ctx, master, { freq: base * 1.06, gain: 0.07, decay: 1.8 })
      }, 260 + Math.random() * 180))
      scheduleDyad()
    }, wait))
  }
  scheduleDyad()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    bed.stop()
    twin.stop()
  }
}
