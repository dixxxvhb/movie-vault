// Frost/Nixon's own room recipe — the set between takes: tape hiss, a low
// held drone, and a two-note question and answer every few seconds, one
// voice then the other.
import { drone, noiseWash, pluck } from './kit.js'

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [65.4, 98], detuneCents: 4, gain: 0.02, cutoff: 420 })
  const hiss = noiseWash(ctx, master, { color: 'white', lfoRate: 0.02, gain: 0.006, cutoff: 5000 })

  let stopped = false
  let timer = null
  let answerTimer = null
  function exchange() {
    if (stopped) return
    pluck(ctx, master, { freq: 196, gain: 0.045, decay: 0.9 })
    answerTimer = setTimeout(() => {
      if (!stopped) pluck(ctx, master, { freq: 146.8, gain: 0.05, decay: 1.2 })
    }, 1400)
    timer = setTimeout(exchange, 8000 + Math.random() * 4000)
  }
  timer = setTimeout(exchange, 2500)

  return function stop() {
    stopped = true
    clearTimeout(timer)
    clearTimeout(answerTimer)
    bed.stop()
    hiss.stop()
  }
}
