import * as THREE from 'three'

// Procedural canvas textures for the diegetic record (InfoSurfaces.jsx). No
// imported assets, no exception: every pixel here is drawn by this file.

function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Greedy word-wrap at a given font, returns the wrapped lines without
// drawing (so fitText can measure before committing to a size).
function wrapLines(ctx, text, maxWidth) {
  const words = (text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

// Shrinks the font until the wrapped block fits maxHeight, floors at minSize.
function fitText(ctx, text, maxWidth, maxHeight, startSize, minSize, lineHeightRatio, fontOf) {
  let size = startSize
  let lines = []
  while (size >= minSize) {
    ctx.font = fontOf(size)
    lines = wrapLines(ctx, text, maxWidth)
    if (lines.length * size * lineHeightRatio <= maxHeight) break
    size -= 2
  }
  return { size: Math.max(size, minSize), lines }
}

// The centerpiece: Dixon's hot take, verbatim, on a board in the film's own
// palette. Auto-sized so a two-word take and a six-sentence rant both read
// clean at the same physical plane size.
export function makeHotTakeTexture(film, palette) {
  const W = 1536, H = 960
  const c = makeCanvas(W, H)
  const ctx = c.getContext('2d')

  const bg = palette.paper || '#f2e9d6'
  const bg2 = palette.paper2 || bg
  const ink = palette.ink || '#221c14'
  const acc = palette.acc || '#a8503e'

  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, bg)
  grad.addColorStop(1, bg2)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // paper grain — cheap, and it's most of what keeps this from reading as a UI card
  ctx.globalAlpha = 0.05
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff'
    ctx.fillRect(Math.random() * W, Math.random() * H, 1.6, 1.6)
  }
  ctx.globalAlpha = 1

  ctx.strokeStyle = acc
  ctx.lineWidth = 7
  ctx.strokeRect(28, 28, W - 56, H - 56)

  ctx.fillStyle = acc
  ctx.font = '600 34px system-ui, sans-serif'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('THE HOT TAKE', 72, 108)
  ctx.font = '600 22px system-ui, sans-serif'
  ctx.fillText(film.title || '', 72, 148)

  ctx.fillStyle = ink
  const text = film.hot_take || 'no hot take on record for this one yet.'
  const fontOf = (size) => `italic ${size}px Georgia, "Iowan Old Style", serif`
  const top = 230
  const { size, lines } = fitText(ctx, text, W - 144, H - top - 60, 68, 28, 1.32, fontOf)
  ctx.font = fontOf(size)
  lines.forEach((l, i) => ctx.fillText(l, 72, top + i * size * 1.32))

  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

// The score, big — a number written on the file rather than typeset into it.
// Sized to fit: "9.9" and "10.0" are a different number of characters, and a
// fixed font size clipped the four-character scores (a 10.0 lost both edges
// off the canvas and read as garbage glyphs).
export function makeScoreTexture(film, palette) {
  const W = 512, H = 512
  const c = makeCanvas(W, H)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = palette.acc || '#e2b955'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const label = (film.score ?? 0).toFixed(1)
  const maxWidth = W * 0.86
  let size = 320
  do {
    ctx.font = `700 ${size}px Georgia, serif`
    size -= 6
  } while (ctx.measureText(label).width > maxWidth && size > 60)

  ctx.fillText(label, W / 2, H / 2 + size * 0.08)
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}

// Meta line (watched date + context) and the vibe-tag chip row, one texture —
// two strong pieces of information beat five weak meshes for the same content.
export function makeMetaTexture(film, palette) {
  const W = 1536, H = 380
  const c = makeCanvas(W, H)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, W, H)

  const ink = palette.ink || '#d8cdb4'
  const sub = palette.sub || '#9a927f'
  const acc = palette.acc || '#c8614b'

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = sub
  ctx.font = '600 32px system-ui, sans-serif'
  const metaLine = [
    film.watched ? 'watched ' + film.watched : null,
    film.context || null,
  ].filter(Boolean).join('   ·   ')
  ctx.fillText(metaLine.toUpperCase(), 4, 46)

  const vibes = film.vibes || []
  let x = 4
  const y = 92
  const chipH = 58
  vibes.forEach((v) => {
    ctx.font = '600 28px system-ui, sans-serif'
    const label = v
    const glyphW = 40
    const textW = ctx.measureText(label).width
    const w = textW + glyphW + 42
    ctx.strokeStyle = acc
    ctx.lineWidth = 2.5
    roundRect(ctx, x, y, w, chipH, chipH / 2)
    ctx.stroke()
    ctx.fillStyle = acc
    ctx.font = '22px system-ui, sans-serif'
    ctx.fillText(palette.glyph || '•', x + 18, y + 38)
    ctx.fillStyle = ink
    ctx.font = '600 28px system-ui, sans-serif'
    ctx.fillText(label, x + glyphW + 6, y + 38)
    x += w + 18
  })

  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}
