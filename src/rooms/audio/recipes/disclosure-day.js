// Disclosure Day's own recipe: HVAC hum, and a distant, unintelligible PA
// murmur — synthesized formant-ish vowel shapes with no words in them at
// all, matching the room's own doctrine of saying nothing at length.
// Contract: (ctx, master) -> stop().
import { drone } from './kit.js'

// A handful of bandpass filters parked near vowel formant frequencies,
// fed from one shared noise source and slowly, independently modulated —
// reads as a voice-shaped murmur bleeding through a wall, never a word.
function murmur(ctx, out, { gain = 0.05 } = {}) {
  const src = ctx.createBufferSource()
  const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < d.length; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.05 * white) / 1.05
    d[i] = last * 4
  }
  src.buffer = buf
  src.loop = true

  const bus = ctx.createGain()
  bus.gain.value = gain
  bus.connect(out)

  const formants = [520, 1200, 2400]
  const lfos = []
  formants.forEach((f, i) => {
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = f
    bp.Q.value = 6
    const bpGain = ctx.createGain()
    bpGain.gain.value = 1 / formants.length
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.06 + i * 0.035
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = f * 0.18
    lfo.connect(lfoDepth)
    lfoDepth.connect(bp.frequency)
    lfo.start()
    src.connect(bp)
    bp.connect(bpGain)
    bpGain.connect(bus)
    lfos.push(lfo)
  })

  // an envelope LFO so the murmur swells and fades like sentences, rather
  // than sitting at one constant level
  const env = ctx.createGain()
  const envLfo = ctx.createOscillator()
  envLfo.type = 'sine'
  envLfo.frequency.value = 0.11
  const envDepth = ctx.createGain()
  envDepth.gain.value = 0.5
  envLfo.connect(envDepth)
  envDepth.connect(env.gain)
  env.gain.value = 0.5
  envLfo.start()
  bus.disconnect()
  bus.connect(env)
  env.connect(out)

  src.start()

  return {
    stop() {
      try { src.stop() } catch { /* already stopped */ }
      lfos.forEach((l) => { try { l.stop() } catch { /* already stopped */ } })
      try { envLfo.stop() } catch { /* already stopped */ }
      ;[src, bus, env, envLfo, envDepth, ...lfos].forEach((n) => { try { n.disconnect() } catch { /* gone */ } })
    },
  }
}

export function start(ctx, master) {
  const hvac = drone(ctx, master, { freqs: [110], detuneCents: 3, gain: 0.035, cutoff: 900 })
  const pa = murmur(ctx, master, { gain: 0.045 })

  return function stop() {
    hvac.stop()
    pa.stop()
  }
}
