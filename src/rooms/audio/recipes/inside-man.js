// Inside Man's own room recipe — a cool jazz-brass register pad over a
// walking upright-bass line, slick and unhurried, original line.
import { drone, pluck } from './kit.js'

const WALK = [55, 61.7, 65.4, 73.4, 82.4, 73.4, 65.4, 61.7]
const STEP_MS = 520

export function start(ctx, master) {
  const pad = drone(ctx, master, { freqs: [55, 82.4, 103.8], detuneCents: 6, gain: 0.024, cutoff: 700 })

  let stopped = false
  let timer = null
  let i = 0
  function step() {
    if (stopped) return
    pluck(ctx, master, { freq: WALK[i % WALK.length], gain: 0.065, decay: 0.5 })
    i++
    timer = setTimeout(step, STEP_MS + (Math.random() * 40 - 20))
  }
  timer = setTimeout(step, 700)

  return function stop() {
    stopped = true
    clearTimeout(timer)
    pad.stop()
  }
}
