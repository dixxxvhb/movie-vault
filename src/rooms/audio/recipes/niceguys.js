// The Nice Guys' own room recipe — sunny 70s backyard groove: a light,
// loping bass pluck loop over near silence, original pattern, never a cue.
import { pluck } from './kit.js'

const BASS = [98, 98, 110, 87.3]

export function start(ctx, master) {
  let stopped = false
  const timers = []
  let i = 0
  function step() {
    if (stopped) return
    pluck(ctx, master, { freq: BASS[i % BASS.length], gain: 0.06, decay: 0.55 })
    i++
    timers.push(setTimeout(step, 560))
  }
  timers.push(setTimeout(step, 400))

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
  }
}
