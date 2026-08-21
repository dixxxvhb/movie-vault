import * as THREE from 'three'

// Procedural canvas textures for the shoebox print rooms' own diegetic
// record (ArchivePencilInfo.jsx) — the memory score IN PENCIL + the print's
// snap line and note (brief §3). Deliberately not infoTextures.js's
// makeScoreTexture/makeHotTakeTexture: those are inked in the film's own
// accent colour and assume a hot take + vibe tags that no archive row
// carries. Everything here stays grey — no accent colour at all — so a
// faded room's record can never be mistaken for a certified Ledger one.

function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function rng(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

function seedOf(str) {
  let h = 0
  for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff
  return h || 1
}

// A hand-drawn-feeling straight edge: a few overlapping, slightly-offset
// passes instead of one clean stroke — the cheapest "pencil" tell that
// doesn't need an actual sketch renderer.
function pencilLine(ctx, x1, y1, x2, y2, r, passes = 2) {
  for (let i = 0; i < passes; i++) {
    const jx = (r() - 0.5) * 3
    const jy = (r() - 0.5) * 3
    ctx.beginPath()
    ctx.moveTo(x1 + jx, y1 + jy)
    ctx.lineTo(x2 + jx, y2 + jy)
    ctx.stroke()
  }
}

function wrapLines(ctx, text, maxWidth) {
  const words = (text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (line && ctx.measureText(test).width > maxWidth) { lines.push(line); line = word }
    else line = test
  }
  if (line) lines.push(line)
  return lines
}

// The memory score, drawn in pencil rather than typeset in the film's accent
// — an archive print's number, not a Ledger score, and it should never carry
// the same visual confidence InfoSurfaces gives a certified film.
export function makePencilScoreTexture(print) {
  const W = 512, H = 512
  const c = makeCanvas(W, H)
  const ctx = c.getContext('2d')
  const r = rng(seedOf(print?.slug) + 7)
  const grey = '#cdc7b3'

  ctx.clearRect(0, 0, W, H)
  ctx.globalAlpha = 0.05
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = grey
    ctx.fillRect(r() * W, r() * H, 2, 2)
  }
  ctx.globalAlpha = 1

  const label = print?.memory != null ? print.memory.toFixed(1) : '—'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const maxWidth = W * 0.8
  let size = 260
  do {
    ctx.font = `italic 600 ${size}px Georgia, serif`
    size -= 6
  } while (ctx.measureText(label).width > maxWidth && size > 60)

  // the wobble: the same glyph drawn three times, faintly offset and fading
  // out, instead of one crisp fill — reads as graphite, not ink
  ;[[0, 0, 0.85], [1.4, -1.1, 0.32], [-1.2, 1.3, 0.22]].forEach(([dx, dy, a]) => {
    ctx.globalAlpha = a
    ctx.fillStyle = grey
    ctx.fillText(label, W / 2 + dx, H / 2 + dy + size * 0.08)
  })
  ctx.globalAlpha = 1

  // a loose pencil ring, not a ruled border
  ctx.strokeStyle = grey
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.4
  const cx = W / 2, cy = H / 2, rad = W * 0.42, steps = 40
  ctx.beginPath()
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const wob = (r() - 0.5) * 6
    const x = cx + Math.cos(a) * (rad + wob)
    const y = cy + Math.sin(a) * (rad + wob)
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.globalAlpha = 1

  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}

// The snap line + note — a print's only writing, same graphite grey as the
// score, no accent colour. No vibe chips: archive rows carry none (brief §3
// says so explicitly), and this sheet is the replacement for InfoSurfaces'
// hot-take card, not an attempt to reproduce it.
export function makePencilNoteTexture(print) {
  const W = 1536, H = 760
  const c = makeCanvas(W, H)
  const ctx = c.getContext('2d')
  const r = rng(seedOf(print?.slug) + 3)
  const grey = '#b7b19c'
  const dim = '#8a8574'

  ctx.clearRect(0, 0, W, H)
  ctx.globalAlpha = 0.045
  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = grey
    ctx.fillRect(r() * W, r() * H, 1.6, 1.6)
  }
  ctx.globalAlpha = 1

  ctx.strokeStyle = grey
  ctx.lineWidth = 3
  ctx.globalAlpha = 0.5
  pencilLine(ctx, 30, 30, W - 30, 30, r)
  pencilLine(ctx, 30, H - 30, W - 30, H - 30, r)
  pencilLine(ctx, 30, 30, 30, H - 30, r)
  pencilLine(ctx, W - 30, 30, W - 30, H - 30, r)
  ctx.globalAlpha = 1

  ctx.fillStyle = dim
  ctx.font = '600 30px system-ui, sans-serif'
  ctx.fillText('FROM MEMORY', 68, 96)

  ctx.fillStyle = grey
  const text = print?.snap || 'not enough of it left to draw.'
  let size = 56
  let lines = []
  do {
    ctx.font = `italic ${size}px Georgia, "Iowan Old Style", serif`
    lines = wrapLines(ctx, text, W - 140)
    if (lines.length * size * 1.3 <= H * 0.5) break
    size -= 2
  } while (size > 28)
  ctx.font = `italic ${size}px Georgia, "Iowan Old Style", serif`
  lines.forEach((l, i) => ctx.fillText(l, 68, 190 + i * size * 1.3))

  if (print?.note) {
    ctx.fillStyle = dim
    ctx.font = 'italic 25px system-ui, sans-serif'
    const noteLines = wrapLines(ctx, print.note, W - 140)
    noteLines.slice(0, 3).forEach((l, i) => ctx.fillText(l, 68, H - 116 + i * 33))
  }

  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}
