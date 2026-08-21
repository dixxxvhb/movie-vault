import * as THREE from 'three'

// Procedural canvas textures for Predestination. Same rule as every other
// bespoke texture file: no imported assets, every pixel drawn here. The ring
// text renders Dixon's own verbatim take — "he her them are also the baby
// that is her he him" — never a line of the film's dialogue.

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
}

function rngFor(seed) {
  let s = (seed * 2654435761) >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

// Corridor wall grain — plain, dim, repeating; the loop's own geometry does
// the work, this texture just needs to tile invisibly at the seam.
export function makeLoopWallTexture(tint) {
  const S = 256
  const c = canvas(S, S)
  const ctx = c.getContext('2d')
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, S, S)
  const r = rngFor(701)
  ctx.globalAlpha = 0.08
  for (let y = 0; y < S; y += 4) {
    ctx.fillStyle = r() > 0.5 ? '#000' : '#5a4020'
    ctx.fillRect(0, y, S, 2)
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2, 1)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// The timeline ribbon's own text ring: a vertical annulus, standard
// RingGeometry UV (u wraps the circumference exactly once, v crosses the
// band's thickness) — a plain horizontal strip of text painted onto a wide
// canvas reads as a closed curved loop once RingGeometry wraps it, no manual
// per-character rotation needed. The phrase repeats a few times around the
// ring so it's legible from any angle and has no seam a viewer would notice
// as a "start" — same effect the brief describes ("reads forever because it
// has no start"), built from the geometry's own wrap rather than faked.
export function makeRingTextTexture(text) {
  const W = 2048, H = 160
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.fillStyle = 'rgba(0,0,0,0)'
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#e8b860'
  ctx.font = '700 64px Georgia, serif'
  ctx.textBaseline = 'middle'
  const unit = (text || '').toUpperCase() + '   ·   '
  const unitW = ctx.measureText(unit).width
  const repeats = Math.max(1, Math.ceil(W / unitW) + 1)
  let x = 0
  for (let i = 0; i < repeats; i++) {
    ctx.fillText(unit, x, H / 2)
    x += unitW
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// The 9.1: the only fixed point, at the ring's own center — plain, still,
// no flourish, everything else in this room moves or loops.
export function makeFixedScoreTexture(score) {
  const W = 420, H = 420
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, W, H)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#f0e0b8'
  ctx.font = '700 160px Georgia, serif'
  ctx.fillText((score ?? 0).toFixed(1), W / 2, H / 2)
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}

// The certified badge, stamped onto a coaster prop.
export function makeCertifiedBadgeTexture() {
  const S = 256
  const c = canvas(S, S)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#3a2c1c'
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, S / 2 - 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#e8b860'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, S / 2 - 14, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#e8b860'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 34px Georgia, serif'
  ctx.fillText('CERTIFIED', S / 2, S / 2 - 8)
  ctx.font = '600 20px system-ui, sans-serif'
  ctx.fillText('FIRST WATCH', S / 2, S / 2 + 26)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
