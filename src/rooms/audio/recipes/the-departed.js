// The Departed's own room recipe. A distant city noiseWash sits under the
// whole visit; the chime is NOT on its own random timer here — it fires the
// instant Departed.jsx's visual elevator timer opens the doors, via the
// small local pub-sub in bespoke/departedBus.js, so the audio event and the
// visual event are the same event rather than two independent random draws.
import { noiseWash, chime } from './kit.js'
import { subscribeElevatorOpen } from '../../bespoke/departedBus.js'

// contract: (ctx, master, clock) -> stop()
export function start(ctx, master) {
  const city = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.032, gain: 0.026, cutoff: 620 })

  const unsubscribe = subscribeElevatorOpen(() => {
    // "generative two-partial chime" per the spec, verbatim
    chime(ctx, master, { freqs: [880, 1318.5], gain: 0.17, decay: 3.6 })
  })

  return function stop() {
    unsubscribe()
    city.stop()
  }
}
