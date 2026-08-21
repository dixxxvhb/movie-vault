import * as THREE from 'three'

// Procedural canvas textures for Baby Driver. Same rule as
// infoTextures.js/departedTextures.js: no imported assets, every pixel
// drawn here. The sign band below uses OUR OWN generic lettering — an
// invented bank name, never the film's own signage — per the fidelity
// contract (VAULT-IMMERSION-BRIEF-v2.md §1).

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
}

// A blocky, hand-drawn sans face rather than the system font — reads as
// "cut metal lettering on a bank facade" at the distance this is actually
// seen from, and keeps every glyph procedural rather than leaning on
// whatever font happens to be installed.
function drawBlockGlyph(ctx, ch, x, y, w, h, color) {
  ctx.fillStyle = color
  const t = w * 0.18 // stroke thickness
  const draw = (rx, ry, rw, rh) => ctx.fillRect(x + rx * w, y + ry * h, rw * w, rh * h)
  switch (ch) {
    case 'A':
      draw(0.5 - t / (2 * w) * w, 0, t / w, 1)
      draw(0, 0.4, 1, t / h)
      ctx.save()
      ctx.translate(x + w / 2, y)
      ctx.rotate(-0.22)
      ctx.fillRect(-t / 2, 0, t, h)
      ctx.restore()
      ctx.save()
      ctx.translate(x + w / 2, y)
      ctx.rotate(0.22)
      ctx.fillRect(-t / 2, 0, t, h)
      ctx.restore()
      break
    default: {
      // generic vocabulary for every other letter: a bounding box outline
      // with a couple of internal bars, seeded per-character so each glyph
      // in the word looks distinct without needing a real typeface.
      let s = (ch.charCodeAt(0) * 92821 + 7) >>> 0
      const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
      draw(0, 0, t / w, 1)
      draw(1 - t / w, 0, t / w, 1)
      draw(0, 0, 1, t / h)
      draw(0, 1 - t / h, 1, t / h)
      if (r() > 0.4) draw(0, 0.5 - t / (2 * h), 1, t / h)
    }
  }
}

// A word rendered as a strip of block glyphs, left-aligned — used both for
// the sign band and for smaller signage.
export function makeWordTexture(word, { w = 1024, h = 220, color = '#2a2018', bg = null } = {}) {
  const c = canvas(w, h)
  const ctx = c.getContext('2d')
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h) }
  const letters = word.split('')
  const gap = w * 0.014
  const glyphW = (w - gap * (letters.length - 1)) / letters.length
  const glyphH = h * 0.62
  const y = (h - glyphH) / 2
  letters.forEach((ch, i) => {
    if (ch === ' ') return
    drawBlockGlyph(ctx, ch.toUpperCase(), i * (glyphW + gap), y, glyphW * 0.82, glyphH, color)
  })
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// Crosswalk paint: a single worn white bar, tileable along the strip —
// dirtied at the edges rather than a flat rectangle, so ground clutter
// reads as painted-and-driven-over rather than freshly striped.
export function makeCrosswalkBarTexture(seed = 1) {
  const W = 128, H = 512
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#e8e4d8'
  ctx.fillRect(8, 0, W - 16, H)
  let s = (seed * 60013 + 3) >>> 0
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  ctx.globalAlpha = 0.5
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = r() > 0.5 ? '#000' : '#8a8478'
    ctx.globalAlpha = 0.04 + r() * 0.1
    ctx.fillRect(r() * W, r() * H, 2, 2)
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
