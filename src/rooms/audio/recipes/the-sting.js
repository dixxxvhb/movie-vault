// The Sting's own room recipe. Sparse ragtime-adjacent plucks, an original
// pattern (never a quoted rag), low volume — the brief's own words. No drone,
// no wash: this room's quiet is the point, so the plucks land alone against
// silence the way a lone stride-piano phrase would drift across an empty
// parlor between marks.
import { pluck } from './kit.js'

// An original broken-chord shape in a bright major register — evokes the
// bounce of a rag's right hand without quoting one. Each figure picks a
// random start point in this row and walks 3-5 notes forward or back, so no
// two figures repeat the same shape.
const NOTES = [261.6, 329.6, 392.0, 440.0, 523.2, 587.3, 659.3]

// contract: (ctx, master, clock) -> stop()
export function start(ctx, master) {
  let stopped = false
  const timers = []

  function scheduleFigure() {
    if (stopped) return
    const wait = 5000 + Math.random() * 9000
    timers.push(setTimeout(() => {
      if (stopped) return
      const len = 3 + Math.floor(Math.random() * 3)
      const start = Math.floor(Math.random() * (NOTES.length - len))
      const forward = Math.random() > 0.4
      const run = Array.from({ length: len }, (_, i) => NOTES[start + i])
      if (!forward) run.reverse()
      run.forEach((freq, i) => {
        timers.push(setTimeout(() => {
          if (stopped) return
          pluck(ctx, master, { freq, gain: 0.09, decay: 0.5 + Math.random() * 0.3 })
        }, i * (110 + Math.random() * 40)))
      })
      scheduleFigure()
    }, wait))
  }
  scheduleFigure()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
  }
}
