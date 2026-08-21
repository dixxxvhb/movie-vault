// The Matrix's own room recipe. "Tense percussive pulse + airy pad,
// original" per the brief — a high, thin pad (drone with a bright cutoff
// rather than the usual low murk) under a sparse, irregular tick that never
// locks into a beat grid (this room has no clock to give it one; the
// pulses land on their own uneven schedule, same discipline memento.js
// uses for its plucks).
import { drone, noiseWash, pluck } from './kit.js'

// contract: (ctx, master, clock) -> stop()
export function start(ctx, master) {
  // the pad: airy, high-cutoff, faint — never a chord, just held air
  const pad = drone(ctx, master, { freqs: [110, 164.8], detuneCents: 4, gain: 0.03, cutoff: 1400 })
  const air = noiseWash(ctx, master, { color: 'white', lfoRate: 0.045, gain: 0.012, cutoff: 2600 })

  let stopped = false
  const timers = []

  // the percussive pulse: a tight, high, metallic tick — never a kit, never
  // a beat, just tension landing on its own irregular schedule
  function schedulePulse() {
    if (stopped) return
    const wait = 900 + Math.random() * 2600
    timers.push(setTimeout(() => {
      if (stopped) return
      pluck(ctx, master, { freq: 620 + Math.random() * 380, gain: 0.09, decay: 0.22 + Math.random() * 0.18 })
      // an occasional twinned tick, close behind the first — the "bullet
      // clearing a shell casing" rhythm rather than a single hit
      if (Math.random() > 0.55) {
        timers.push(setTimeout(() => {
          if (!stopped) pluck(ctx, master, { freq: 480 + Math.random() * 260, gain: 0.06, decay: 0.16 })
        }, 90 + Math.random() * 60))
      }
      schedulePulse()
    }, wait))
  }
  schedulePulse()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    pad.stop()
    air.stop()
  }
}
