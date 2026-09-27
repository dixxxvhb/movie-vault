// One Battle After Another's own room recipe — the highway over the hills: a
// low open drone, nervous clustered plucks that bunch up and scatter (a
// prepared-piano register, original), and a swell every so often like a car
// coming over the crest.
import { drone, pluck, swellReverse } from './kit.js'

export function start(ctx, master) {
  const bed = drone(ctx, master, { freqs: [58.3, 87.3], detuneCents: 6, gain: 0.02, cutoff: 350 })

  let stopped = false
  let clusterTimer = null
  let noteTimer = null
  let swellTimer = null
  function cluster() {
    if (stopped) return
    let n = 3 + Math.floor(Math.random() * 3)
    const base = 220 + Math.random() * 60
    const note = () => {
      if (stopped || n-- <= 0) return
      pluck(ctx, master, { freq: base * (1 + Math.random() * 0.12), gain: 0.04, decay: 0.3 })
      noteTimer = setTimeout(note, 70 + Math.random() * 90)
    }
    note()
    clusterTimer = setTimeout(cluster, 1500 + Math.random() * 2500)
  }
  clusterTimer = setTimeout(cluster, 1000)
  function scheduleSwell() {
    if (stopped) return
    swellTimer = setTimeout(() => {
      if (stopped) return
      swellReverse(ctx, master, { freq: 174.6, dur: 2.6, gain: 0.06 })
      scheduleSwell()
    }, 22000 + Math.random() * 8000)
  }
  scheduleSwell()

  return function stop() {
    stopped = true
    clearTimeout(clusterTimer)
    clearTimeout(noteTimer)
    clearTimeout(swellTimer)
    bed.stop()
  }
}
