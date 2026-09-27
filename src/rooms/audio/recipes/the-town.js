// The Town's own room recipe — the street after the job: a low sub drone and
// a doubled low knock like a pulse in the ears, steady, a little too fast.
import { drone, pluck } from './kit.js'

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [41.2], detuneCents: 4, gain: 0.03, cutoff: 220 })

  let stopped = false
  let timer = null
  let secondTimer = null
  function beat() {
    if (stopped) return
    pluck(ctx, master, { freq: 90, gain: 0.07, decay: 0.25 })
    secondTimer = setTimeout(() => { if (!stopped) pluck(ctx, master, { freq: 84, gain: 0.05, decay: 0.25 }) }, 180)
    timer = setTimeout(beat, 1100)
  }
  timer = setTimeout(beat, 800)

  return function stop() {
    stopped = true
    clearTimeout(timer)
    clearTimeout(secondTimer)
    bed.stop()
  }
}
