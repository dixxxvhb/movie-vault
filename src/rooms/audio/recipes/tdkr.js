// The Dark Knight Rises' own room recipe — the pit's chant, register only:
// a low two-syllable pulse (a call, then a lower answer half a beat later)
// at the brief's own bpm 40, built from plain oscillators through a low-
// pass, never the actual chorus.
import { safeDisconnectAll } from './kit.js'

const BPM = 40
const BEAT = 60 / BPM

function chantHit(ctx, out, freq, gain) {
  const t0 = ctx.currentTime
  const o = ctx.createOscillator()
  o.type = 'sawtooth'
  o.frequency.value = freq
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 260
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.05)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5)
  o.connect(lp); lp.connect(g); g.connect(out)
  o.start(t0); o.stop(t0 + 0.55)
  const cleanup = () => safeDisconnectAll([o, lp, g])
  o.onended = cleanup
  setTimeout(cleanup, 700)
}

// contract: (ctx, master, clock) -> stop()
export function start(ctx, master) {
  let stopped = false
  const timers = []
  let barStart = ctx.currentTime + 0.1

  function scheduleBar() {
    if (stopped) return
    // two syllables per bar: a low call, then a slightly lower answer
    chantHit(ctx, master, 65.4, 0.1)
    timers.push(setTimeout(() => { if (!stopped) chantHit(ctx, master, 49, 0.08) }, BEAT * 1000))
    barStart += BEAT * 2
    timers.push(setTimeout(scheduleBar, Math.max(20, (barStart - ctx.currentTime) * 1000)))
  }
  scheduleBar()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
  }
}
