import * as THREE from 'three'

// Procedural canvas textures for The Departed. Same rule as
// infoTextures.js/mementoTextures.js: no imported assets, every pixel drawn
// here, no film dialogue — the dossier renders Dixon's own verbatim hot take.

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
}

function rngFor(seed) {
  let s = (seed * 2654435761) >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

// Golden-hour sky, gradient only — the sun disc is a separate emissive plane
// (Departed.jsx) so its glow can sit in front of the skyline boxes.
export function makeSkyTexture(top, mid, bottom) {
  const W = 2, H = 512
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, top)
  g.addColorStop(0.6, mid)
  g.addColorStop(1, bottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// P1 polish pass: the roof floor now uses materials.js's own 'gravel'
// generator (aggregate speckle) instead of this hand-rolled one — kept the
// tar-seam + rust-streak decals local since they're specific to this room's
// vent/roof story, not general enough for the shared toolkit.

// Tar seams: a few long dark strokes crossing the roof at roughly regular
// spacing, the tarred-over expansion joints a real membrane roof has. Drawn
// as one big alpha texture rather than N decal quads — cheaper, and a seam
// this long as individual Decal quads would need awkward stretching.
export function makeTarSeamTexture(w, d) {
  const W = 1024, H = Math.round(1024 * (d / w))
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, W, H)
  const r = rngFor(211)
  ctx.strokeStyle = 'rgba(10,8,5,0.55)'
  ctx.lineWidth = 5
  // three long seams running roughly along Z (the roof's long axis in UV Y)
  for (let i = 0; i < 3; i++) {
    const x = W * (0.22 + i * 0.28) + (r() - 0.5) * 40
    ctx.beginPath()
    ctx.moveTo(x, 0)
    let cx = x
    for (let y = 0; y <= H; y += 40) {
      cx += (r() - 0.5) * 10
      ctx.lineTo(cx, y)
    }
    ctx.stroke()
  }
  // one cross-seam
  ctx.beginPath()
  const y0 = H * (0.4 + r() * 0.2)
  ctx.moveTo(0, y0)
  let cy = y0
  for (let x = 0; x <= W; x += 40) {
    cy += (r() - 0.5) * 8
    ctx.lineTo(x, cy)
  }
  ctx.stroke()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// A rust streak running down a metal vent/duct face — a tapered vertical
// stain bleeding from a corroded seam or fastener, orange-brown rather than
// the generic dark scuff/stain decals in detail.jsx.
export function makeRustStreakTexture(seed = 1) {
  const W = 96, H = 220
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, W, H)
  const r = rngFor(seed)
  const drips = 3 + Math.floor(r() * 3)
  for (let i = 0; i < drips; i++) {
    const x = W * (0.2 + r() * 0.6)
    const y0 = H * r() * 0.3
    const len = H * (0.4 + r() * 0.55)
    const w0 = 3 + r() * 5
    const g = ctx.createLinearGradient(x, y0, x, y0 + len)
    g.addColorStop(0, 'rgba(150,70,20,0.75)')
    g.addColorStop(0.5, 'rgba(120,54,16,0.4)')
    g.addColorStop(1, 'rgba(90,40,12,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(x - w0, y0)
    ctx.lineTo(x + w0, y0)
    ctx.lineTo(x + w0 * 0.3, y0 + len)
    ctx.lineTo(x - w0 * 0.3, y0 + len)
    ctx.closePath()
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// The COP / RAT placard — stenciled, our own lettering, swapped by the
// gaze-gated reveal system while the elevator sits open.
export function makeTagTexture(kind) {
  const W = 256, H = 140
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.fillStyle = 'rgba(8,7,4,0.86)'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#c9a227'
  ctx.lineWidth = 4
  ctx.strokeRect(6, 6, W - 12, H - 12)
  ctx.fillStyle = '#f0d68a'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 60px Georgia, serif'
  ctx.fillText(kind, W / 2, H / 2 + 4)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// A single filled bar of a seven-segment digit — a rounded rectangle rather
// than a true trapezoid; at the scale this is actually seen (a small floor
// indicator a few meters off), a bar reads as clean LED segments without the
// far larger amount of geometry a proper trapezoid solve would need.
function bar(ctx, x, y, w, h, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, Math.min(w, h) / 2.2)
  ctx.fill()
}

const SEG = {
  0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc',
  5: 'afgcd', 6: 'afgecd', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
}

function drawSegDigit(ctx, x, y, w, h, digit, on, off) {
  const segs = SEG[digit] || ''
  const t = w * 0.2
  const barH = (h - t * 3) / 2
  const draw = (key, rx, ry, rw, rh) => bar(ctx, x + rx, y + ry, rw, rh, segs.includes(key) ? on : off)
  draw('a', t, 0, w - 2 * t, t)
  draw('f', 0, t, t, barH)
  draw('b', w - t, t, t, barH)
  draw('g', t, t + barH, w - 2 * t, t)
  draw('e', 0, t * 2 + barH, t, barH)
  draw('c', w - t, t * 2 + barH, t, barH)
  draw('d', t, h - t, w - 2 * t, t)
}

// The elevator's own floor indicator, permanently reading the film's score —
// this room's version of Memento's mirrored 10.0.
export function makeFloorIndicatorTexture(score) {
  const W = 320, H = 150
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#0c0a06'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#2a2418'
  ctx.lineWidth = 5
  ctx.strokeRect(4, 4, W - 8, H - 8)

  const on = '#ffb020', off = 'rgba(255,176,32,0.1)'
  const label = (score ?? 0).toFixed(1)
  const [whole, frac] = label.split('.')
  const digW = 66, digH = 96, gap = 14
  let x = 28, y = (H - digH) / 2
  for (const ch of whole) {
    drawSegDigit(ctx, x, y, digW, digH, Number(ch), on, off)
    x += digW + gap
  }
  ctx.fillStyle = on
  ctx.beginPath()
  ctx.arc(x + 6, y + digH - 10, 7, 0, Math.PI * 2)
  ctx.fill()
  x += 28
  for (const ch of frac) {
    drawSegDigit(ctx, x, y, digW, digH, Number(ch), on, off)
    x += digW + gap
  }

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// The hot take, filed as a case-file dossier on the roof vent — same
// centerpiece-verbatim rule as infoTextures.js's sheet, styled as a manila
// folder rather than a printed card.
export function makeDossierTexture(film, palette) {
  const W = 1400, H = 1000
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const paper = palette.paper || '#dccaa0'
  const ink = palette.ink || '#221c14'
  const acc = palette.acc || '#c9a227'

  ctx.fillStyle = '#6a5a3e'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = paper
  ctx.fillRect(30, 90, W - 60, H - 120)
  ctx.fillRect(60, 20, 340, 90)
  ctx.strokeStyle = acc
  ctx.lineWidth = 6
  ctx.strokeRect(30, 90, W - 60, H - 120)

  ctx.fillStyle = acc
  ctx.font = '700 46px Georgia, serif'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('CASE FILE', 92, 82)
  ctx.fillStyle = ink
  ctx.font = '600 26px system-ui, sans-serif'
  ctx.fillText((film.title || '').toUpperCase(), 92, 154)

  ctx.font = 'italic 36px Georgia, serif'
  const text = film.hot_take || 'no hot take on record for this one yet.'
  const words = text.split(/\s+/)
  const maxW = W - 190
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = w }
    else line = test
  }
  if (line) lines.push(line)
  let ty = 240
  lines.forEach((l) => { ctx.fillText(l, 92, ty); ty += 48 })

  ctx.strokeStyle = 'rgba(0,0,0,0.22)'
  ctx.lineWidth = 2
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(92, H - 170 + i * 24)
    ctx.lineTo(W - 92, H - 170 + i * 24)
    ctx.stroke()
  }

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
