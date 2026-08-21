// Blade Runner 2049's own room recipe: "deep slow drone swells + rain noise
// wash" per the brief. A very low bed, a filtered rain-noise wash sitting
// under it permanently, and long, slow reversed-tape swells that only ever
// rise and fall — no percussive element at all, this room has no beat, only
// weather.
import { drone, noiseWash, swellReverse } from './kit.js'

// contract: (ctx, master, clock) -> stop()
export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [27.5, 41.2], detuneCents: 6, gain: 0.05, cutoff: 180 })
  const rain = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.08, gain: 0.05, cutoff: 1400 })

  let stopped = false
  const timers = []
  function scheduleSwell() {
    if (stopped) return
    const wait = 20000 + Math.random() * 24000
    timers.push(setTimeout(() => {
      if (stopped) return
      // long and low — the score's own register for this room, never a note
      swellReverse(ctx, master, { freq: 36 + Math.random() * 18, dur: 4.5 + Math.random() * 2.5, gain: 0.16 })
      scheduleSwell()
    }, wait))
  }
  scheduleSwell()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    bed.stop()
    rain.stop()
  }
}
