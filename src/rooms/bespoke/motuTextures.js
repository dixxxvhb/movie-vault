import * as THREE from 'three'

// Procedural canvas textures for Masters of the Universe. Same rule as the
// other bespoke texture files: no imported assets, every pixel drawn here.
// The proclamation scroll renders the hot take VERBATIM (brief law 5); the
// petition is this session's own authored in-voice content, per the task's
// explicit direction for this slug (one grievance, "respectfully submitted"
// energy), never a quote of anything from the film itself.

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
}

function rngFor(seed) {
  let s = (seed * 2654435761) >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

function wrapLines(ctx, text, maxWidth) {
  const words = (text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (line && ctx.measureText(test).width > maxWidth) { lines.push(line); line = w }
    else line = test
  }
  if (line) lines.push(line)
  return lines
}

function parchment(ctx, W, H, seed, base) {
  const r = rngFor(seed)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, H)
  ctx.globalAlpha = 0.08
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = r() > 0.5 ? '#000' : '#fff'
    ctx.fillRect(r() * W, r() * H, 1.5, 1.5)
  }
  ctx.globalAlpha = 1
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.75)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(60,30,10,0.28)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)
}

// The proclamation scroll: the coronation hot take, verbatim, in a heavy
// ornamental hand — theatrical relish, not restraint.
export function makeProclamationTexture(film) {
  const W = 1400, H = 900
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  parchment(ctx, W, H, 331, '#e8d8a8')

  ctx.strokeStyle = '#5a3a10'
  ctx.lineWidth = 8
  ctx.strokeRect(36, 36, W - 72, H - 72)

  ctx.fillStyle = '#5a3a10'
  ctx.font = '700 44px Georgia, serif'
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'center'
  ctx.fillText('BY PROCLAMATION', W / 2, 106)
  ctx.textAlign = 'left'

  const text = film.hot_take || ''
  let size = 40
  let lines = []
  const maxW = W - 180
  const maxH = H - 280
  for (;;) {
    ctx.font = `italic 600 ${size}px Georgia, serif`
    lines = wrapLines(ctx, text, maxW)
    if (lines.length * size * 1.32 <= maxH || size <= 22) break
    size -= 2
  }
  ctx.fillStyle = '#2c1c08'
  let ty = 190
  lines.forEach((l) => { ctx.fillText(l, 90, ty); ty += size * 1.32 })

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// The petition, propped on the armrest: this session's own authored copy,
// one grievance, formally submitted, never a line from the film.
const PETITION_LINES = [
  'PETITION OF THE VIEWING PUBLIC',
  'One grievance, respectfully entered:',
  '',
  'the shirt should have stayed on.',
  'restoring equilibrium did not require unbuttoning it.',
  'the audience did not ask, and would ask again anyway.',
  '',
  'respectfully submitted.',
]

export function makePetitionTexture() {
  const W = 720, H = 900
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  parchment(ctx, W, H, 552, '#efe4c8')

  ctx.strokeStyle = '#6a4a20'
  ctx.lineWidth = 5
  ctx.strokeRect(24, 24, W - 48, H - 48)

  ctx.fillStyle = '#2c2010'
  ctx.textBaseline = 'alphabetic'
  let y = 110
  PETITION_LINES.forEach((line, i) => {
    if (!line) { y += 34; return }
    ctx.font = i === 0 ? '700 38px Georgia, serif' : (i === PETITION_LINES.length - 1 ? 'italic 600 32px Georgia, serif' : '400 30px Georgia, serif')
    const lines = wrapLines(ctx, line, W - 96)
    lines.forEach((l) => { ctx.fillText(l, 48, y); y += 42 })
  })

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// 8.5 as a royal seal: a wax-seal disc, embossed.
export function makeSealTexture(score) {
  const W = 384, H = 384
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, W, H)
  const r = W / 2 - 8
  ctx.fillStyle = '#7a1c2a'
  ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#c9a860'
  ctx.lineWidth = 6
  ctx.stroke()
  // scalloped edge
  const n = 18
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'
  ctx.lineWidth = 3
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(W / 2 + Math.cos(a) * r * 0.92, H / 2 + Math.sin(a) * r * 0.92, r * 0.14, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = '#e8cf9a'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 120px Georgia, serif'
  ctx.fillText((score ?? 0).toFixed(1), W / 2, H / 2 + 6)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
