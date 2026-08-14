import * as THREE from 'three'
import { loadImage, roundRect, drawCover, hash } from './vaultTextures.js'

// Two more kinds of photograph, from Dixon's own doctrine:
//
//   "Every film is a photo taken the night it happened: developed and hung
//    (Ledger), faded in the shoebox and scored from memory in pencil (Archive),
//    or undeveloped dark frames awaiting the chemical bath of a rewatch (Hazy)."
//
// So a Shoebox print is the SAME object as a Ledger Polaroid that has been left
// in a box for a decade: yellowed paper, bleached emulsion, and a score in
// PENCIL rather than ink, because a remembered score is a guess. A Dark Drawer
// frame was never developed at all: the image is in there, but you cannot read
// it, and there is no number on it, because there is nothing to write down yet.
//
// Nothing in here ever renders an archive score in the Ledger's hand. Archive
// scores are a different currency and must never read as a Ledger anchor.

const CARD_W = 528
const CARD_H = 648
const PAD = 28
const IMG = CARD_W - PAD * 2

function grain(ctx, seed, n, w, h) {
  let s = seed >>> 0
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.05)'
    ctx.fillRect(rand() * w, rand() * h, 2, 2)
  }
  return rand
}

// Fading is not just "less saturated". A print left in a box loses its dyes
// unevenly — cyan goes first, so old prints drift warm/magenta — and the whole
// image lifts toward the paper as the blacks give up.
function fade(ctx, x, y, w, h, seed) {
  const img = ctx.getImageData(x, y, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2]
    const luma = 0.299 * r + 0.587 * g + 0.114 * b

    // most of the colour is gone
    r = luma * 0.62 + r * 0.38
    g = luma * 0.62 + g * 0.38
    b = luma * 0.62 + b * 0.38

    // cyan dies first: the survivor is a warm, yellowed image
    r = r * 0.72 + 92
    g = g * 0.70 + 84
    b = b * 0.62 + 68

    d[i] = r > 255 ? 255 : r
    d[i + 1] = g > 255 ? 255 : g
    d[i + 2] = b > 255 ? 255 : b
  }
  ctx.putImageData(img, x, y)

  // a bloom of damp coming in from one corner, stable per print
  let s = seed >>> 0
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  const cx = x + (rand() > 0.5 ? w : 0)
  const cy = y + (rand() > 0.5 ? h : 0)
  const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, w * (0.5 + rand() * 0.4))
  g.addColorStop(0, 'rgba(226,206,166,0.55)')
  g.addColorStop(1, 'rgba(226,206,166,0)')
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
}

// Graphite, not ink: soft, broken, laid down twice where the hand pressed.
// This is the whole tell that a Shoebox score is remembered, not recorded.
function pencil(ctx, text, x, y, size, align = 'left') {
  ctx.save()
  ctx.textAlign = align
  ctx.font = `500 ${size}px 'Caveat', 'Segoe Script', cursive`
  ctx.fillStyle = 'rgba(74,71,66,0.62)'
  ctx.fillText(text, x, y)
  // second, offset pass — graphite is never one flat tone
  ctx.fillStyle = 'rgba(38,36,33,0.34)'
  ctx.fillText(text, x + 1.2, y - 0.8)
  ctx.restore()
}

/* --------------------------------------------------------------- the shoebox */

export async function makeShoeboxTexture(film) {
  const c = document.createElement('canvas')
  c.width = CARD_W
  c.height = CARD_H
  const ctx = c.getContext('2d')
  const seed = hash(film.slug + 'shoebox')

  // paper that has yellowed all the way through
  ctx.fillStyle = '#EDE0C4'
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 6)
  ctx.fill()
  grain(ctx, seed, 3600, CARD_W, CARD_H)

  const ix = PAD, iy = PAD
  ctx.save()
  roundRect(ctx, ix, iy, IMG, IMG, 2)
  ctx.clip()
  ctx.fillStyle = '#C9BB9A'
  ctx.fillRect(ix, iy, IMG, IMG)

  const poster = film.poster
    ? await loadImage(import.meta.env.BASE_URL + film.poster)
    : null

  if (poster) {
    drawCover(ctx, poster, ix, iy, IMG, IMG)
    fade(ctx, ix, iy, IMG, IMG, seed)
  } else {
    // No poster on file — usually a franchise row scored as a run. Leave the
    // well empty and let the pencil carry it, rather than inventing art.
    ctx.fillStyle = 'rgba(120,104,74,0.5)'
    ctx.font = "300 150px 'Caveat', 'Segoe Script', cursive"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('?', ix + IMG / 2, iy + IMG / 2)
    ctx.textBaseline = 'alphabetic'
  }
  ctx.restore()

  // the border, in pencil. Score first, then the title measured into what's
  // left — same rule as the Ledger card, since long titles ran into the number.
  const baseY = iy + IMG + 62
  const scoreText = film.memory != null ? film.memory.toFixed(1) : ''
  let scoreW = 0
  if (scoreText) {
    ctx.font = "600 44px 'Caveat', 'Segoe Script', cursive"
    scoreW = ctx.measureText(scoreText).width
    pencil(ctx, scoreText, CARD_W - PAD, baseY, 44, 'right')
  }

  ctx.font = "500 40px 'Caveat', 'Segoe Script', cursive"
  const room = CARD_W - PAD * 2 - scoreW - 20
  let title = film.title
  if (ctx.measureText(title).width > room) {
    while (title.length > 1 && ctx.measureText(title + '…').width > room) {
      title = title.slice(0, -1)
    }
    title = title.replace(/[\s:,-]+$/, '') + '…'
  }
  pencil(ctx, title, PAD, baseY, 40)
  pencil(ctx, 'from memory', PAD, baseY + 34, 25)

  // A favourite gets a star scratched into the corner of the print. It is the
  // one thing `film_titles.affinity` has ever been asked to do, and it belongs
  // on the object rather than in a caption: you are meant to spot it face-down
  // in a pile of thirty-four, the way you would spot your own handwriting.
  if (film.affinity === 'favorite') {
    ctx.save()
    ctx.translate(ix + IMG - 46, iy + 46)
    ctx.rotate(-0.14)
    ctx.strokeStyle = 'rgba(48,44,38,0.55)'
    ctx.lineWidth = 3.4
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      // a five-point star drawn in one stroke, like a hand would
      const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5
      const x = Math.cos(a) * 21
      const y = Math.sin(a) * 21
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
    ctx.restore()
  }

  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/* ----------------------------------------------------------- the dark drawer */

