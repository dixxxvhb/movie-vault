import * as THREE from 'three'

// Procedural canvas textures for The Sting. Same rule as every other bespoke
// texture file: no imported assets, every pixel drawn here, and the fake
// race names on the chalkboard are ours — never a line of the film's own
// dialogue or any real track's actual card.

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
}

function rngFor(seed) {
  let s = (seed * 2654435761) >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

// Wood-grain wall/floor tint, same construction as Memento's own wall
// texture (vertical streaked grain over a flat base) — the parlor's wood
// tones are a different palette but the same drawing trick reads right.
const woodCache = new Map()
export function makeWoodTexture(tint) {
  if (woodCache.has(tint)) return woodCache.get(tint)
  const S = 512
  const c = canvas(S, S)
  const ctx = c.getContext('2d')
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, S, S)
  const r = rngFor(517)
  ctx.globalAlpha = 0.12
  for (let x = 0; x < S; x += 3) {
    ctx.strokeStyle = r() > 0.5 ? '#1c1206' : '#5a4020'
    ctx.beginPath()
    ctx.moveTo(x + Math.sin(x * 0.04) * 5, 0)
    ctx.lineTo(x + Math.sin(x * 0.04 + 2) * 5, S)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  woodCache.set(tint, tex)
  return tex
}

// Bare stud lumber tint — a paler, unpainted plank grain for the back-of-flat
// geometry, distinct enough from the parlor's stained wood that "raw wood"
// reads at a glance even before you clock the exposed framing shape.
export function makeLumberTexture() {
  const S = 256
  const c = canvas(S, S)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#c8b088'
  ctx.fillRect(0, 0, S, S)
  const r = rngFor(919)
  ctx.globalAlpha = 0.1
  for (let x = 0; x < S; x += 4) {
    ctx.strokeStyle = r() > 0.5 ? '#8a6a3a' : '#e8d8b8'
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + Math.sin(x * 0.1) * 3, S)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// The chalkboard odds: our own invented races and horses, never a real
// track's card. A permanent fixture of the con — Gondorf's whole operation
// runs on a board exactly like this one.
const RACES = [
  { name: 'BRASS DERBY', horses: ['COPPER LATCH 5-2', 'LONG COUNT 3-1', 'IDLE HANDS 8-1'] },
  { name: 'UNION MILE', horses: ["HOOKER'S LUCK 6-5", 'SILENT PARTNER 4-1', 'SNYDER FALLS 12-1'] },
  { name: "GONDORF'S PURSE", horses: ['SURE THING 7-2', 'PAPER TRAIL 9-1', 'DOUBLE CROSS EVEN'] },
]
export function makeChalkboardTexture() {
  const W = 900, H = 620
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#1c2418'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#3a4a30'
  ctx.lineWidth = 10
  ctx.strokeRect(5, 5, W - 10, H - 10)

  ctx.fillStyle = '#e8dcc0'
  ctx.font = '700 40px Georgia, serif'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText("TODAY'S CARD", 30, 60)

  let y = 120
  RACES.forEach((race) => {
    ctx.fillStyle = '#d8cca0'
    ctx.font = 'italic 700 30px Georgia, serif'
    ctx.fillText(race.name, 30, y)
    y += 42
    race.horses.forEach((h) => {
      ctx.fillStyle = '#f0e6cc'
      ctx.font = '28px "Segoe Print", "Bradley Hand", cursive'
      ctx.fillText(h, 60, y)
      y += 40
    })
    y += 20
  })

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// The hot take, painted in big brush strokes on the back of the largest
// flat — found only by walking behind it. Verbatim, per the standing rule.
export function makeHotTakeBrushTexture(film) {
  const W = 1600, H = 1100
  const c = canvas(W, H)
  const ctx = c.getContext('2d')

  ctx.fillStyle = '#c8b088'
  ctx.fillRect(0, 0, W, H)
  const r = rngFor(3311)
  ctx.globalAlpha = 0.08
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = r() > 0.5 ? '#000' : '#fff'
    ctx.fillRect(r() * W, r() * H, 1.6, 1.6)
  }
  ctx.globalAlpha = 1

  ctx.fillStyle = '#241a10'
  ctx.font = '700 34px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('THE STING · 9.6 · THE HOT TAKE', 50, 66)

  const text = film.hot_take || ''
  const words = text.split(/\s+/)
  const maxW = W - 100
  let size = 78
  let lines = []
  for (;;) {
    lines = []
    let line = ''
    ctx.font = `900 ${size}px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive`
    for (const w of words) {
      const test = line ? line + ' ' + w : w
      if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = w }
      else line = test
    }
    if (line) lines.push(line)
    if (lines.length * size * 1.16 <= H - 200 || size <= 34) break
    size -= 4
  }
  ctx.fillStyle = '#2c1c0c'
  const lh = size * 1.16
  const top = 150 + (H - 200 - lines.length * lh) / 2 + size * 0.7
  lines.forEach((l, i) => {
    ctx.save()
    ctx.translate(W / 2, top + i * lh)
    ctx.rotate(Math.sin(i * 9.1) * 0.015)
    ctx.textAlign = 'center'
    ctx.fillText(l, 0, 0)
    ctx.restore()
  })

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

// A crude stencilled sign — the only lettering the FBI office ever gets,
// because the office itself never gets any further than this.
export function makeFbiSignTexture() {
  const W = 320, H = 140
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#4a4a48'
  ctx.fillRect(0, 0, W, H)
  ctx.globalAlpha = 0.35
  const r = rngFor(71)
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = r() > 0.5 ? '#2a2a28' : '#6a6a68'
    ctx.fillRect(r() * W, r() * H, 1.4, 1.4)
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = '#d8d8d4'
  ctx.font = '700 64px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('F.B.I.', W / 2, H / 2 + 6)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
