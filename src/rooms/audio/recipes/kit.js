// Pure Web Audio synthesis primitives. No samples, ever — every voice here is
// built from oscillators, filters and generated noise, so "sound-alike" stays
// on the right side of the fidelity contract (register and rhythm homage,
// never a quoted melody). Every primitive returns `{ stop() }`; `stop()`
// ramps its own gain down and tears its node graph down shortly after, so a
// room that mounts and unmounts fast (StrictMode's dev double-invoke) never
// leaves a dangling oscillator running under a room nobody can see anymore.

function noiseBuffer(ctx, seconds, color = 'brown') {
  const buf = ctx.createBuffer(1, Math.max(1, Math.round(ctx.sampleRate * seconds)), ctx.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < d.length; i++) {
    const white = Math.random() * 2 - 1
    if (color === 'white') {
      d[i] = white * 0.6
    } else {
      last = (last + 0.02 * white) / 1.02
      d[i] = last * 3.2
    }
  }
  return buf
}

// disconnects a list of nodes, swallowing "already disconnected" errors —
// the same defensive pattern roomTone.js uses on dispose
function safeDisconnectAll(nodes) {
  nodes.forEach((n) => { try { n.disconnect() } catch { /* already gone */ } })
}
function safeStopAll(nodes) {
  nodes.forEach((n) => { try { n.stop() } catch { /* already stopped */ } })
}

// A bed of detuned oscillators through a lowpass — the low, unresolved hum a
// room can sit under for minutes without it reading as a note. `freqs` is a
// small chord (unison or a bare fifth reads best at these registers);
// `detuneCents` splits each partial off itself by ±cents so the beating
// never quite locks into tune, which is the "detuned" the brief keeps asking
// for rather than a chorus effect bolted on after.
export function drone(ctx, out, { freqs = [55], detuneCents = 6, gain = 0.05, cutoff = 380 } = {}) {
  const g = ctx.createGain()
  g.gain.value = 0
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = cutoff
  lp.Q.value = 0.3

  const oscs = []
  freqs.forEach((f, i) => {
    ;[-1, 1].forEach((sign, j) => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      o.detune.value = sign * detuneCents * (1 + j * 0.3)
      o.connect(lp)
      o.start()
      oscs.push(o)
    })
  })
  lp.connect(g)
  g.connect(out)
  g.gain.setTargetAtTime(gain, ctx.currentTime, 1.6)

  return {
    node: g,
    stop() {
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.5)
      setTimeout(() => { safeStopAll(oscs); safeDisconnectAll([...oscs, lp, g]) }, 1100)
    },
  }
}

// Filtered noise bed with a slow LFO breathing the filter cutoff — cheap
// "room air" texture, distinct from roomTone.js's air-handler hum (this one
// is meant to sit inside a bespoke recipe alongside a drone/plucks, not to
// stand alone as the motel's own tone).
export function noiseWash(ctx, out, { color = 'brown', lfoRate = 0.06, gain = 0.03, cutoff = 900 } = {}) {
  const g = ctx.createGain()
  g.gain.value = 0
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, 6, color)
  src.loop = true
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = cutoff
  lp.Q.value = 0.5

  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = lfoRate
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = cutoff * 0.35
  lfo.connect(lfoGain)
  lfoGain.connect(lp.frequency)
  lfo.start()

  src.connect(lp)
  lp.connect(g)
  g.connect(out)
  src.start()
  g.gain.setTargetAtTime(gain, ctx.currentTime, 1.4)

  return {
    node: g,
    stop() {
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.4)
      setTimeout(() => { safeStopAll([src, lfo]); safeDisconnectAll([src, lp, lfo, lfoGain, g]) }, 800)
    },
  }
}

// One decaying pluck. Karplus-Strong is real work to do properly (a feedback
// delay loop needs a ScriptProcessor or worklet); this is the cheap stand-in
// the spec allows ("or a short filtered burst") — a short excited noise burst
// through a resonant bandpass tuned to `freq`, which reads as a plucked,
// slightly metallic string-like transient without a hand-rolled DSP loop.
export function pluck(ctx, out, { freq = 220, gain = 0.16, decay = 1.4 } = {}) {
  const t0 = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, 0.4, 'white')
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = freq
  bp.Q.value = 14
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay)

  src.connect(bp)
  bp.connect(g)
  g.connect(out)
  src.start(t0)
  const stopAt = t0 + decay + 0.05
  src.stop(stopAt)

  const cleanup = () => safeDisconnectAll([src, bp, g])
  src.onended = cleanup
  // belt + suspenders: onended can be skipped if the context is closed first
  setTimeout(cleanup, (decay + 0.2) * 1000)
  return { stop: cleanup }
}

