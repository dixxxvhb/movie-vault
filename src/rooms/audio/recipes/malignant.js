// Malignant's own room recipe — quiet and uneasy at first, then, after the
// same ~25s dwell the room's own DwellConcede system uses to concede his
// review, it gets faster and colder: a plain low drone gives way to a
// quickened, percussive stab pattern, exactly like the back half of the
// movie.
import { drone, pluck } from './kit.js'

export function start(ctx, master) {
  const calm = drone(ctx, master, { freqs: [55], detuneCents: 5, gain: 0.024, cutoff: 260 })

  let stopped = false
  let chaotic = false
  const timers = []

  function stab() {
    if (stopped || !chaotic) return
    pluck(ctx, master, { freq: 180 + Math.random() * 400, gain: 0.09, decay: 0.18 })
    timers.push(setTimeout(stab, 220 + Math.random() * 260))
  }

  timers.push(setTimeout(() => {
    if (stopped) return
    chaotic = true
    calm.stop()
    stab()
  }, 25000))

  return function stop() {
    stopped = true
    chaotic = false
    timers.forEach(clearTimeout)
    calm.stop()
  }
}
