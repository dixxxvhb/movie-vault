import * as THREE from 'three'

// Procedural canvas textures for the Memento room. Same rule as
// infoTextures.js: no imported assets, every pixel drawn here. Text on these
// is Dixon's own record (hot take, context, debrief phrases) chopped into
// fragments — never a line of the film's dialogue.

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
}

// tiny deterministic PRNG so a note's paper grain/rotation is stable across
// re-renders without needing to stash random numbers in state
function rngFor(seed) {
  let s = (seed * 2654435761) >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

function paperGrain(ctx, w, h, r, alpha = 0.07) {
  ctx.globalAlpha = alpha
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = r() > 0.5 ? '#000' : '#fff'
    ctx.fillRect(r() * w, r() * h, 1.3, 1.3)
  }
  ctx.globalAlpha = 1
}

// A scrawled marker note pinned to the wall. Deliberately rough: jittered
// per-line baseline and a slight per-line rotation, because a perfectly
// straight system-font paragraph reads as a UI card, not something Leonard
// wrote to himself in a hurry.
export function makeNoteTexture(text, seed) {
  const W = 320, H = 240
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const r = rngFor(seed)

  ctx.fillStyle = '#efe7d2'
  ctx.fillRect(0, 0, W, H)
  paperGrain(ctx, W, H, r, 0.05)
  ctx.strokeStyle = 'rgba(40,32,20,.18)'
  ctx.lineWidth = 3
  ctx.strokeRect(1.5, 1.5, W - 3, H - 3)

  // a strip of tape at the top
  ctx.save()
  ctx.translate(W / 2, 14)
  ctx.rotate((r() - 0.5) * 0.3)
  ctx.fillStyle = 'rgba(230,225,210,.65)'
  ctx.fillRect(-34, -8, 68, 16)
  ctx.restore()

  ctx.fillStyle = '#1c1710'
  const words = text.split(/\s+/)
  const size = words.join(' ').length > 26 ? 26 : 30
  ctx.font = `italic 700 ${size}px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive`
  ctx.textBaseline = 'alphabetic'

  // greedy wrap, then draw each line with a little handwriting jitter
  const maxW = W - 44
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = w }
    else line = test
  }
  if (line) lines.push(line)

  const lh = size * 1.22
  const top = H / 2 - (lines.length * lh) / 2 + size * 0.6
  lines.forEach((l, i) => {
    ctx.save()
    ctx.translate(W / 2, top + i * lh)
    ctx.rotate((r() - 0.5) * 0.05)
    ctx.textAlign = 'center'
    ctx.fillText(l, (r() - 0.5) * 4, 0)
    ctx.restore()
  })

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

