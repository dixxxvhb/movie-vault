import * as THREE from 'three'

// Procedural canvas textures for Sorry to Bother You. Same rule as every
// other bespoke texture file: no imported assets, every pixel drawn here.
// The hot take renders Dixon's own verbatim take — "YOURE FUCKING KIDDING"
// — never a line of the film's dialogue.

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
}

function rngFor(seed) {
  let s = (seed * 2654435761) >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

// Office monitor: the rating, in a boring beige call-center CRM readout —
// this room's stand-in for a plaque, styled as the most mundane possible
// object, per the brief's own "mundane office grade."
export function makeOfficeScoreTexture(score, title) {
  const W = 640, H = 420
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#d8d2c0'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#2a4a6a'
  ctx.fillRect(0, 0, W, 56)
  ctx.fillStyle = '#eee'
  ctx.font = '700 28px system-ui, sans-serif'
  ctx.fillText('REGALVIEW CRM', 18, 38)

  ctx.fillStyle = '#3a362c'
  ctx.font = '600 24px system-ui, sans-serif'
  ctx.fillText((title || '').toUpperCase(), 20, 100)
  ctx.fillText('CALLER SATISFACTION SCORE', 20, 134)

  ctx.fillStyle = '#20242a'
  ctx.font = '700 140px Georgia, serif'
  ctx.fillText((score ?? 0).toFixed(1), 40, 300)

  ctx.strokeStyle = '#9a927f'
  ctx.lineWidth = 2
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(20, 340 + i * 18)
    ctx.lineTo(W - 20, 340 + i * 18)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// A small cubicle screen readout — flat sales-call boilerplate, never film
// dialogue, just office wallpaper text to sell the "mundane" half of the cut.
export function makeCubicleScreenTexture(seed) {
  const W = 320, H = 220
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const r = rngFor(seed)
  ctx.fillStyle = '#e8e4d8'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#3a3f46'
  ctx.font = '600 20px system-ui, sans-serif'
  const lines = ['SCRIPT: OPENER', 'NAME: ___________', 'ACCOUNT #: ' + Math.floor(r() * 90000 + 10000), 'STATUS: DIALING']
  lines.forEach((l, i) => ctx.fillText(l, 14, 34 + i * 30))
  ctx.strokeStyle = '#8a8f96'
  ctx.strokeRect(10, 150, W - 20, 50)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// The scream itself: "YOURE FUCKING KIDDING", verbatim, sized and jagged
// like an actual scream — uneven baseline, jittered rotation per word, hot
// gold-on-black so it reads as the loudest object in the penthouse.
export function makeScreamTexture(text) {
  const W = 2048, H = 900
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, W, H)
  const r = rngFor(4402)

  const words = (text || '').split(/\s+/)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // fit a big jagged size to the canvas width
  let size = 210
  ctx.font = `900 ${size}px Impact, "Arial Black", sans-serif`
  while (ctx.measureText(words.join(' ')).width > W * 1.55 && size > 90) {
    size -= 6
    ctx.font = `900 ${size}px Impact, "Arial Black", sans-serif`
  }

  // two ragged lines if it's long, one if short
  const mid = Math.ceil(words.length / 2)
  const lines = words.length > 3 ? [words.slice(0, mid).join(' '), words.slice(mid).join(' ')] : [words.join(' ')]

  const lh = size * 1.05
  const top = H / 2 - ((lines.length - 1) * lh) / 2
  lines.forEach((line, li) => {
    const y = top + li * lh + (r() - 0.5) * 14
    ctx.save()
    ctx.translate(W / 2, y)
    ctx.rotate((r() - 0.5) * 0.05)
    // hard drop shadow for the "sized like a scream" punch
    ctx.shadowColor = 'rgba(232,90,20,0.85)'
    ctx.shadowBlur = 34
    ctx.fillStyle = '#ffe8b0'
    ctx.fillText(line, (r() - 0.5) * 10, 0)
    ctx.restore()
  })

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// Mottled pink-brown organic surface — the "something fleshy and wrong" at
// the penthouse's edges. Blotchy, veined, never a recognizable animal part;
// silhouette geometry in Stby.jsx does the part-horse suggestion, this only
// supplies skin.
export function makeFleshTexture(seed) {
  const S = 256
  const c = canvas(S, S)
  const ctx = c.getContext('2d')
  const r = rngFor(seed)
  ctx.fillStyle = '#8a5a52'
  ctx.fillRect(0, 0, S, S)
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S, rad = 8 + r() * 30
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
    const tone = r() > 0.5 ? '#a06858' : '#6a4038'
    g.addColorStop(0, tone)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, rad, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = 'rgba(60,20,18,0.35)'
  ctx.lineWidth = 1.4
  for (let i = 0; i < 30; i++) {
    ctx.beginPath()
    ctx.moveTo(r() * S, r() * S)
    ctx.bezierCurveTo(r() * S, r() * S, r() * S, r() * S, r() * S, r() * S)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
