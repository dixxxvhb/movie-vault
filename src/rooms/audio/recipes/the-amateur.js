// The Amateur's own room recipe — the decryption room: a server-room drone
// and short fast arpeggio bursts, a machine working something out, then quiet.
import { drone, pluck } from './kit.js'

const ARP = [440, 523.3, 659.3, 523.3]

export function start(ctx, master) {
  const hum = drone(ctx, master, { freqs: [55, 110], detuneCents: 2, gain: 0.018, cutoff: 480 })

  let stopped = false
  let burstTimer = null
  let noteTimer = null
  function burst() {
    if (stopped) return
    let n = 12
    let i = 0
    const note = () => {
      if (stopped || n-- <= 0) return
      pluck(ctx, master, { freq: ARP[i++ % ARP.length], gain: 0.02, decay: 0.12 })
      noteTimer = setTimeout(note, 160)
    }
    note()
    burstTimer = setTimeout(burst, 5000 + Math.random() * 4000)
  }
  burstTimer = setTimeout(burst, 1500)

  return function stop() {
    stopped = true
    clearTimeout(burstTimer)
    clearTimeout(noteTimer)
    hum.stop()
  }
}
