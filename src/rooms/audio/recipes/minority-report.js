// Minority Report's own room recipe — the temple pool's cool shimmer under
// a steady, gentle tick standing in for the red ball rolling toward you,
// forever, never arriving — the tick never resolves into an impact.
import { noiseWash, pluck } from './kit.js'

export function start(ctx, master) {
  const bed = noiseWash(ctx, master, { color: 'white', lfoRate: 0.05, gain: 0.018, cutoff: 1600 })

  let stopped = false
  const timers = []
  function tick() {
    if (stopped) return
    pluck(ctx, master, { freq: 720, gain: 0.03, decay: 0.14 })
    timers.push(setTimeout(tick, 900))
  }
  timers.push(setTimeout(tick, 300))

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    bed.stop()
  }
}
