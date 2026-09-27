// The Big Short's own room recipe — a jittery trading-floor register: a thin
// drone, bursts of high ticker plucks that come in clumps, and every so often
// a reversed swell that cuts dead (the floor falling out).
import { drone, pluck, swellReverse } from './kit.js'

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [73.4], detuneCents: 8, gain: 0.02, cutoff: 360 })

  let stopped = false
  let burstTimer = null
  let tickTimer = null
  let swellTimer = null
  function burst() {
    if (stopped) return
    let n = 6 + Math.floor(Math.random() * 8)
    const tick = () => {
      if (stopped || n-- <= 0) return
      pluck(ctx, master, { freq: 1600 + Math.random() * 1000, gain: 0.025, decay: 0.08 })
      tickTimer = setTimeout(tick, 180 + Math.random() * 220)
    }
    tick()
    burstTimer = setTimeout(burst, 6000 + Math.random() * 4000)
  }
  burstTimer = setTimeout(burst, 1500)
  function scheduleSwell() {
    if (stopped) return
    swellTimer = setTimeout(() => {
      if (stopped) return
      swellReverse(ctx, master, { freq: 146.8, dur: 2.2, gain: 0.07 })
      scheduleSwell()
    }, 38000 + Math.random() * 8000)
  }
  scheduleSwell()

  return function stop() {
    stopped = true
    clearTimeout(burstTimer)
    clearTimeout(tickTimer)
    clearTimeout(swellTimer)
    bed.stop()
  }
}
