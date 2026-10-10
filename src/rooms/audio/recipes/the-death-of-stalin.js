// The Death of Stalin's own room recipe — the dacha study, the night of the
// stroke: a record that has run out and is ticking in the run-out groove, a
// grandfather-clock knock, and a cold room tone. Nobody is coming in.
import { drone, noiseWash, pluck } from './kit.js'

export function start(ctx, master) {
  const room = drone(ctx, master, { freqs: [55, 82.4], detuneCents: 3, gain: 0.018, cutoff: 280 })
  const crackle = noiseWash(ctx, master, { color: 'white', lfoRate: 0.5, gain: 0.006, cutoff: 2400 })
  let stopped = false
  let groove = null, clock = null
  function runout() {
    if (stopped) return
    pluck(ctx, master, { freq: 140, gain: 0.025, decay: 0.08 })
    groove = setTimeout(runout, 1800) // 33 1/3 rpm
  }
  function knock() {
    if (stopped) return
    pluck(ctx, master, { freq: 320, gain: 0.03, decay: 0.3 })
    clock = setTimeout(knock, 2000)
  }
  groove = setTimeout(runout, 500)
  clock = setTimeout(knock, 1300)
  return function stop() {
    stopped = true
    clearTimeout(groove)
    clearTimeout(clock)
    room.stop()
    crackle.stop()
  }
}
