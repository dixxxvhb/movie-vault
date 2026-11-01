// Gosford Park's own room recipe — the drawing room after dinner: the fire
// crackling, the mantel clock ticking, and from another room far down the
// house a piano chord now and then, someone at the keys between songs.
import { noiseWash, pluck } from './kit.js'

export function start(ctx, master) {
  const fire = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.3, gain: 0.026, cutoff: 650 })
  let stopped = false
  const timers = []
  function later(fn, ms) { timers.push(setTimeout(() => { if (!stopped) fn() }, ms)) }

  function crackle() {
    pluck(ctx, master, { freq: 1800 + Math.random() * 2600, gain: 0.015 + Math.random() * 0.02, decay: 0.03 })
    later(crackle, 90 + Math.random() * 700)
  }
  let n = 0
  function tick() {
    pluck(ctx, master, { freq: n++ % 2 ? 2100 : 1900, gain: 0.02, decay: 0.06 })
    later(tick, 1000)
  }
  // a soft chord, far off: an old parlour voicing, never a tune
  const CHORDS = [[196, 246.9, 293.7, 392], [174.6, 220, 261.6, 349.2], [164.8, 207.7, 246.9, 329.6]]
  function chord() {
    const c = CHORDS[Math.floor(Math.random() * CHORDS.length)]
    c.forEach((f, i) => later(() => pluck(ctx, master, { freq: f, gain: 0.02, decay: 2.4 }), i * 30))
    later(chord, 20000 + Math.random() * 18000)
  }
  later(crackle, 300)
  later(tick, 600)
  later(chord, 8000)

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    fire.stop()
  }
}
