// The sound of a room with an air conditioner in it. Synthesised, not a file:
// a loop would be a few hundred KB and would audibly seam.
//
// It NEVER autoplays. No AudioContext is even constructed until the user asks
// for it, so the page makes no sound and takes no audio resource unless the
// toggle is pressed — which also means it can never be blocked by an autoplay
// policy, because it is always downstream of a real click.

let ctx = null
let gain = null
let nodes = []

function noiseBuffer(audio, seconds) {
  const buf = audio.createBuffer(1, audio.sampleRate * seconds, audio.sampleRate)
  const d = buf.getChannelData(0)
  // brown-ish noise: white noise integrated, so the energy sits low where an
  // air handler lives rather than hissing like tape
  let last = 0
  for (let i = 0; i < d.length; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    d[i] = last * 3.2
  }
  return buf
}

export function startRoomTone() {
  if (ctx) {
    ctx.resume()
    gain.gain.setTargetAtTime(0.045, ctx.currentTime, 1.2)
    return
  }
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()

  gain = ctx.createGain()
  gain.gain.value = 0
  gain.connect(ctx.destination)

  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, 8)
  src.loop = true

  // roll everything above a few hundred Hz off: this should sit under the room,
  // not in front of it
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 320
  lp.Q.value = 0.4

  // and a narrow bump at mains hum, which is what makes it read as a machine
  const hum = ctx.createBiquadFilter()
  hum.type = 'peaking'
  hum.frequency.value = 60
  hum.Q.value = 6
  hum.gain.value = 7

  src.connect(lp)
  lp.connect(hum)
  hum.connect(gain)
  src.start()
  nodes = [src, lp, hum]

  gain.gain.setTargetAtTime(0.045, ctx.currentTime, 1.6)
}

export function stopRoomTone() {
  if (!ctx) return
  gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4)
}

export function disposeRoomTone() {
  if (!ctx) return
  nodes.forEach((n) => { try { n.disconnect() } catch { /* already gone */ } })
  ctx.close()
  ctx = null
  gain = null
  nodes = []
}
