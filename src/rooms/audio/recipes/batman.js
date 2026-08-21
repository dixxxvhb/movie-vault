// Batman Begins' own room recipe — the well's dread floor plus the swarm's
// rare wing-flutter: a quiet brown-noise bed under an occasional burst of
// tiny high hp-noise ticks standing in for bats passing close, register
// only.
import { noiseWash, noiseBuffer, safeDisconnectAll } from './kit.js'

function wingTick(ctx, out) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, 0.05, 'white')
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 4200
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.022, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06)
  src.connect(hp); hp.connect(g); g.connect(out)
  src.start()
  const cleanup = () => safeDisconnectAll([src, hp, g])
  src.onended = cleanup
  setTimeout(cleanup, 120)
}

export function start(ctx, master) {
  const bed = noiseWash(ctx, master, { color: 'brown', lfoRate: 0.04, gain: 0.028, cutoff: 260 })

  let stopped = false
  const timers = []
  function scheduleFlutter() {
    if (stopped) return
    const wait = 12000 + Math.random() * 20000
    timers.push(setTimeout(() => {
      if (stopped) return
      for (let i = 0; i < 6; i++) {
        timers.push(setTimeout(() => { if (!stopped) wingTick(ctx, master) }, i * 60))
      }
      scheduleFlutter()
    }, wait))
  }
  scheduleFlutter()

  return function stop() {
    stopped = true
    timers.forEach(clearTimeout)
    bed.stop()
  }
}
