// LE GAMAAR's sound (plan §11). Pure synthesis, no recorded film audio.
//
// The engine has no positional audio, so the building is one gain bus per
// zone, crossfaded over 1.2 s when the walker crosses into another space.
// The room talks to this file only through window events, so the recipe can
// start and stop with the mute switch without the room knowing:
//   basterds:zone  {zone}          the walker moved (Basterds.jsx)
//   basterds:reel  {reel}          a reel was threaded (Theatre.jsx)
//   basterds:fire  {phase}         'start' | 'end' (Theatre.jsx)
//   basterds:hush  {seconds}       the three fingers flipped (Cellar.jsx)
import { noiseWash, drone, pluck, chime, noiseBuffer, safeStopAll, safeDisconnectAll } from './kit.js'

const ZONES = ['rue', 'house', 'balcony', 'behind', 'bar']
const XFADE = 1.2 / 3   // setTargetAtTime constant: ~95% there in 1.2 s

// A crowd: band-passed noise with a slow swell, the murmur of a full house.
function crowd(ctx, out, { gain = 0.05, centre = 520, rate = 0.13 } = {}) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, 6, 'pink'); src.loop = true
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = centre; bp.Q.value = 0.9
  const g = ctx.createGain(); g.gain.value = gain
  const lfo = ctx.createOscillator(); lfo.frequency.value = rate
  const lg = ctx.createGain(); lg.gain.value = gain * 0.45
  lfo.connect(lg); lg.connect(g.gain)
  src.connect(bp); bp.connect(g); g.connect(out)
  src.start(); lfo.start()
  return { node: g, bp, stop() { safeStopAll([src, lfo]); safeDisconnectAll([src, bp, g, lfo, lg]) } }
}

// A projector: noise chopped by a 24 Hz square (the shutter), plus the motor.
function projector(ctx, out, { gain = 0.03, cutoff = 2400, hum = 0 } = {}) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, 4, 'white'); src.loop = true
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff
  const gate = ctx.createGain(); gate.gain.value = 0
  const shutter = ctx.createOscillator(); shutter.type = 'square'; shutter.frequency.value = 24
  const depth = ctx.createGain(); depth.gain.value = gain
  shutter.connect(depth); depth.connect(gate.gain)
  src.connect(lp); lp.connect(gate); gate.connect(out)
  src.start(); shutter.start()
  const motor = hum > 0 ? drone(ctx, out, { freqs: [60, 120], detuneCents: 3, gain: hum, cutoff: 260 }) : null
  return { stop() { motor?.stop(); safeStopAll([src, shutter]); safeDisconnectAll([src, lp, gate, shutter, depth]) } }
}

// The whistle: five notes, composed for this room, in the spaghetti-Western
// register (a sine with vibrato into a springy feedback delay). Not a quote.
const FIGURE = [[440, 0.32], [659.25, 0.32], [587.33, 0.22], [523.25, 0.22], [440, 1.3]]
function whistle(ctx, out, gain = 0.07) {
  const delay = ctx.createDelay(1); delay.delayTime.value = 0.31
  const fb = ctx.createGain(); fb.gain.value = 0.38
  const wet = ctx.createBiquadFilter(); wet.type = 'bandpass'; wet.frequency.value = 1400; wet.Q.value = 0.7
  delay.connect(fb); fb.connect(wet); wet.connect(delay); delay.connect(out)
  let t = ctx.currentTime + 0.05
  const nodes = [delay, fb, wet]
  for (const [f, d] of FIGURE) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f
    const vib = ctx.createOscillator(); vib.frequency.value = 5.6
    const vg = ctx.createGain(); vg.gain.value = f * 0.012
    vib.connect(vg); vg.connect(o.frequency)
    const g = ctx.createGain(); g.gain.value = 0
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + 0.04)
    g.gain.setTargetAtTime(0, t + d * 0.8, d * 0.25)
    o.connect(g); g.connect(out); g.connect(delay)
    o.start(t); vib.start(t); o.stop(t + d + 0.6); vib.stop(t + d + 0.6)
    nodes.push(o, vib, vg, g)
    t += d
  }
  setTimeout(() => safeDisconnectAll(nodes), (t - ctx.currentTime + 4) * 1000)
}

function knock(ctx, out) {
  const t0 = ctx.currentTime + 0.4
  ;[0, 0.22, 0.44].forEach((dt) => {
    const o = ctx.createOscillator(); o.type = 'sine'
    o.frequency.setValueAtTime(140, t0 + dt); o.frequency.exponentialRampToValueAtTime(60, t0 + dt + 0.12)
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0 + dt)
    g.gain.exponentialRampToValueAtTime(0.35, t0 + dt + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.18)
    o.connect(g); g.connect(out); o.start(t0 + dt); o.stop(t0 + dt + 0.2)
    setTimeout(() => safeDisconnectAll([o, g]), 1500)
  })
}

