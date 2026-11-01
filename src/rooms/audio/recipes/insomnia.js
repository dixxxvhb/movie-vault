// Insomnia's own room recipe — the motel room in Nightmute at an hour that
// should be night: the little fridge humming, the clock on the nightstand
// ticking, and over both a thin high air that never quite goes dark.
import { drone, noiseWash, pluck } from './kit.js'

export function start(ctx, master) {
  const fridge = drone(ctx, master, { freqs: [60, 120], detuneCents: 3, gain: 0.014, cutoff: 260 })
  const light = drone(ctx, master, { freqs: [1760, 2637], detuneCents: 5, gain: 0.0025, cutoff: 4000 })
  const room = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.03, gain: 0.016, cutoff: 420 })
  let stopped = false
  let timer = null
  let n = 0
  function tick() {
    if (stopped) return
    pluck(ctx, master, { freq: n++ % 2 ? 3200 : 2900, gain: 0.03, decay: 0.05 })
    timer = setTimeout(tick, 1000)
  }
  timer = setTimeout(tick, 400)
  return function stop() {
    stopped = true
    clearTimeout(timer)
    fridge.stop()
    light.stop()
    room.stop()
  }
}
