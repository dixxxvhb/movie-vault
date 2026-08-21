// Barbarian's own recipe: rain + house tone up in the living room, a low
// room pressure that takes over the deeper you go below. Contract:
// (ctx, master) -> stop().
import { noiseWash, drone } from './kit.js'
import { subscribeDepth } from '../../bespoke/barbarianBus.js'

export function start(ctx, master) {
  // rain: bright-ish filtered white noise, distinct register from the
  // house's own low tone below it
  const rainGain = ctx.createGain()
  rainGain.gain.value = 1
  rainGain.connect(master)
  const rain = noiseWash(ctx, rainGain, { color: 'white', lfoRate: 0.35, gain: 0.05, cutoff: 3400 })

  // the house's own tone: a warm, settled hum, present everywhere
  const houseGain = ctx.createGain()
  houseGain.gain.value = 1
  houseGain.connect(master)
  const house = drone(ctx, houseGain, { freqs: [72], detuneCents: 4, gain: 0.05, cutoff: 260 })

  // room pressure: the basement's own weight, silent up top, risen in as
  // you descend rather than snapped in at the doorway
  const pressureGain = ctx.createGain()
  pressureGain.gain.value = 0
  pressureGain.connect(master)
  const pressure = drone(ctx, pressureGain, { freqs: [42, 44.2], detuneCents: 6, gain: 0.22, cutoff: 150 })

  const unsubscribe = subscribeDepth((depth) => {
    const below = depth >= 0
    const deep = depth >= 2
    rainGain.gain.setTargetAtTime(below ? 0.3 : 1, ctx.currentTime, 0.6)
    houseGain.gain.setTargetAtTime(below ? 0.5 : 1, ctx.currentTime, 0.6)
    pressureGain.gain.setTargetAtTime(below ? (deep ? 1 : 0.6) : 0, ctx.currentTime, 0.6)
  })

  return function stop() {
    unsubscribe()
    rain.stop()
    house.stop()
    pressure.stop()
  }
}
