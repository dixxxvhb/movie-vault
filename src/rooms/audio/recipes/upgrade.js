// Upgrade's own room recipe — the hospital bed he dreamed: a clean ventilator
// hush, the heart monitor's steady blip, and under it a faint digital hum
// that never quite goes away, STEM still in there.
import { drone, noiseWash, chime } from './kit.js'

export function start(ctx, master) {
  const stem = drone(ctx, master, { freqs: [92.5, 185.2], detuneCents: 2, gain: 0.012, cutoff: 900 })
  const vent = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.22, gain: 0.018, cutoff: 1200 })
  let stopped = false
  let timer = null
  function blip() {
    if (stopped) return
    chime(ctx, master, { freqs: [988], gain: 0.03, decay: 0.12 })
    timer = setTimeout(blip, 1000)
  }
  timer = setTimeout(blip, 700)
  return function stop() {
    stopped = true
    clearTimeout(timer)
    stem.stop()
    vent.stop()
  }
}