// Bell partials with a long decay — inharmonic-ish (each partial gets a
// small non-integer multiplier) so it reads as a chime rather than a tuned
// note stack.
export function chime(ctx, out, { freqs = [660, 1320, 1980], gain = 0.1, decay = 3.2 } = {}) {
  const t0 = ctx.currentTime
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay)
  g.connect(out)

  const oscs = freqs.map((f, i) => {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = f * (1 + i * 0.012)
    const og = ctx.createGain()
    og.gain.value = 1 / (i + 1)
    o.connect(og)
    og.connect(g)
    o.start(t0)
    o.stop(t0 + decay + 0.1)
    return o
  })

  const cleanup = () => safeDisconnectAll([...oscs, g])
  setTimeout(cleanup, (decay + 0.3) * 1000)
  return { stop: cleanup }
}

// Reversed-tape swell: silence -> a hard attack UP to a peak -> instant cut.
// The shape a reversed cymbal/tape swell reads as, built from a filtered
// noise+tone blend rather than an actual reversed sample.
export function swellReverse(ctx, out, { freq = 220, dur = 1.6, gain = 0.14 } = {}) {
  const t0 = ctx.currentTime
  const o = ctx.createOscillator()
  o.type = 'sawtooth'
  o.frequency.value = freq
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(200, t0)
  lp.frequency.linearRampToValueAtTime(freq * 3, t0 + dur * 0.94)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.94)
  // the hard cut: no release tail at all, which is the whole "reversed" cue
  g.gain.setValueAtTime(gain, t0 + dur * 0.94)
  g.gain.linearRampToValueAtTime(0.0001, t0 + dur)

  o.connect(lp)
  lp.connect(g)
  g.connect(out)
  o.start(t0)
  o.stop(t0 + dur + 0.05)

  const cleanup = () => safeDisconnectAll([o, lp, g])
  o.onended = cleanup
  setTimeout(cleanup, (dur + 0.2) * 1000)
  return { stop: cleanup }
}

// Synthesized kick/snare/hat/bass, quantized to the clock's beat grid.
// `bpm` only sets the internal scheduling grid this kit uses to line its own
// hits up — the visual side (clock.js's useBeat) reads the same math
// independently, so muted visuals stay in the same tempo without this kit
// running at all.
export function beatKit(ctx, out, { bpm = 110, gain = 0.14 } = {}) {
  const beatDur = 60 / bpm
  let stopped = false
  const timers = []
  const voices = new Set()

  const track = (obj) => { voices.add(obj); return obj }
  const untrack = (obj) => voices.delete(obj)

  function kick(t) {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(120, t)
    o.frequency.exponentialRampToValueAtTime(40, t + 0.14)
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28)
    o.connect(g); g.connect(out)
    o.start(t); o.stop(t + 0.3)
    const v = track({ o, g })
    o.onended = () => { safeDisconnectAll([o, g]); untrack(v) }
  }
  function snare(t) {
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer(ctx, 0.25, 'white')
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 1.1
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain * 0.7, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
    src.connect(bp); bp.connect(g); g.connect(out)
    src.start(t); src.stop(t + 0.2)
    const v = track({ src, bp, g })
    src.onended = () => { safeDisconnectAll([src, bp, g]); untrack(v) }
  }
  function hat(t) {
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer(ctx, 0.08, 'white')
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'; hp.frequency.value = 7000
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain * 0.35, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
    src.connect(hp); hp.connect(g); g.connect(out)
    src.start(t); src.stop(t + 0.06)
    const v = track({ src, hp, g })
    src.onended = () => { safeDisconnectAll([src, hp, g]); untrack(v) }
  }
  function bass(t, freq) {
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.setValueAtTime(freq * 1.5, t)
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.08)
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain * 0.5, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + beatDur * 0.9)
    o.connect(g); g.connect(out)
    o.start(t); o.stop(t + beatDur)
    const v = track({ o, g })
    o.onended = () => { safeDisconnectAll([o, g]); untrack(v) }
  }

  // schedule one bar ahead of itself, re-arming just before it runs out —
  // Web Audio's own clock (ctx.currentTime), not setInterval, does the
  // actual timing; the JS timer here only exists to keep topping up the
  // lookahead window.
  let barStart = ctx.currentTime + 0.05
  const BASS_PATTERN = [55, 55, 82.4, 55]
  function scheduleBar() {
    if (stopped) return
    for (let b = 0; b < 4; b++) {
      const t = barStart + b * beatDur
      kick(t)
      if (b === 2) snare(t)
      hat(t); hat(t + beatDur / 2)
      bass(t, BASS_PATTERN[b])
    }
    barStart += beatDur * 4
    const msUntilNext = Math.max(20, (barStart - ctx.currentTime - beatDur) * 1000)
    timers.push(setTimeout(scheduleBar, msUntilNext))
  }
  scheduleBar()

  return {
    stop() {
      stopped = true
      timers.forEach(clearTimeout)
      voices.forEach((v) => safeDisconnectAll(Object.values(v)))
      voices.clear()
    },
  }
}
