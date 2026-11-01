// The Whisper Man's own room recipe — the boy's bedroom at night: wind at
// the window where it is open a crack, a faint breathy tone under it that
// rises and falls like someone close by, and the old house settling.
import { noiseWash, drone, pluck } from './kit.js'

export function start(ctx, master) {
  const wind = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.09, gain: 0.03, cutoff: 700 })
  const gap = drone(ctx, master, { freqs: [880], detuneCents: 12, gain: 0.002, cutoff: 1400 })
  const breath = noiseWash(ctx, master, { color: 'white', lfoRate: 0.25, gain: 0.003, cutoff: 2400 })
  let stopped = false
  let timer = null
  function creak() {
    if (stopped) return
    timer = setTimeout(() => {
      if (stopped) return
      pluck(ctx, master, { freq: 140 + Math.random() * 60, gain: 0.03, decay: 0.6 })
      creak()
    }, 16000 + Math.random() * 16000)
  }
  creak()
  return function stop() {
    stopped = true
    clearTimeout(timer)
    wind.stop()
    gap.stop()
    breath.stop()
  }
}
