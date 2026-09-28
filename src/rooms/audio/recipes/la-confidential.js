// L.A. Confidential's own room recipe — the Nite Owl at 3am: a warm low pad
// (a jukebox you can barely hear from the counter) over a slow walked bass,
// original 1950s register, no quoted tune.
import { drone, pluck } from './kit.js'

const WALK = [65.4, 73.4, 77.8, 87.3, 98, 87.3, 77.8, 73.4]
const STEP_MS = 700

export function start(ctx, master) {
  const pad = drone(ctx, master, { freqs: [98, 146.8], detuneCents: 7, gain: 0.022, cutoff: 600 })

  let stopped = false
  let timer = null
  let i = 0
  function step() {
    if (stopped) return
    pluck(ctx, master, { freq: WALK[i % WALK.length], gain: 0.06, decay: 0.6 })
    i++
    timer = setTimeout(step, STEP_MS + (Math.random() * 50 - 25))
  }
  timer = setTimeout(step, 900)

  return function stop() {
    stopped = true
    clearTimeout(timer)
    pad.stop()
  }
}