// The back of a flippable wall note (Wave T): blank paper, one faint
// scrawled stroke — never text, never a second fragment of the record. The
// note wall's own "there's nothing else written here" beat.
export function makeNoteBackTexture(seed) {
  const W = 320, H = 240
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const r = rngFor(seed + 5500)

  ctx.fillStyle = '#e8dfc6'
  ctx.fillRect(0, 0, W, H)
  paperGrain(ctx, W, H, r, 0.06)
  ctx.strokeStyle = 'rgba(40,32,20,.14)'
  ctx.lineWidth = 3
  ctx.strokeRect(1.5, 1.5, W - 3, H - 3)

  // one faint scrawled stroke, a loose pen gesture rather than a letterform
  ctx.strokeStyle = 'rgba(28,23,16,.22)'
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  const x0 = W * (0.22 + r() * 0.1), y0 = H * (0.4 + r() * 0.15)
  const x1 = W * (0.4 + r() * 0.15), y1 = y0 + (r() - 0.5) * 40
  const x2 = W * (0.7 + r() * 0.15), y2 = y0 + (r() - 0.5) * 50
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.quadraticCurveTo(x1, y1, x2, y2)
  ctx.stroke()

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

// A small polaroid on the wall: a moody, unresolved smear of a photo — never
// an actual frame from anything, just enough shape to read as "a picture of
// somewhere" from across the room.
export function makePolaroidTexture(seed) {
  const W = 220, H = 260
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const r = rngFor(seed + 9001)

  ctx.fillStyle = '#f2ede0'
  ctx.fillRect(0, 0, W, H)
  const photoW = W - 24, photoH = H - 64
  const gx = 12, gy = 12

  const g = ctx.createLinearGradient(0, gy, 0, gy + photoH)
  const dark = mixGray(0.08 + r() * 0.06)
  const mid = mixGray(0.22 + r() * 0.1)
  g.addColorStop(0, dark)
  g.addColorStop(0.55, mid)
  g.addColorStop(1, dark)
  ctx.fillStyle = g
  ctx.fillRect(gx, gy, photoW, photoH)

  // a soft, unresolved blob of light — a window, a lamp, a face; deliberately
  // never legible as anything specific
  ctx.globalAlpha = 0.5
  const rg = ctx.createRadialGradient(
    gx + photoW * (0.3 + r() * 0.4), gy + photoH * (0.3 + r() * 0.3), 4,
    gx + photoW * (0.3 + r() * 0.4), gy + photoH * (0.3 + r() * 0.3), photoW * 0.5
  )
  rg.addColorStop(0, '#e8dcc0')
  rg.addColorStop(1, 'rgba(232,220,192,0)')
  ctx.fillStyle = rg
  ctx.fillRect(gx, gy, photoW, photoH)
  ctx.globalAlpha = 1

  paperGrain(ctx, photoW, photoH, r, 0.08)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

function mixGray(t) {
  const v = Math.round(t * 255)
  return `rgb(${v},${v},${v})`
}

// The floor-sized polaroid: this room's own hot-take sheet, standing in for
// the standard one. Verbatim take, handwritten in big marker strokes across
// a photo area rather than typeset on paper.
export function makeFloorPolaroidTexture(film) {
  const W = 1600, H = 2000
  const c = canvas(W, H)
  const ctx = c.getContext('2d')

  ctx.fillStyle = '#f2ede0'
  ctx.fillRect(0, 0, W, H)
  const bx = 60, by = 60, bw = W - 120, bh = H - 320
  const g = ctx.createLinearGradient(0, by, 0, by + bh)
  g.addColorStop(0, '#141414')
  g.addColorStop(0.5, '#2a2a2a')
  g.addColorStop(1, '#0c0c0c')
  ctx.fillStyle = g
  ctx.fillRect(bx, by, bw, bh)

  const r = rngFor(1016)
  paperGrain(ctx, bw, bh, r, 0.06)

  ctx.save()
  ctx.translate(bx, by)
  ctx.fillStyle = '#f4f0e4'
  ctx.font = 'italic 900 92px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive'
  ctx.textBaseline = 'alphabetic'

  const text = film.hot_take || ''
  const words = text.split(/\s+/)
  const maxW = bw - 90
  const lines = []
  let line = ''
  let size = 92
  ctx.font = `italic 900 ${size}px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive`
  // shrink until it fits the photo area at a readable line count
  for (;;) {
    lines.length = 0
    line = ''
    ctx.font = `italic 900 ${size}px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive`
    for (const w of words) {
      const test = line ? line + ' ' + w : w
      if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = w }
      else line = test
    }
    if (line) lines.push(line)
    if (lines.length * size * 1.18 <= bh - 80 || size <= 40) break
    size -= 4
  }
  const lh = size * 1.18
  const top = (bh - lines.length * lh) / 2 + size * 0.7
  lines.forEach((l, i) => {
    ctx.save()
    ctx.translate(bw / 2, top + i * lh)
    ctx.rotate((Math.sin(i * 12.9) ) * 0.02)
    ctx.textAlign = 'center'
    ctx.fillText(l, 0, 0)
    ctx.restore()
  })
  ctx.restore()

  // the polaroid's own white foot, blank — the take IS the caption here
  ctx.fillStyle = '#1c1710'
  ctx.font = '600 30px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('MEMENTO · 10.0 · THE HOT TAKE', bx, H - 200)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

// The 10.0 itself, drawn once, normal orientation. Hung on the wall it gets
// mirrored by flipping the MESH (scale.x = -1), not the canvas, so this one
// texture serves both the "wrong in the world" plaque and the "right in the
// mirror" reflection without needing a second draw.
export function makeMirrorNumeralTexture() {
  const W = 512, H = 512
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, W, H)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#e7e2d4'
  ctx.font = '700 220px Georgia, serif'
  ctx.fillText('10.0', W / 2, H / 2)
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}
