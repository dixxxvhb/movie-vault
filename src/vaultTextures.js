import * as THREE from 'three'

// One CanvasTexture per film = the whole Polaroid face: paper frame, the
// bespoke SVG front (or a glyph fallback) in the image well, and the title +
// score handwritten on the lower border. Async because the SVG front loads as
// an <img> first.

const CARD_W = 528          // 2x of the 264x324 CSS card, for crispness
const CARD_H = 648
const PAD = 28              // paper border
const IMG = CARD_W - PAD * 2 // square image well

function loadSVG(svg) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  })
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export async function makeCardTexture(film) {
  const c = document.createElement('canvas')
  c.width = CARD_W
  c.height = CARD_H
  const ctx = c.getContext('2d')
  const pal = film.palette

  // paper
  ctx.fillStyle = '#FFFEF8'
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 6)
  ctx.fill()

  // image well
  const ix = PAD, iy = PAD
  ctx.save()
  roundRect(ctx, ix, iy, IMG, IMG, 2)
  ctx.clip()
  ctx.fillStyle = pal.bg || '#2A2620'
  ctx.fillRect(ix, iy, IMG, IMG)
  const front = film.front ? await loadSVG(film.front) : null
  if (front) {
    ctx.drawImage(front, ix, iy, IMG, IMG)
  } else if (pal.glyph) {
    // glyph fallback (the-sting, etc.)
    ctx.fillStyle = pal.sub || '#8B92A0'
    ctx.globalAlpha = 0.6
    ctx.font = '200px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(pal.glyph, ix + IMG / 2, iy + IMG / 2)
    ctx.globalAlpha = 1
  }
  ctx.restore()

  // title + score, handwritten on the lower border
  const baseY = iy + IMG + 66
  ctx.fillStyle = '#25221C'
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.font = "600 42px 'Caveat', 'Segoe Script', cursive"
  const title = film.title.length > 20 ? film.title.slice(0, 19) + '…' : film.title
  ctx.fillText(title, PAD, baseY)

  ctx.textAlign = 'right'
  ctx.font = "700 46px 'Caveat', 'Segoe Script', cursive"
  ctx.fillText(film.score.toFixed(1), CARD_W - PAD, baseY)

  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}