// contract: (ctx, master) -> stop()
export function start(ctx, master) {
  const bus = {}
  for (const z of ZONES) {
    bus[z] = ctx.createGain(); bus[z].gain.value = 0; bus[z].connect(master)
  }
  // one extra stage for the fire and the hush, over everything
  const fireBus = ctx.createGain(); fireBus.gain.value = 0; fireBus.connect(master)
  const beds = []

  // rue: night air, and a bell somewhere across Paris
  beds.push(noiseWash(ctx, bus.rue, { color: 'brown', gain: 0.03, cutoff: 700, lfoRate: 0.05 }))
  // the house: the full crowd and the clatter from the booth
  beds.push(crowd(ctx, bus.house, { gain: 0.05, centre: 560, rate: 0.11 }))
  beds.push(projector(ctx, bus.house, { gain: 0.012, cutoff: 1800 }))
  // the balcony and the booth in it: the motor and the shutter right beside you
  beds.push(crowd(ctx, bus.balcony, { gain: 0.03, centre: 460, rate: 0.11 }))
  beds.push(projector(ctx, bus.balcony, { gain: 0.04, cutoff: 3200, hum: 0.04 }))
  // behind the screen: the projector through canvas
  beds.push(projector(ctx, bus.behind, { gain: 0.02, cutoff: 420 }))
  beds.push(crowd(ctx, bus.behind, { gain: 0.02, centre: 300 }))
  // La Louisiane: low chatter under the Box, the house faint through the arch
  beds.push(crowd(ctx, bus.bar, { gain: 0.045, centre: 440, rate: 0.19 }))
  beds.push(crowd(ctx, bus.bar, { gain: 0.015, centre: 560, rate: 0.11 }))

  let zone = window.__basterdsZone || 'rue'
  bus[zone].gain.setTargetAtTime(1, ctx.currentTime, 0.3)
  let firing = false
  let hushedUntil = 0
  let knocked = false

  const setZone = (z) => {
    if (!bus[z] || z === zone) return
    bus[zone].gain.setTargetAtTime(0, ctx.currentTime, XFADE)
    zone = z
    if (!firing && performance.now() > hushedUntil) bus[zone].gain.setTargetAtTime(1, ctx.currentTime, XFADE)
    if (z === 'balcony' && !knocked) { knocked = true; knock(ctx, bus.balcony) }
  }

  // accents on timers, each only heard on its own bus
  let stopped = false
  const timers = []
  const every = (lo, hi, fn) => {
    const go = () => { if (stopped) return; fn(); timers.push(setTimeout(go, lo + Math.random() * (hi - lo))) }
    timers.push(setTimeout(go, lo * 0.3 + Math.random() * lo))
  }
  every(40000, 90000, () => chime(ctx, bus.rue, { freqs: [196, 392, 588], gain: 0.05, decay: 6 }))
  every(2500, 7000, () => chime(ctx, bus.bar, { freqs: [2400 + Math.random() * 600, 4100], gain: 0.02, decay: 0.6 }))
  every(1000, 1000, () => pluck(ctx, bus.bar, { freq: 1800, gain: 0.018, decay: 0.05 }))  // the clock
  every(3000, 9000, () => pluck(ctx, bus.behind, { freq: 3000 + Math.random() * 1500, gain: 0.02, decay: 0.08 }))  // cans cooling

  // the fire: a rising wash, crackle, then a hard cut to nothing
  let fire = null
  const crackles = []
  const onFire = (e) => {
    const phase = e.detail?.phase
    if (phase === 'start' && !firing) {
      firing = true
      const t = ctx.currentTime
      fireBus.gain.cancelScheduledValues(t); fireBus.gain.setValueAtTime(0, t); fireBus.gain.linearRampToValueAtTime(1, t + 3)
      fire = noiseWash(ctx, fireBus, { color: 'brown', gain: 0.14, cutoff: 300, lfoRate: 0.3 })
      beds.push(crowd(ctx, fireBus, { gain: 0.06, centre: 900, rate: 0.9 }))
      const crack = () => { if (!firing) return; pluck(ctx, fireBus, { freq: 900 + Math.random() * 3000, gain: 0.05 + Math.random() * 0.05, decay: 0.05 }); crackles.push(setTimeout(crack, 40 + Math.random() * 220)) }
      crack()
    } else if (phase === 'end' && firing) {
      // the roar cuts to silence: every bus, at once
      firing = false
      crackles.forEach(clearTimeout)
      const t = ctx.currentTime
      fireBus.gain.cancelScheduledValues(t); fireBus.gain.setValueAtTime(0, t)
      for (const z of ZONES) { bus[z].gain.cancelScheduledValues(t); bus[z].gain.setValueAtTime(0, t) }
      setTimeout(() => { fire?.stop(); fire = null; if (!stopped) bus[zone].gain.setTargetAtTime(1, ctx.currentTime, 1.2) }, 3500)
    }
  }
  const onReel = (e) => { if (e.detail?.reel && zone !== 'rue') whistle(ctx, zone === 'house' || zone === 'balcony' ? bus[zone] : bus.house) }
  const onHush = (e) => {
    const s = e.detail?.seconds ?? 2
    hushedUntil = performance.now() + s * 1000
    const t = ctx.currentTime
    bus.bar.gain.cancelScheduledValues(t); bus.bar.gain.setTargetAtTime(0, t, 0.03)
    timers.push(setTimeout(() => { if (!stopped && zone === 'bar' && !firing) bus.bar.gain.setTargetAtTime(1, ctx.currentTime, 0.4) }, s * 1000))
  }
  const onZone = (e) => setZone(e.detail?.zone)
  window.addEventListener('basterds:zone', onZone)
  window.addEventListener('basterds:fire', onFire)
  window.addEventListener('basterds:reel', onReel)
  window.addEventListener('basterds:hush', onHush)

  return function stop() {
    stopped = true; firing = false
    timers.forEach(clearTimeout); crackles.forEach(clearTimeout)
    window.removeEventListener('basterds:zone', onZone)
    window.removeEventListener('basterds:fire', onFire)
    window.removeEventListener('basterds:reel', onReel)
    window.removeEventListener('basterds:hush', onHush)
    beds.forEach((b) => b.stop()); fire?.stop()
    setTimeout(() => safeDisconnectAll([...Object.values(bus), fireBus]), 1200)
  }
}
