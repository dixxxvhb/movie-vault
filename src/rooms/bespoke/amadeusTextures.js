import * as THREE from 'three'

// Procedural canvas textures for Amadeus. Same rule as every other bespoke
// texture file: no imported assets, every pixel drawn here. The notation
// glyphs are our OWN invented marks — staves, noteheads, flourishes drawn
// from scratch — never real engraving or an actual score. The hot take
// renders Dixon's own verbatim take in a page margin.

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
}

function rngFor(seed) {
  let s = (seed * 2654435761) >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

// One invented "notation" glyph: a stem, a filled or open head, and an
// optional flag/beam stub — shaped like music writing without copying any
// real engraving convention.
function drawGlyph(ctx, x, y, scale, r, ink) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.strokeStyle = ink
  ctx.fillStyle = ink
  ctx.lineWidth = 1.6
  const filled = r() > 0.4
  ctx.beginPath()
  ctx.ellipse(0, 0, 4.2, 3, -0.35, 0, Math.PI * 2)
  if (filled) ctx.fill(); else ctx.stroke()
  // stem
  const stemUp = r() > 0.5
  ctx.beginPath()
  ctx.moveTo(stemUp ? 3.6 : -3.6, 0)
  ctx.lineTo(stemUp ? 3.6 : -3.6, stemUp ? -18 : 18)
  ctx.stroke()
  // occasional flag
  if (r() > 0.6) {
    ctx.beginPath()
    const sy = stemUp ? -18 : 18
    ctx.moveTo(stemUp ? 3.6 : -3.6, sy)
    ctx.quadraticCurveTo((stemUp ? 3.6 : -3.6) + 8, sy + (stemUp ? 5 : -5), (stemUp ? 3.6 : -3.6) + 2, sy + (stemUp ? 12 : -12))
    ctx.stroke()
  }
  ctx.restore()
}

// Draws N deterministic glyphs across a canvas, on invented five-line staves.
// Called with an increasing `count` each redraw using the SAME seed — since
// the rng sequence is deterministic, the first `count` glyphs are identical
// across redraws, so calling this again with a bigger count reads as growth
// rather than a fresh random scatter (the same trick the caption typewriter
// uses elsewhere in this app: redraw fully, keep the seed fixed).
export function makeInkTexture(seed, count, w, h, ink = '#e8dcc0', staveAlpha = 0.4) {
  const c = canvas(w, h)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  const r = rngFor(seed)

  const staveCount = Math.max(3, Math.floor(h / 90))
  ctx.strokeStyle = ink
  ctx.globalAlpha = staveAlpha
  ctx.lineWidth = 1
  for (let s = 0; s < staveCount; s++) {
    const sy = 60 + s * 90
    for (let line = 0; line < 5; line++) {
      ctx.beginPath()
      ctx.moveTo(24, sy + line * 7)
      ctx.lineTo(w - 24, sy + line * 7)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1

  for (let i = 0; i < count; i++) {
    const stave = Math.floor(r() * staveCount)
    const sy = 60 + stave * 90 + 14
    const x = 40 + r() * (w - 80)
    const y = sy + r() * 14
    drawGlyph(ctx, x, y, 1.1 + r() * 0.5, r, ink)
  }

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

// The page on the writing desk: parchment base, ink grows across it first.
export function makePageBaseTexture() {
  const W = 900, H = 1200
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const r = rngFor(2201)
  ctx.fillStyle = '#e4d6ae'
  ctx.fillRect(0, 0, W, H)
  ctx.globalAlpha = 0.06
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = r() > 0.5 ? '#000' : '#fff'
    ctx.fillRect(r() * W, r() * H, 1.4, 1.4)
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// The score, drawn as an ink flourish rather than typeset digits — a
// calligraphic sweep ending in the numeral.
export function makeInkScoreTexture(score) {
  const W = 480, H = 480
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, W, H)
  ctx.strokeStyle = '#e8dcc0'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(40, 340)
  ctx.bezierCurveTo(120, 260, 160, 400, 240, 300)
  ctx.bezierCurveTo(300, 220, 340, 260, 400, 200)
  ctx.stroke()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#f0e6c8'
  ctx.font = 'italic 700 150px Georgia, serif'
  ctx.fillText((score ?? 0).toFixed(1), W / 2, 200)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// The hot take, verbatim, written small in a page margin — a marginal note
// rather than a centerpiece plaque, per the brief's own placement.
export function makeMarginTakeTexture(text) {
  const W = 640, H = 1200
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#3a2c1c'
  ctx.font = 'italic 600 30px Georgia, serif'
  ctx.textBaseline = 'alphabetic'

  const words = (text || '').split(/\s+/)
  const maxW = W - 40
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = w }
    else line = test
  }
  if (line) lines.push(line)
  let y = 60
  lines.forEach((l) => { ctx.fillText(l, 20, y); y += 40 })

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
