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

function rng(seed) {
  let s = (seed >>> 0) || 1
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

// Iteration 2 QA fix: the old hand-drawn "block glyph" alphabet produced
// garbled, alien-looking letterforms that read as noise, not a name —
// worse than no sign at all per the architect's polish-pass verdict. A
// plain bold sans via ctx.fillText is still 100% procedural (a system font,
// not an imported asset) and renders our own invented bank name cleanly and
// legibly, properly kerned by the canvas text engine itself.
export function makeWordTexture(word, { w = 1024, h = 220, color = '#2a2018', bg = null, weight = 700 } = {}) {
  const c = canvas(w, h)
  const ctx = c.getContext('2d')
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h) }
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // letter-spaced manually (canvas has no native tracking) — draw glyph by
  // glyph with a fixed advance rather than one fillText call, so a bank
  // facade's own wide-tracked signage reads correctly instead of default
  // font kerning that packs letters too tight to read as architecture.
  const letters = word.toUpperCase().split('')
  const size = h * 0.56
  ctx.font = `${weight} ${size}px Arial, Helvetica, sans-serif`
  const widths = letters.map((ch) => (ch === ' ' ? size * 0.5 : ctx.measureText(ch).width))
  const tracking = size * 0.18
  const totalW = widths.reduce((a, b) => a + b, 0) + tracking * (letters.length - 1)
  let x = (w - totalW) / 2
  const y = h / 2 + size * 0.03
  letters.forEach((ch, i) => {
    ctx.fillText(ch, x + widths[i] / 2, y)
    x += widths[i] + tracking
  })
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// Iteration 2: a bespoke facade panel texture (limestone, not mustard),
// drawn once at the exact panel size so a darker base course and a cornice
// shadow line can be placed at precise heights rather than tiled — the
// materials.js `concrete` kind's blotches are shared by every room using
// it, too large/regular for THIS facade at this scale, and out of scope to
// retune globally for one bespoke room's art direction.
export function makeFacadeTexture(seed = 5) {
  const W = 1024, H = 560 // matches the 10 x 5.2m panel's aspect
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const r = rng(seed)
  // limestone base — desaturated warm grey-tan, not the old mustard
  ctx.fillStyle = '#dcd6c6'
  ctx.fillRect(0, 0, W, H)
  // small, sparse, irregular tonal blotches (weathering) — deliberately
  // smaller radius + lower count + lower alpha than materials.js's generic
  // concrete blotches, which is what read as "too large/regular"
  for (let i = 0; i < 34; i++) {
    const x = r() * W, y = r() * H, rad = 10 + r() * 26
    const amt = (r() - 0.5) * 22
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
    g.addColorStop(0, `rgba(${amt < 0 ? '40,36,28' : '236,228,206'},${0.18 + r() * 0.14})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill()
  }
  // fine stone speckle
  ctx.globalAlpha = 0.05
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = r() > 0.5 ? '#fff' : '#000'
    ctx.fillRect(r() * W, r() * H, 1.4, 1.4)
  }
  ctx.globalAlpha = 1
  // cornice shadow line — a soft dark band near the top, under where the
  // sign band + awning-shadow mesh sit in BabyDriver.jsx
  const cornice = ctx.createLinearGradient(0, H * 0.1, 0, H * 0.24)
  cornice.addColorStop(0, 'rgba(20,16,10,0.32)')
  cornice.addColorStop(1, 'rgba(20,16,10,0)')
  ctx.fillStyle = cornice
  ctx.fillRect(0, H * 0.1, W, H * 0.14)
  // darker base course at street level — the bottom ~14% of the panel
  const base = ctx.createLinearGradient(0, H * 0.86, 0, H)
  base.addColorStop(0, 'rgba(30,26,18,0)')
  base.addColorStop(1, 'rgba(30,26,18,0.38)')
  ctx.fillStyle = base
  ctx.fillRect(0, H * 0.86, W, H * 0.14)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Contact shadow: a soft dark radial-gradient ellipse, laid flat just above
// the ground under the car so its wheels/body read as touching the asphalt
// instead of hovering.
export function makeContactShadowTexture() {
  const S = 256
  const c = canvas(S, S)
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, 'rgba(0,0,0,0.55)')
  g.addColorStop(0.6, 'rgba(0,0,0,0.32)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
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