export async function makeDarkFrameTexture(film) {
  const c = document.createElement('canvas')
  c.width = CARD_W
  c.height = CARD_H
  const ctx = c.getContext('2d')
  const seed = hash(film.slug + 'dark')

  // undeveloped stock: the paper is dark too, not a bright card with a dim photo
  ctx.fillStyle = '#161311'
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 6)
  ctx.fill()

  const ix = PAD, iy = PAD
  ctx.save()
  roundRect(ctx, ix, iy, IMG, IMG, 2)
  ctx.clip()
  ctx.fillStyle = '#0B0A09'
  ctx.fillRect(ix, iy, IMG, IMG)

  const poster = film.poster
    ? await loadImage(import.meta.env.BASE_URL + film.poster)
    : null

  if (poster) {
    // The image IS on the frame — it just never met the chemistry. Barely
    // above the paper, so you can tell something is there and not what.
    ctx.globalAlpha = 0.17
    drawCover(ctx, poster, ix, iy, IMG, IMG)
    ctx.globalAlpha = 1
    const img = ctx.getImageData(ix, iy, IMG, IMG)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      const luma = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      d[i] = luma * 0.9
      d[i + 1] = luma * 0.95
      d[i + 2] = luma * 1.12   // a cold, chemical cast
    }
    ctx.putImageData(img, ix, iy)
  }

  // silver halide that never got fixed
  const rand = grain(ctx, seed, 2600, CARD_W, CARD_H)
  ctx.fillStyle = 'rgba(150,170,190,0.05)'
  for (let i = 0; i < 40; i++) {
    ctx.beginPath()
    ctx.arc(ix + rand() * IMG, iy + rand() * IMG, rand() * 3.2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // NO SCORE. There is nothing to write down until it is watched again. The
  // title is scratched on faintly so the frame can be identified at all.
  ctx.save()
  ctx.textAlign = 'left'
  ctx.font = "500 38px 'Caveat', 'Segoe Script', cursive"
  ctx.fillStyle = 'rgba(190,196,205,0.34)'
  let title = film.title
  const room = CARD_W - PAD * 2
  if (ctx.measureText(title).width > room) {
    while (title.length > 1 && ctx.measureText(title + '…').width > room) {
      title = title.slice(0, -1)
    }
    title = title.replace(/[\s:,-]+$/, '') + '…'
  }
  ctx.fillText(title, PAD, iy + IMG + 58)
  ctx.font = "400 25px 'Caveat', 'Segoe Script', cursive"
  ctx.fillStyle = 'rgba(150,158,170,0.26)'
  ctx.fillText('undeveloped', PAD, iy + IMG + 92)
  ctx.restore()

  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/* --------------------------------------------------------------- the scraps */

// A quote is marginalia: a torn corner of paper with a line on it, small enough
// that it never competes with the photograph it sits beside.
export function makeQuoteTexture(q) {
  const W = 420, H = 210
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  const seed = hash((q.quote || '') + (q.said_by || ''))

  ctx.fillStyle = '#EFE7D2'
  ctx.fillRect(0, 0, W, H)
  grain(ctx, seed, 1800, W, H)

  ctx.fillStyle = '#2A2A26'
  ctx.font = "500 30px 'Caveat', 'Segoe Script', cursive"
  ctx.textAlign = 'left'
  let y = 46
  const words = String(q.quote || '').split(' ')
  let line = ''
  const lines = []
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > W - 48 && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  // long lines get trimmed rather than shrunk: a scrap is a scrap
  for (const l of lines.slice(0, 4)) {
    ctx.fillText(l, 24, y)
    y += 34
  }
  if (lines.length > 4) ctx.fillText('…', 24, y)

  if (q.said_by) {
    ctx.font = "400 24px 'Caveat', 'Segoe Script', cursive"
    ctx.fillStyle = '#8A2F2A'
    ctx.textAlign = 'right'
    ctx.fillText('— ' + q.said_by, W - 24, H - 18)
  }

  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
