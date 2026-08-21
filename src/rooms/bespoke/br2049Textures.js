import * as THREE from 'three'

// Billboard-scale text: the heartbreak fragment, "readable only from a
// distance" per the brief — so this draws BIG, low-detail letterforms (a
// generous canvas, huge font) rather than anything meant to survive a
// close read. The plane it maps onto sits far off in -Z; up close its own
// resolution is the tell that you were never meant to walk up to it.
export function makeBillboardTexture(text, color = '#dfe8ee') {
  const W = 2048, H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // greedy word-wrap at a fixed large size, shrunk only if it still overflows
  let size = 108
  let lines = []
  do {
    ctx.font = `600 ${size}px Georgia, serif`
    const words = text.split(/\s+/)
    lines = []
    let line = ''
    for (const w of words) {
      const test = line ? line + ' ' + w : w
      if (line && ctx.measureText(test).width > W * 0.92) { lines.push(line); line = w } else line = test
    }
    if (line) lines.push(line)
    size -= 6
  } while (lines.length * size * 1.25 > H * 0.9 && size > 40)

  ctx.font = `600 ${size}px Georgia, serif`
  ctx.globalAlpha = 0.9
  const lh = size * 1.25
  const top = H / 2 - ((lines.length - 1) * lh) / 2
  lines.forEach((l, i) => ctx.fillText(l, W / 2, top + i * lh))

  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}

// The wet concrete's own surface: a dark, faintly reflective floor tint with
// a soft radial sheen where the reflected numeral will sit — plain color
// data, the ripple/shimmer itself is animated on the mesh (uv offset +
// opacity) in BR2049.jsx rather than baked into this texture.
export function makeWetConcreteTexture() {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#0e161c'
  ctx.fillRect(0, 0, S, S)
  ctx.globalAlpha = 0.05
  let s = 51
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  for (let y = 0; y < S; y += 3) {
    ctx.strokeStyle = r() > 0.5 ? '#3a5a6a' : '#000'
    ctx.beginPath()
    ctx.moveTo(0, y + Math.sin(y * 0.04) * 4)
    ctx.lineTo(S, y + Math.sin(y * 0.04 + 2) * 4)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
