// Masters of the Universe's own recipe: camp-organ-ish stabs answered by
// thunder rumbles, cued to the lightning's own pose changes (bespoke/
// motuBus.js) rather than running on a separate independent clock — the
// room is "having a wonderful time," so the mix hits its marks with the
// visuals rather than merely coexisting with them. Contract:
// (ctx, master) -> stop().
import { chime, drone, swellReverse } from './kit.js'
import { subscribePose } from '../../bespoke/motuBus.js'

export function start(ctx, master) {
  // a low cosmic bed, always on, purple-green atmosphere in audio form
  const bedGain = ctx.createGain()
  bedGain.gain.value = 1
  bedGain.connect(master)
  const bed = drone(ctx, bedGain, { freqs: [65.4, 98], detuneCents: 5, gain: 0.05, cutoff: 320 })

  let stopped = false
  const unsubscribe = subscribePose(() => {
    if (stopped) return
    // the organ stab: an inharmonic chime bank pitched down toward church-
    // organ register rather than a bell's usual high partials
    chime(ctx, master, { freqs: [110, 164.8, 220, 277.2], gain: 0.14, decay: 1.8 })
    // the thunder: a reversed-swell shape at sub-bass register, arriving a
    // beat after the stab like distant thunder trailing a strike
    setTimeout(() => {
      if (!stopped) swellReverse(ctx, master, { freq: 46, dur: 1.1, gain: 0.2 })
    }, 90)
  })

  return function stop() {
    stopped = true
    unsubscribe()
    bed.stop()
  }
}
