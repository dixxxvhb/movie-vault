// Wave T: short synthesized foley events for Touchable's `foley` prop and
// footstep footfalls. Same discipline as recipes/kit.js — no samples, pure
// oscillators/filters/generated noise, every voice under ~40 lines and
// self-disposing (a `setTimeout` belt-and-suspenders alongside `onended`,
// same pattern kit.js's own pluck/chime/swellReverse already use) so a room
// that unmounts mid-decay never leaves a dangling node graph behind.
//
// Each function is `(ctx, out, opts) -> { stop() }`. `out` is engine.js's
// master gain bus (never `ctx.destination` directly — the master bus is
// what mute/unmute ramps and what the compressor sits after).
import { noiseBuffer, safeDisconnectAll, chime as chimeVoice } from './recipes/kit.js'

// soft filtered click — footsteps and generic small-object taps use this
export function tick(ctx, out, { freq = 1600, gain = 0.05 } = {}) {
  const t0 = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, 0.03, 'white')
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 3
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045)
  src.connect(bp); bp.connect(g); g.connect(out)
  src.start(t0); src.stop(t0 + 0.06)
  const cleanup = () => safeDisconnectAll([src, bp, g])
  src.onended = cleanup
  setTimeout(cleanup, 150)
  return { stop: cleanup }
}

// low sine drop + a brown-noise thump — doors, furniture, anything heavy.
// `startFreq`/`endFreq` let a caller pitch the drop down further (Barbarian's
// heaviest basement door wants a lower-pitched thunk than the default) —
// defaults match the original hardcoded 120->38 sweep exactly, so every
// existing call site is byte-identical.
export function thunk(ctx, out, { gain = 0.22, startFreq = 120, endFreq = 38 } = {}) {
  const t0 = ctx.currentTime
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(startFreq, t0)
  o.frequency.exponentialRampToValueAtTime(endFreq, t0 + 0.16)
  const og = ctx.createGain()
  og.gain.setValueAtTime(gain, t0)
  og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22)
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, 0.12, 'brown')
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'; lp.frequency.value = 400
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(gain * 0.6, t0)
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1)
  o.connect(og); og.connect(out)
  src.connect(lp); lp.connect(ng); ng.connect(out)
  o.start(t0); o.stop(t0 + 0.3)
  src.start(t0); src.stop(t0 + 0.15)
  const cleanup = () => safeDisconnectAll([o, og, src, lp, ng])
  o.onended = cleanup
  setTimeout(cleanup, 400)
  return { stop: cleanup }
}

// short bandpassed noise flutter, rising slightly — pages, flipped notes
export function paper(ctx, out, { gain = 0.09 } = {}) {
  const t0 = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, 0.3, 'white')
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.setValueAtTime(2200, t0)
  bp.frequency.linearRampToValueAtTime(3400, t0 + 0.25)
  bp.Q.value = 1.4
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.03)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28)
  src.connect(bp); bp.connect(g); g.connect(out)
  src.start(t0); src.stop(t0 + 0.32)
  const cleanup = () => safeDisconnectAll([src, bp, g])
  src.onended = cleanup
  setTimeout(cleanup, 500)
  return { stop: cleanup }
}

// two detuned high square partials, fast decay — a coin landing
export function coin(ctx, out, { gain = 0.1, freq = 1800 } = {}) {
  const t0 = ctx.currentTime
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4)
  g.connect(out)
  const oscs = [freq, freq * 1.012].map((f) => {
    const o = ctx.createOscillator()
    o.type = 'square'
    o.frequency.value = f
    const og = ctx.createGain()
    og.gain.value = 0.5
    o.connect(og); og.connect(g)
    o.start(t0); o.stop(t0 + 0.42)
    return o
  })
  const cleanup = () => safeDisconnectAll([...oscs, g])
  setTimeout(cleanup, 550)
  return { stop: cleanup }
}

// coin, repeated with a widening interval and falling gain — a spin
// settling to a stop (picked up NCFOM's own coin-flip vocabulary)
export function coinSpin(ctx, out, { gain = 0.08, hits = 6 } = {}) {
  const t0 = ctx.currentTime
  const timers = []
  const voices = []
  let interval = 60
  let elapsedMs = 0
  for (let i = 0; i < hits; i++) {
    const id = setTimeout(() => {
      voices.push(coin(ctx, out, { gain: gain * (1 - i / hits), freq: 1800 + i * 40 }))
    }, elapsedMs)
    timers.push(id)
    elapsedMs += interval
    interval *= 1.35
  }
  return {
    stop() {
      timers.forEach(clearTimeout)
      voices.forEach((v) => v.stop())
    },
  }
}

// slow pitch-bent narrow noise — a hinge or old wood giving
export function creak(ctx, out, { gain = 0.08, dur = 0.9 } = {}) {
  const t0 = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, dur, 'brown')
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 8
  bp.frequency.setValueAtTime(300, t0)
  bp.frequency.linearRampToValueAtTime(180, t0 + dur * 0.5)
  bp.frequency.linearRampToValueAtTime(340, t0 + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + dur * 0.2)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(bp); bp.connect(g); g.connect(out)
  src.start(t0); src.stop(t0 + dur + 0.05)
  const cleanup = () => safeDisconnectAll([src, bp, g])
  src.onended = cleanup
  setTimeout(cleanup, (dur + 0.3) * 1000)
  return { stop: cleanup }
}

// kit.js's own chime, just short — a light switch or a small confirm chime
export function chime(ctx, out, opts = {}) {
  return chimeVoice(ctx, out, { freqs: [880, 1320, 1760], gain: 0.08, decay: 0.9, ...opts })
}

// two quick ticks in a row — a physical toggle snap
function switchFoley(ctx, out, { gain = 0.06 } = {}) {
  const a = tick(ctx, out, { freq: 2400, gain })
  const bId = setTimeout(() => tick(ctx, out, { freq: 1200, gain: gain * 0.8 }), 70)
  return { stop() { a.stop(); clearTimeout(bId) } }
}

// bright sine partial, fast damp — a pane, a bottle
export function glass(ctx, out, { gain = 0.1, freq = 2600 } = {}) {
  const t0 = ctx.currentTime
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.value = freq
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35)
  o.connect(g); g.connect(out)
  o.start(t0); o.stop(t0 + 0.38)
  const cleanup = () => safeDisconnectAll([o, g])
  o.onended = cleanup
  setTimeout(cleanup, 500)
  return { stop: cleanup }
}

// airy bandpassed noise sweep, low to high — a swipe/whoosh
export function swish(ctx, out, { gain = 0.07, dur = 0.5 } = {}) {
  const t0 = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, dur, 'white')
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'; bp.Q.value = 0.7
  bp.frequency.setValueAtTime(600, t0)
  bp.frequency.exponentialRampToValueAtTime(4000, t0 + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + dur * 0.3)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(bp); bp.connect(g); g.connect(out)
  src.start(t0); src.stop(t0 + dur + 0.05)
  const cleanup = () => safeDisconnectAll([src, bp, g])
  src.onended = cleanup
  setTimeout(cleanup, (dur + 0.3) * 1000)
  return { stop: cleanup }
}

// name -> synth fn. `switch` is a reserved word so it can't be a function
// identifier above; the registry key is still the plain string the spec
// names, which is all playOneShot ever looks up.
export const ONESHOTS = { tick, thunk, paper, coin, coinSpin, creak, chime, switch: switchFoley, glass, swish }
