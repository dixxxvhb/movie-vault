import * as THREE from 'three'

// Procedural canvas textures for Nightcrawler. Same rule as every other
// bespoke texture file: no imported assets, every pixel drawn here. The
// viewfinder caption renders Dixon's own verbatim hot take, typed on; the
// polaroid renders only the Olympics-judging correction the record actually
// carries ("9.6!" crossed out, 4.6 written beside it) — no invented numbers.

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
}

function rngFor(seed) {
  let s = (seed * 2654435761) >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

// The night sky behind the overlook: clean digital-night gradient, no stars
// (the sodium grid below is the only light source that matters here).
export function makeNightSkyTexture(top, mid, bottom) {
  const W = 2, H = 512
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, top)
  g.addColorStop(0.62, mid)
  g.addColorStop(1, bottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// LA as a sodium-orange emissive grid running to the horizon: a dark ground
// with a fine grid of bright lines, denser/dimmer with distance (faked here
// by two overlaid grid frequencies rather than true depth falloff — this
// texture tiles across a single large ground plane, so the "to the horizon"
// read comes from the plane's own size and the camera's shallow angle on it).
export function makeCityGridTexture() {
  const S = 512
  const c = canvas(S, S)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#050607'
  ctx.fillRect(0, 0, S, S)
  ctx.strokeStyle = '#ff8a2a'
  ctx.globalAlpha = 0.85
  ctx.lineWidth = 1.4
  for (let x = 0; x <= S; x += 16) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S); ctx.stroke()
  }
  for (let y = 0; y <= S; y += 16) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke()
  }
  // scattered brighter nodes — a window/streetlight grid, not a uniform mesh
  const r = rngFor(1401)
  ctx.globalAlpha = 1
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = r() > 0.5 ? '#ffd08a' : '#ff8a2a'
    const x = Math.floor(r() * (S / 16)) * 16
    const y = Math.floor(r() * (S / 16)) * 16
    ctx.fillRect(x - 1.5, y - 1.5, 3, 3)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(14, 14)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Dry brush clump — a rough, low, spiky silhouette scattered along the
// overlook's edge.
export function makeBrushTexture() {
  const W = 128, H = 128
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, W, H)
  const r = rngFor(552)
  ctx.strokeStyle = '#2a2418'
  ctx.lineWidth = 2
  for (let i = 0; i < 60; i++) {
    const x0 = W / 2 + (r() - 0.5) * 30
    const y0 = H - 6
    const a = (r() - 0.5) * 1.6 - Math.PI / 2
    const len = 30 + r() * 60
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x0 + Math.cos(a) * len, y0 + Math.sin(a) * len)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// The viewfinder HUD: corner-bracket + rule-of-thirds geometry is real 3D
// (drawn as meshes in Nightcrawler.jsx, so it stays crisp at any zoom); this
// texture is only the lower-third caption bar, redrawn every frame the
// revealed character count changes so the typewriter effect is visible, plus
// a small camcorder-style readout in the corner carrying the film's score
// (this room's stand-in for a plaque, styled as an exposure/counter readout).
export function makeCaptionTexture(text, revealCount, score) {
  const W = 1024, H = 220
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, W, H)

  // the lower-third bar itself
  ctx.fillStyle = 'rgba(6,8,10,0.72)'
  ctx.fillRect(0, H - 96, W, 96)
  ctx.strokeStyle = 'rgba(255,138,42,0.6)'
  ctx.lineWidth = 2
  ctx.strokeRect(1, H - 95, W - 2, 94)

  const shown = (text || '').slice(0, revealCount)
  ctx.fillStyle = '#f5e6cf'
  ctx.font = '600 40px "Consolas", "Courier New", monospace'
  ctx.textBaseline = 'middle'
  ctx.fillText(shown, 20, H - 48)

  // a blinking cursor while still typing
  if (revealCount < (text || '').length && Math.floor(Date.now() / 400) % 2 === 0) {
    const w = ctx.measureText(shown).width
    ctx.fillRect(24 + w, H - 68, 14, 40)
  }

  // camcorder readout, upper right of the caption canvas — REC time + score
  ctx.font = '600 26px "Consolas", "Courier New", monospace'
  ctx.fillStyle = '#ff8a2a'
  ctx.textAlign = 'right'
  ctx.fillText('EV ' + (score ?? 0).toFixed(1), W - 16, 34)
  ctx.textAlign = 'left'

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

// The polaroid prop on the guardrail — its FRONT is a blank, unresolved
// nighttime smear (same device as Memento's wall polaroids); its BACK carries
// the Olympics-judging correction, verbatim per the record: "9.6!" struck
// through, 4.6 written beside it. Nothing else invented.
export function makeOverlookPolaroidFront() {
  const W = 220, H = 260
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const r = rngFor(9601)
  ctx.fillStyle = '#efe9db'
  ctx.fillRect(0, 0, W, H)
  const gx = 12, gy = 12, pw = W - 24, ph = H - 64
  const g = ctx.createLinearGradient(0, gy, 0, gy + ph)
  g.addColorStop(0, '#0a0d10')
  g.addColorStop(0.5, '#1c2228')
  g.addColorStop(1, '#05070a')
  ctx.fillStyle = g
  ctx.fillRect(gx, gy, pw, ph)
  ctx.globalAlpha = 0.6
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = '#ff8a2a'
    ctx.fillRect(gx + r() * pw, gy + ph * (0.55 + r() * 0.4), 2, 1)
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function makeOverlookPolaroidBack() {
  const W = 220, H = 260
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#e9e2ce'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#20180e'
  ctx.textAlign = 'center'

  ctx.font = 'italic 700 46px Georgia, serif'
  ctx.fillText('"9.6!"', W / 2, 96)
  // the strike-through — the correction, not an erasure
  ctx.strokeStyle = '#a02818'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(W / 2 - 58, 84)
  ctx.lineTo(W / 2 + 58, 100)
  ctx.stroke()

  ctx.font = '700 60px Georgia, serif'
  ctx.fillStyle = '#a02818'
  ctx.fillText('4.6', W / 2, 168)

  ctx.font = '600 18px system-ui, sans-serif'
  ctx.fillStyle = '#5a5040'
  ctx.fillText('the olympics judging incident', W / 2, 210)
  ctx.fillText('corrected', W / 2, 232)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
