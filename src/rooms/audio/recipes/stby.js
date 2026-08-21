// Sorry to Bother You's own room recipe: office air + phone-chirp blips on
// the call floor; during the swerve, a muffled party throb with a wrong low
// end takes over — the mix itself does the hard cut, not just the visuals.
import { noiseWash, drone, pluck } from './kit.js'
import { subscribeSwerve } from '../../bespoke/stbyBus.js'

// contract: (ctx, master, clock) -> stop()
export function start(ctx, master) {
  const officeGain = ctx.createGain()
  officeGain.gain.value = 1
  officeGain.connect(master)
  const air = noiseWash(ctx, officeGain, { color: 'brown', lfoRate: 0.08, gain: 0.035, cutoff: 2200 })

  const partyGain = ctx.createGain()
  partyGain.gain.value = 0
  partyGain.connect(master)
  // the "wrong low end": a dissonant minor-second pair well below the
  // fundamental a party bass would actually sit at, muffled hard
  const party = drone(ctx, partyGain, { freqs: [38, 40.3], detuneCents: 5, gain: 0.24, cutoff: 180 })

  let stopped = false
  const timers = []
  function scheduleChirp() {
    if (stopped) return
    const wait = 3000 + Math.random() * 5000
    timers.push(setTimeout(() => {
      if (stopped) return
      pluck(ctx, officeGain, { freq: 1200 + Math.random() * 400, gain: 0.1, decay: 0.3 })
      scheduleChirp()
    }, wait))
  }
  scheduleChirp()

  const unsubscribe = subscribeSwerve((inPenthouse) => {
    officeGain.gain.setTargetAtTime(inPenthouse ? 0.06 : 1, ctx.currentTime, 0.05)
    partyGain.gain.setTargetAtTime(inPenthouse ? 1 : 0, ctx.currentTime, 0.05)
  })

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    unsubscribe()
    air.stop()
    party.stop()
  }
}
