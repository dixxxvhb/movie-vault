import * as THREE from 'three'

// One CanvasTexture per film = the whole Polaroid face: paper frame, the
// photograph in the image well, and the title + score handwritten on the lower
// border. The image well prefers the real movie poster (vendored into
// public/posters at build time) and falls back to the bespoke SVG front, then
// to a glyph. Async because the image loads first.

const CARD_W = 528          // 2x of the 264x324 CSS card, for crispness
const CARD_H = 648
const PAD = 28              // paper border
const IMG = CARD_W - PAD * 2 // square image well

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

const loadSVG = (svg) =>
  loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Cover-fit: fill the square well, cropping the overflow. Posters are 2:3, so
// this crops top and bottom and keeps the art rather than the title block.
function drawCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) * 0.38, dw, dh)
}

// The Polaroid grade: lifted blacks, warm shift, gentle desaturation, and a
// green-cyan bias in the highlights. This is what makes a printed poster read
// as a photograph someone took and pinned up, rather than box art.
function gradeEmulsion(ctx, x, y, w, h, seed) {
  const img = ctx.getImageData(x, y, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2]

    const luma = 0.299 * r + 0.587 * g + 0.114 * b
    // desaturate slightly toward luminance
    r = luma * 0.24 + r * 0.76
    g = luma * 0.24 + g * 0.76
    b = luma * 0.24 + b * 0.76

    // lift the blacks, compress the whites — instant-film has no true black
    r = r * 0.84 + 26
    g = g * 0.84 + 24
    b = b * 0.84 + 27

    // warm the midtones, cool the shadows a touch
    r *= 1.06
    b *= 0.95
    if (luma < 90) b += 8

    d[i] = r > 255 ? 255 : r
    d[i + 1] = g > 255 ? 255 : g
    d[i + 2] = b > 255 ? 255 : b
  }
  ctx.putImageData(img, x, y)

  // exposure falloff toward the corners of the print
  const g2 = ctx.createRadialGradient(
    x + w / 2, y + h / 2, w * 0.28,
    x + w / 2, y + h / 2, w * 0.78
  )
  g2.addColorStop(0, 'rgba(0,0,0,0)')
  g2.addColorStop(1, 'rgba(30,18,10,0.32)')
  ctx.fillStyle = g2
  ctx.fillRect(x, y, w, h)

  // a few emulsion specks, stable per card
  let s = seed >>> 0
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  ctx.fillStyle = 'rgba(255,252,240,0.30)'
  for (let i = 0; i < 26; i++) {
    ctx.beginPath()
    ctx.arc(x + rand() * w, y + rand() * h, rand() * 1.6, 0, Math.PI * 2)
    ctx.fill()
  }
}

function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff
  return h
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

  const poster = film.poster
    ? await loadImage(import.meta.env.BASE_URL + film.poster)
    : null

  if (poster) {
    drawCover(ctx, poster, ix, iy, IMG, IMG)
    gradeEmulsion(ctx, ix, iy, IMG, IMG, hash(film.slug))
  } else {
    const front = film.front ? await loadSVG(film.front) : null
    if (front) {
      ctx.drawImage(front, ix, iy, IMG, IMG)
    } else if (pal.glyph) {
      ctx.fillStyle = pal.sub || '#8B92A0'
      ctx.globalAlpha = 0.6
      ctx.font = '200px serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(pal.glyph, ix + IMG / 2, iy + IMG / 2)
      ctx.globalAlpha = 1
    }
  }
  ctx.restore()

  // title + score, handwritten on the lower border. The score is laid down
  // first and the title is measured to fit what's left — a character-count
  // truncation is not enough, since handwriting is proportional and long
  // titles ran straight through the score.
  const baseY = iy + IMG + 66
  ctx.fillStyle = '#25221C'
  ctx.textBaseline = 'alphabetic'

  const scoreText = film.score.toFixed(1)
  ctx.textAlign = 'right'
  ctx.font = "700 46px 'Caveat', 'Segoe Script', cursive"
  ctx.fillText(scoreText, CARD_W - PAD, baseY)
  const scoreW = ctx.measureText(scoreText).width

  ctx.textAlign = 'left'
  ctx.font = "600 42px 'Caveat', 'Segoe Script', cursive"
  const room = CARD_W - PAD * 2 - scoreW - 18
  let title = film.title
  if (ctx.measureText(title).width > room) {
    while (title.length > 1 && ctx.measureText(title + '…').width > room) {
      title = title.slice(0, -1)
    }
    title = title.replace(/[\s:,-]+$/, '') + '…'
  }
  ctx.fillText(title, PAD, baseY)

  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

// The reverse of the print: blank instant-film backing, scrawled on by someone
// who cannot trust his own memory.
export function makeBackTexture(film) {
  const c = document.createElement('canvas')
  c.width = CARD_W
  c.height = CARD_H
  const ctx = c.getContext('2d')

  ctx.fillStyle = '#efe7d5'
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 6)
  ctx.fill()

  // backing-paper grain
  let s = hash(film.slug + 'back') >>> 0
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  for (let i = 0; i < 5200; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.05)'
    ctx.fillRect(rand() * CARD_W, rand() * CARD_H, 2, 2)
  }

  ctx.fillStyle = '#1d2a3a'
  ctx.textAlign = 'left'
  ctx.font = "600 44px 'Caveat', 'Segoe Script', cursive"
  wrap(ctx, film.title, 44, 96, CARD_W - 88, 50)

  // wrapped, not single-line: two-director credits ran clean off the paper
  ctx.font = "400 30px 'Caveat', 'Segoe Script', cursive"
  ctx.fillStyle = '#3b4657'
  const maxW = CARD_W - 88
  let y = 210
  y = wrap(ctx, film.watched, 44, y, maxW, 40) + 40
  if (film.director?.length) y = wrap(ctx, film.director.join(', '), 44, y, maxW, 38) + 40
  if (film.runtime) { ctx.fillText(film.runtime + ' min', 44, y); y += 40 }
  if (film.genres?.length) wrap(ctx, film.genres.join(' · '), 44, y, maxW, 38)

  // the score, circled, the way you'd mark something you must not forget
  ctx.font = "700 92px 'Caveat', 'Segoe Script', cursive"
  ctx.fillStyle = '#8c2b26'
  ctx.textAlign = 'center'
  ctx.fillText(film.score.toFixed(1), CARD_W / 2, 470)
  ctx.strokeStyle = 'rgba(140,43,38,0.75)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.ellipse(CARD_W / 2, 442, 104, 66, -0.08, 0, Math.PI * 2)
  ctx.stroke()

  ctx.font = "400 26px 'Caveat', 'Segoe Script', cursive"
  ctx.fillStyle = '#5a6472'
  ctx.fillText('turn me over', CARD_W / 2, CARD_H - 58)

  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

function wrap(ctx, text, x, y, maxW, lh) {
  const words = String(text).split(' ')
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y)
      y += lh
      line = w
    } else line = test
  }
  if (line) ctx.fillText(line, x, y)
  return y
}
