// Dunkirk's own room recipe — the Mole, in register only: grey surf under a
// low drone, a pocket watch ticking a little too loud, and a tone that keeps
// climbing without ever arriving (stacked sines an octave apart, each fading
// in at the bottom as the top one fades out, so the rise never resolves).
import { drone, noiseWash, pluck } from './kit.js'

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [49, 73.4], detuneCents: 5, gain: 0.025, cutoff: 260 })
  const surf = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.09, gain: 0.03, cutoff: 900 })

  const rise = ctx.createGain()
  rise.gain.value = 0.012
  rise.connect(master)
  const BASE = 110, OCT = 3, PERIOD = 24
  const voices = Array.from({ length: OCT }, () => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    g.gain.value = 0
    o.connect(g); g.connect(rise)
    o.start()
    return { o, g }
  })
  let stopped = false
  const t0 = ctx.currentTime
  const climb = setInterval(() => {
    if (stopped) return
    const phase = ((ctx.currentTime - t0) / PERIOD) % 1
    voices.forEach((v, i) => {
      const p = (phase + i / OCT) % 1
      v.o.frequency.setTargetAtTime(BASE * Math.pow(2, p * OCT), ctx.currentTime, 0.05)
      v.g.gain.setTargetAtTime(Math.sin(Math.PI * p), ctx.currentTime, 0.05)
    })
  }, 50)

  let timer = null
  function tick() {
    if (stopped) return
    pluck(ctx, master, { freq: 2400, gain: 0.03, decay: 0.05 })
    timer = setTimeout(tick, 500)
  }
  timer = setTimeout(tick, 400)

  return function stop() {
    stopped = true
    clearInterval(climb)
    clearTimeout(timer)
    voices.forEach((v) => { try { v.o.stop() } catch { /* gone */ } v.g.disconnect() })
    rise.disconnect()
    bed.stop()
    surf.stop()
  }
}
