// Sicario's own room recipe. A sub drone that thickens the deeper you go —
// a second layer fades in as depth increases, driven by bespoke/sicarioBus's
// depth pub-sub rather than a random timer — plus a slow filtered swell
// pulse landing at long, uneven intervals: the BWAAAM shape (a hard attack
// up to a peak, then an instant cut) built from kit.js's own reversed-tape
// swell, never any actual cue.
import { drone, swellReverse } from './kit.js'
import { subscribeDepth } from '../../bespoke/sicarioBus.js'

// contract: (ctx, master, clock) -> stop()
export function start(ctx, master) {
  // always-on floor: present the instant you unmute, even at the surface
  const surface = drone(ctx, master, { freqs: [32.7, 49.0], detuneCents: 4, gain: 0.045, cutoff: 150 })

  // the "thickens with depth" layer: its own gain node, ramped by depth
  // rather than by drone()'s own internal ramp-in, so it can be swept up
  // and down freely as the descent continues
  const depthGain = ctx.createGain()
  depthGain.gain.value = 0
  depthGain.connect(master)
  const deep = drone(ctx, depthGain, { freqs: [24.5, 36.7, 61.4], detuneCents: 7, gain: 0.22, cutoff: 240 })

  const unsubscribe = subscribeDepth((t) => {
    depthGain.gain.setTargetAtTime(t, ctx.currentTime, 1.6)
  })

  let stopped = false
  const timers = []
  function scheduleSwell() {
    if (stopped) return
    const wait = 16000 + Math.random() * 22000
    timers.push(setTimeout(() => {
      if (stopped) return
      swellReverse(ctx, master, { freq: 42 + Math.random() * 24, dur: 2.6 + Math.random() * 1.6, gain: 0.17 })
      scheduleSwell()
    }, wait))
  }
  scheduleSwell()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    unsubscribe()
    surface.stop()
    deep.stop()
  }
}
