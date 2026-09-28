// No Country for Old Men's own recipe: wind, and ONLY wind, in this room —
// no drone, no pluck, nothing else in the mix.
//
// This used to own a second AudioContext wired straight to the speakers, so
// the brief's joke ("the mute toggle is disabled here") came true: the wind
// played whatever the sound button said. That also meant a room made noise
// for someone who had never turned sound on, which the Vault never does. The
// joke loses to the rule. It is an ordinary recipe now, mounted through
// useRoomAudio, so it waits for sound to be on and rides the shared master
// bus like every other room.
import { noiseWash } from './kit.js'

export function start(ctx, master) {
  const wash = noiseWash(ctx, master, {
    color: 'brown', lfoRate: 0.045, gain: 0.05, cutoff: 1500,
  })
  return function stop() {
    wash.stop()
  }
}
