// Baby Driver's own room recipe — the room that proves the audio system: an
// original ~110bpm groove (kit.js's own kick/snare/hat/bass engine) plus a
// hand-scheduled guitar-ish stab line that varies pitch across an 8-bar
// phrase, so the "loop" actually evolves over 8 bars even though the
// underlying drum groove repeats every bar (same relationship a real track
// has between its rhythm section and its melodic hook).
//
// Everything here schedules purely off ctx.currentTime — the room's OWN
// wipers/brakes/pedestrians read clock.js's rAF beat math independently, so
// muted visuals stay on the identical bpm grid without this file running at
// all (per the brief: "the clock drives BOTH audio and visuals").
import { beatKit, pluck } from './kit.js'

const BPM = 110
const BEAT = 60 / BPM
const BAR = BEAT * 4
const PHRASE_BARS = 8

// Guitar-ish stab pitches, one per bar of the 8-bar phrase — an original
// line, never a quoted riff. Two stabs per bar, on the syncopated "and" of
// beats 2 and 4 (visual side reads the identical offsets for its bursts).
const STAB_PATTERN = [220, 220, 246.9, 220, 277.2, 246.9, 220, 196]

// contract: (ctx, master, clock) -> stop()
export function start(ctx, master) {
  const groove = beatKit(ctx, master, { bpm: BPM, gain: 0.13 })

  let stopped = false
  const timers = []
  let barIndex = 0
  let barStart = ctx.currentTime + 0.05

  function scheduleBar() {
    if (stopped) return
    const freq = STAB_PATTERN[barIndex % PHRASE_BARS]
    // the "and" of beat 2 (index 1.5) and beat 4 (index 3.5) — the classic
    // syncopated pocket the brief's "stab hits on syncopation" is asking for
    const t1 = barStart + BEAT * 1.5
    const t2 = barStart + BEAT * 3.5
    scheduleStab(t1, freq)
    scheduleStab(t2, freq * 1.5)

    barIndex++
    barStart += BAR
    const msUntilNext = Math.max(20, (barStart - ctx.currentTime - BAR) * 1000)
    timers.push(setTimeout(scheduleBar, msUntilNext))
  }

  function scheduleStab(t, freq) {
    const wait = Math.max(0, (t - ctx.currentTime) * 1000)
    timers.push(setTimeout(() => {
      if (stopped) return
      // a short, bright, quickly-decaying pluck reads as a guitar-ish stab
      // rather than a sustained note — never a run, never a melody
      pluck(ctx, master, { freq, gain: 0.14, decay: 0.32 })
    }, wait))
  }

  scheduleBar()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    groove.stop()
  }
}
