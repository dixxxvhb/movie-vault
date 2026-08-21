// Amadeus's own room recipe: the Confutatis REGISTER only, never the actual
// theme — a low male-choir-ish synth pulse answered by a high string-register
// tone, call and response, fully original phrases built from plain
// oscillators/filters (same primitive discipline as kit.js, just composed
// here rather than exported there, since neither shape is generic enough to
// be a shared primitive yet).
import { noiseWash } from './kit.js'

function lowPulse(ctx, out, freq) {
  const t0 = ctx.currentTime
  const o1 = ctx.createOscillator()
  o1.type = 'sawtooth'
  o1.frequency.value = freq
  const o2 = ctx.createOscillator()
  o2.type = 'sawtooth'
  o2.frequency.value = freq * 1.005 // a hair detuned, the "choir" beating
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 420
  lp.Q.value = 0.5
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.4)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.6)
  o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(out)
  o1.start(t0); o2.start(t0)
  o1.stop(t0 + 2.7); o2.stop(t0 + 2.7)
  const cleanup = () => { try { o1.disconnect(); o2.disconnect(); lp.disconnect(); g.disconnect() } catch { /* gone */ } }
  setTimeout(cleanup, 2900)
  return cleanup
}

function highAnswer(ctx, out, freqs) {
  const t0 = ctx.currentTime
  const cleanups = []
  freqs.forEach((f, i) => {
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.value = f
    const g = ctx.createGain()
    const start = t0 + i * 0.12
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(0.1 / (i + 1), start + 0.3)
    g.gain.exponentialRampToValueAtTime(0.0001, start + 2.2)
    o.connect(g); g.connect(out)
    o.start(start); o.stop(start + 2.3)
    const cleanup = () => { try { o.disconnect(); g.disconnect() } catch { /* gone */ } }
    o.onended = cleanup
    setTimeout(cleanup, 2500)
    cleanups.push(cleanup)
  })
  return () => cleanups.forEach((c) => c())
}

// contract: (ctx, master, clock) -> stop()
export function start(ctx, master) {
  const room = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.03, gain: 0.02, cutoff: 700 })

  let stopped = false
  const timers = []
  function scheduleCallResponse() {
    if (stopped) return
    lowPulse(ctx, master, 73.4) // low D-ish register, choir stand-in
    timers.push(setTimeout(() => {
      if (stopped) return
      highAnswer(ctx, master, [587.3, 698.5, 880]) // high string-register answer
    }, 1400))
    timers.push(setTimeout(scheduleCallResponse, 7000 + Math.random() * 3000))
  }
  scheduleCallResponse()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    room.stop()
  }
}
