// Operation Finale's own room recipe — the safehouse: a two-note pizzicato
// ostinato a half-step apart that keeps stopping and starting, over a
// barely-there low drone. Tension held, never released.
import { drone, pluck } from './kit.js'

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [36.7], detuneCents: 3, gain: 0.02, cutoff: 200 })

  let stopped = false
  let timer = null
  let i = 0
  function step() {
    if (stopped) return
    pluck(ctx, master, { freq: i % 2 ? 311.1 : 293.7, gain: 0.04, decay: 0.35 })
    i++
    // eight notes, then a silence long enough to make you wait for the ninth
    timer = setTimeout(step, i % 8 === 0 ? 5000 + Math.random() * 3000 : 420)
  }
  timer = setTimeout(step, 1200)

  return function stop() {
    stopped = true
    clearTimeout(timer)
    bed.stop()
  }
}
