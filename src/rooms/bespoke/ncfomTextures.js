import * as THREE from 'three'

// Procedural canvas textures for No Country for Old Men. Same rule as
// infoTextures.js/mementoTextures.js: no imported assets, every pixel drawn
// here. The hot take renders VERBATIM (brief law 5) on the highway sign;
// everything else on this file is our own generic set dressing, never film
// dialogue.

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
}

function rngFor(seed) {
  let s = (seed * 2654435761) >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

function wrapLines(ctx, text, maxWidth) {
  const words = (text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (line && ctx.measureText(test).width > maxWidth) { lines.push(line); line = w }
    else line = test
  }
  if (line) lines.push(line)
  return lines
}

// The weathered highway sign outside the door/window: a beat-up green
// road-sign panel carrying the film's own record — the split-watch asterisk
// and his full conflicted take, verbatim — with the 8.3 painted small in the
// corner. This is the ONLY score numeral anywhere in the room; the brief
// denies the meal indoors on purpose.
export function makeHighwaySignTexture(film) {
  const W = 1536, H = 1024
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const r = rngFor(83)

  // sun-bleached olive-green sign face
  ctx.fillStyle = '#4a5c42'
  ctx.fillRect(0, 0, W, H)
  const bleach = ctx.createLinearGradient(0, 0, W, H)
  bleach.addColorStop(0, 'rgba(220,210,160,0.18)')
  bleach.addColorStop(0.5, 'rgba(220,210,160,0.04)')
  bleach.addColorStop(1, 'rgba(220,210,160,0.22)')
  ctx.fillStyle = bleach
  ctx.fillRect(0, 0, W, H)

  // rust streaks + bullet-pocked dents (Texas backroad sign, never touched)
  ctx.globalAlpha = 0.5
  for (let i = 0; i < 40; i++) {
    const x = r() * W
    ctx.strokeStyle = `rgba(120,70,40,${0.15 + r() * 0.2})`
    ctx.lineWidth = 3 + r() * 6
    ctx.beginPath()
    ctx.moveTo(x, r() * H * 0.3)
    ctx.lineTo(x + (r() - 0.5) * 30, H)
    ctx.stroke()
  }
  ctx.globalAlpha = 0.3
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = r() > 0.5 ? '#1c1c14' : '#8a8a70'
    ctx.beginPath()
    ctx.arc(r() * W, r() * H, 2 + r() * 4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  ctx.strokeStyle = '#e8e2c8'
  ctx.lineWidth = 14
  ctx.strokeRect(30, 30, W - 60, H - 60)

  ctx.fillStyle = '#e8e2c8'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '700 46px Georgia, serif'
  ctx.fillText((film.title || '').toUpperCase(), 70, 110)

  ctx.font = 'italic 34px Georgia, serif'
  const text = film.hot_take || ''
  let size = 34
  let lines = []
  const maxW = W - 140
  const maxH = H - 320
  for (;;) {
    ctx.font = `italic ${size}px Georgia, serif`
    lines = wrapLines(ctx, text, maxW)
    if (lines.length * size * 1.3 <= maxH || size <= 20) break
    size -= 2
  }
  let ty = 200
  lines.forEach((l) => { ctx.fillText(l, 70, ty); ty += size * 1.3 })

  // 8.3, painted small in the corner — the meal denied everywhere but here
  ctx.font = '700 40px Georgia, serif'
  ctx.textAlign = 'right'
  ctx.fillText((film.score ?? 0).toFixed(1), W - 60, H - 50)
  ctx.textAlign = 'left'

  // sign post bolts
  ctx.fillStyle = '#2a2a20'
  ;[[70, 70], [W - 70, 70], [70, H - 70], [W - 70, H - 70]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill()
  })

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// The peanuts bag label, propped on the counter — plain, generic, our own
// lettering, no brand.
export function makePeanutsLabelTexture() {
  const W = 160, H = 220
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#c9973a'
  ctx.fillRect(0, 0, W, H)
  const r = rngFor(19)
  ctx.globalAlpha = 0.15
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = r() > 0.5 ? '#fff' : '#000'
    ctx.fillRect(r() * W, r() * H, 1.4, 1.4)
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = '#5a3a18'
  ctx.font = '700 30px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText('PEANUTS', W / 2, H / 2)
  ctx.font = '600 16px system-ui, sans-serif'
  ctx.fillText('ROADSIDE · SALTED', W / 2, H / 2 + 30)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Coin faces — our own generic, non-branded emblem (a plain radial star
// device, nothing that reads as legal tender), one per side, so the "he does
// not show you the result" trick is a real material swap, not a camera trick.
function drawCoinFace(ctx, W, H, mark) {
  ctx.fillStyle = '#c8a850'
  ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2 - 4, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#8a7020'
  ctx.lineWidth = 6
  ctx.stroke()
  ctx.fillStyle = '#8a7020'
  ctx.save()
  ctx.translate(W / 2, H / 2)
  if (mark === 'star') {
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      const rad = i % 2 === 0 ? W * 0.32 : W * 0.14
      const x = Math.cos(a) * rad, y = Math.sin(a) * rad
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.arc(0, 0, W * 0.24, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#c8a850'
    ctx.lineWidth = 4
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * W * 0.24, Math.sin(a) * W * 0.24)
      ctx.lineTo(Math.cos(a) * W * 0.36, Math.sin(a) * W * 0.36)
      ctx.stroke()
    }
  }
  ctx.restore()
}

export function makeCoinFaceTexture(mark) {
  const W = 256, H = 256
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  drawCoinFace(ctx, W, H, mark)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// The blank face: what the front station sees once the coin has landed. No
// device at all, just worn metal — the room genuinely withholds the call
// from this side rather than merely angling the camera away from it.
export function makeCoinBlankTexture() {
  const W = 256, H = 256
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#a8905a'
  ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2 - 4, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#7a6438'
  ctx.lineWidth = 6
  ctx.stroke()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
