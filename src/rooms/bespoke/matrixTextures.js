import * as THREE from 'three'

// Matrix's own falling-code alphabet. VAULT-IMMERSION-BRIEF-v2.md §1 is
// explicit that this is the one glyph set the fidelity contract names by
// title: "design our own falling-code alphabet... never the film's set."
// systems/GlyphRain.jsx already drew a small (8-glyph) original alphabet for
// the Tier 2 stand-in; this room asks for a bigger one (~24) so the rain
// reads as a real alphabet rather than eight marks repeating, and this file
// stays inside bespoke/ rather than touching the shared system.
//
// Every glyph is a deterministic mix of straight strokes, arcs and dots —
// same primitive vocabulary as GlyphRain's, scaled up. None of them are
// letters, digits, or the film's own glyph shapes.
const GLYPH_COUNT = 24

let cache = null
export function getMatrixGlyphTextures(color) {
  if (cache && cache.key === color) return cache.textures
  const textures = []
  for (let g = 0; g < GLYPH_COUNT; g++) {
    const c = document.createElement('canvas')
    c.width = c.height = 96
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, 96, 96)
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    let s = (g * 104729 + 61) >>> 0
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    const strokes = 2 + Math.floor(r() * 4)
    for (let i = 0; i < strokes; i++) {
      const kind = Math.floor(r() * 4)
      ctx.globalAlpha = 0.5 + r() * 0.5
      if (kind === 0) {
        ctx.beginPath()
        ctx.moveTo(14 + r() * 24, 14 + r() * 68)
        ctx.lineTo(14 + r() * 68, 14 + r() * 68)
        ctx.stroke()
      } else if (kind === 1) {
        ctx.beginPath()
        ctx.arc(48, 48, 12 + r() * 22, r() * Math.PI * 2, r() * Math.PI * 2 + Math.PI * (0.5 + r()))
        ctx.stroke()
      } else if (kind === 2) {
        ctx.beginPath()
        ctx.arc(20 + r() * 56, 20 + r() * 56, 2.5 + r() * 3, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // a short diagonal tick, distinct from the pure horizontal stroke
        ctx.beginPath()
        ctx.moveTo(20 + r() * 20, 20 + r() * 20)
        ctx.lineTo(56 + r() * 20, 56 + r() * 20)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1
    const t = new THREE.CanvasTexture(c)
    t.needsUpdate = true
    textures.push(t)
  }
  cache = { key: color, textures }
  return textures
}

// A single glyph rendered large and static (not falling) — used to spell out
// the score once it "lands." Draws the SAME stroke vocabulary as the falling
// alphabet above, seeded from the character itself so '9', '.', '8' each get
// a stable, repeatable glyph rather than a new random draw every mount.
export function makeMatrixCharGlyphTexture(charCode, color) {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, S, S)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 12
  ctx.lineCap = 'round'
  let s = (charCode * 92821 + 7) >>> 0
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  const strokes = 3 + Math.floor(r() * 3)
  for (let i = 0; i < strokes; i++) {
    const kind = Math.floor(r() * 3)
    ctx.globalAlpha = 0.6 + r() * 0.4
    if (kind === 0) {
      ctx.beginPath()
      ctx.moveTo(40 + r() * 60, 40 + r() * 176)
      ctx.lineTo(40 + r() * 176, 40 + r() * 176)
      ctx.stroke()
    } else if (kind === 1) {
      ctx.beginPath()
      ctx.arc(128, 128, 34 + r() * 58, r() * Math.PI * 2, r() * Math.PI * 2 + Math.PI * (0.6 + r()))
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(56 + r() * 144, 56 + r() * 144, 7 + r() * 8, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}

// A tall repeating strip of random glyphs for one falling column, scrolled
// via texture.offset.y in the room rather than redrawn per frame.
export function makeGlyphStripTexture(color, seed = 1) {
  const W = 64, ROWS = 20, CELL = 64
  const c = document.createElement('canvas')
  c.width = W
  c.height = ROWS * CELL
  const ctx = c.getContext('2d')
  const glyphs = getMatrixGlyphTextures(color)
  let s = (seed * 60013 + 3) >>> 0
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  for (let row = 0; row < ROWS; row++) {
    const g = glyphs[Math.floor(r() * glyphs.length)]
    ctx.globalAlpha = 0.35 + r() * 0.6
    ctx.drawImage(g.image, 0, row * CELL, W, CELL)
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return tex
}
