import * as THREE from 'three'

function wrapLines(ctx, text, maxWidth) {
  const words = (text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (line && ctx.measureText(test).width > maxWidth) { lines.push(line); line = w } else line = test
  }
  if (line) lines.push(line)
  return lines
}

// The venetian-blind gobo: alternating opaque/transparent bars, drawn once
// and reused everywhere the stripe pattern is needed (the key light plane
// and the floor decal both read this same texture, so the stripes line up
// between the two).
let goboTex = null
export function makeBlindsGoboTexture() {
  if (goboTex) return goboTex
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, S, S)
  const bars = 9
  const barH = S / bars
  for (let i = 0; i < bars; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0)'
    ctx.fillRect(0, i * barH, S, barH * 0.62)
  }
  goboTex = new THREE.CanvasTexture(c)
  goboTex.wrapS = goboTex.wrapT = THREE.RepeatWrapping
  return goboTex
}

// The chalk crack of the case: Dixon's own verbatim line (the fragment the
// brief names), rendered rough and slightly uneven like real chalk on a
// dark wall, credited underneath.
export function makeChalkTexture(text, credit) {
  const W = 1400, H = 700
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#1c1c1a'
  ctx.fillRect(0, 0, W, H)
  ctx.globalAlpha = 0.05
  let s = 19
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = r() > 0.5 ? '#fff' : '#000'
    ctx.fillRect(r() * W, r() * H, 1.4, 1.4)
  }
  ctx.globalAlpha = 1

  ctx.fillStyle = '#e9e5da'
  ctx.textBaseline = 'alphabetic'
  let size = 58
  let lines = []
  do {
    ctx.font = `${size}px "Segoe Print", "Comic Sans MS", cursive`
    lines = wrapLines(ctx, text, W - 140)
    size -= 3
  } while (lines.length * size * 1.3 > H - 180 && size > 26)
  ctx.font = `${size}px "Segoe Print", "Comic Sans MS", cursive`
  const top = 90
  lines.forEach((l, i) => {
    // a slight per-line jitter so it doesn't read as typeset
    const jx = (i % 2 === 0 ? -1 : 1) * 4
    ctx.fillText(l, 70 + jx, top + i * size * 1.3)
  })

  ctx.font = '600 34px Georgia, serif'
  ctx.fillStyle = '#b8b2a0'
  ctx.fillText(credit, 70, H - 60)

  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}

// A close-up score plane, drawn in the same rough style so both numerals
// (the true one and the lying one) share a hand-marked look rather than a
// typeset score card.
export function makeMarkedScoreTexture(label, color) {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, S, S)
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 260px Georgia, serif'
  ctx.fillText(label, S / 2, S / 2 + 20)
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}
