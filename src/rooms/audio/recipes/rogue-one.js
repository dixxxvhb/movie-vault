// Rogue One's own room recipe — the corridor's pressure: a low advancing
// hum that thickens over a slow cycle (mirrors the room's own AdvanceGlow
// system in configs.js), resetting back down each time it peaks.
import { drone } from './kit.js'

export function start(ctx, master) {
  const g = ctx.createGain()
  g.gain.value = 0
  g.connect(master)
  const bed = drone(ctx, g, { freqs: [41.2, 61.8], detuneCents: 5, gain: 0.06, cutoff: 220 })

  let stopped = false
  const timers = []
  function cycle() {
    if (stopped) return
    const t0 = ctx.currentTime
    g.gain.cancelScheduledValues(t0)
    g.gain.setValueAtTime(0.15, t0)
    g.gain.linearRampToValueAtTime(1, t0 + 11)
    g.gain.setValueAtTime(0.15, t0 + 11.2)
    timers.push(setTimeout(cycle, 12000))
  }
  cycle()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    bed.stop()
  }
}
