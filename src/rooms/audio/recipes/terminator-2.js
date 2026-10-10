// Terminator 2's own room recipe — the steel mill, in register only: the
// furnace roar, a hissing bed of steam, and a heavy metal clank that comes
// round on a slow machine cycle.
import { drone, noiseWash, pluck } from './kit.js'

export function start(ctx, master) {
  const roar = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.07, gain: 0.04, cutoff: 420 })
  const steam = noiseWash(ctx, master, { color: 'white', lfoRate: 0.15, gain: 0.01, cutoff: 5000 })
  const hum = drone(ctx, master, { freqs: [41.2, 82.4], detuneCents: 6, gain: 0.02, cutoff: 200 })
  let stopped = false
  let timer = null
  function clank() {
    if (stopped) return
    pluck(ctx, master, { freq: 110, gain: 0.07, decay: 0.6 })
    timer = setTimeout(clank, 5200)
  }
  timer = setTimeout(clank, 2500)
  return function stop() {
    stopped = true
    clearTimeout(timer)
    roar.stop()
    steam.stop()
    hum.stop()
  }
}
