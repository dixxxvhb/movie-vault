import * as THREE from 'three'

// Procedural canvas textures for Disclosure Day. Same rule as the other
// bespoke texture files: no imported assets, every pixel drawn here. The
// bronze plaque renders the hot take VERBATIM, in full (brief law 5); the
// scrolling wall speech is this session's own authored civic filler — no
// real names, no em dashes, saying nothing on purpose, per the task.

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
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

// The speech, saying nothing, on purpose. Authored filler, cycled — this is
// the whole review, per the brief ("saying nothing... boring on purpose").
export const SPEECH_FILLER = [
  'in these times, we must consider what consideration requires of us.',
  'the committee remains committed to the ongoing process of remaining committed.',
  'further study is recommended before further study is recommended.',
  'we thank the chair for the opportunity to acknowledge the chair.',
  'a framework is being developed to house the future framework.',
  'this matter has been tabled for continued discussion at a later date.',
  'the record will reflect that the record has been noted.',
  'we remain confident that confidence remains warranted at this time.',
  'the working group has convened to discuss convening the working group.',
  'no further comment is available at this time, or at any other time.',
  'the appropriate channels have been notified through the appropriate channels.',
  'this concludes the portion of the address preceding the next portion.',
]

// A tall, tileable panel of the filler speech, meant to be scrolled via
// texture.offset.y rather than redrawn every frame — cheap, and it reads as
// genuinely infinite because the same block repeats seamlessly.
export function makeSpeechScrollTexture() {
  const W = 512, H = 2048
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#d8d2b8'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#5a5638'
  ctx.font = '400 26px Georgia, serif'
  ctx.textBaseline = 'alphabetic'
  let y = 40
  const lineH = 34
  const maxW = W - 48
  // repeat the filler list twice so the tile seams into itself cleanly
  const doubled = [...SPEECH_FILLER, ...SPEECH_FILLER]
  doubled.forEach((sentence) => {
    const lines = wrapLines(ctx, sentence, maxW)
    lines.forEach((l) => {
      if (y < H - 10) ctx.fillText(l, 24, y)
      y += lineH
    })
    y += lineH * 0.4
  })
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  return tex
}

// 5.2 on a plinth, like a civic award — generic laurel motif, no real seal.
export function makePlinthSealTexture(score) {
  const W = 384, H = 384
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#c8c0a0'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#8a8468'
  ctx.lineWidth = 5
  ctx.strokeRect(10, 10, W - 20, H - 20)
  // generic laurel: two mirrored arcs of leaf-ish marks, never a real seal
  ctx.strokeStyle = '#8a8468'
  ctx.lineWidth = 3
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 0.5 + side * (0.15 + i * 0.16)
      const cx = W / 2 + Math.cos(a) * 120 * side
      const cy = H / 2 + 20 + Math.sin(a) * 120
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(a + Math.PI / 2)
      ctx.beginPath()
      ctx.ellipse(0, 0, 16, 7, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }
  ctx.fillStyle = '#3a3626'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 92px Georgia, serif'
  ctx.fillText((score ?? 0).toFixed(1), W / 2, H / 2 + 6)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// The bronze plaque: the hot take, engraved in full. Sized generously and
// with real margin on every side — a plaque this dense clips badly if it's
// crammed flush to a wall corner or another prop, so this texture and the
// mesh it's mapped to (DisclosureDay.jsx) both budget extra room rather
// than fitting the text tightly to the edge.
export function makeBronzePlaqueTexture(film) {
  const W = 2048, H = 1536
  const c = canvas(W, H)
  const ctx = c.getContext('2d')

  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#6a5228')
  g.addColorStop(0.5, '#8a6c38')
  g.addColorStop(1, '#5a4420')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // brushed-metal streaks
  ctx.globalAlpha = 0.08
  for (let i = 0; i < 400; i++) {
    ctx.strokeStyle = Math.random() > 0.5 ? '#fff' : '#000'
    ctx.lineWidth = 1
    const y = Math.random() * H
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + (Math.random() - 0.5) * 10); ctx.stroke()
  }
  ctx.globalAlpha = 1

  ctx.strokeStyle = '#2c2010'
  ctx.lineWidth = 14
  ctx.strokeRect(50, 50, W - 100, H - 100)

  ctx.fillStyle = '#2c2010'
  ctx.font = '700 52px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText('BY ORDER OF THE RECORD', W / 2, 160)
  ctx.font = '600 32px system-ui, sans-serif'
  ctx.fillText((film.title || '').toUpperCase() + '  ·  ' + (film.score ?? 0).toFixed(1), W / 2, 216)
  ctx.textAlign = 'left'

  const text = film.hot_take || ''
  let size = 40
  let lines = []
  const maxW = W - 220
  const maxH = H - 380
  for (;;) {
    ctx.font = `${size}px Georgia, serif`
    lines = wrapLines(ctx, text, maxW)
    if (lines.length * size * 1.34 <= maxH || size <= 22) break
    size -= 2
  }
  let ty = 300
  lines.forEach((l) => { ctx.fillText(l, 110, ty); ty += size * 1.34 })

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// "REVEAL" — the curtain's own label, stenciled across its face.
export function makeRevealLabelTexture() {
  const W = 1024, H = 220
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#e8e2c8'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 120px Georgia, serif'
  ctx.fillText('REVEAL', W / 2, H / 2)
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}
