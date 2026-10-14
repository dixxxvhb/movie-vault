import * as THREE from 'three'

// Every word on the building (room numbers, window cards, floor bands, the
// sign) is painted once into one canvas and drawn by one material.

const SERIF = 'Georgia, "DejaVu Serif", serif'
const SANS = '"Oswald", "Arial Narrow", "DejaVu Sans", sans-serif'

export class Atlas {
  constructor(width = 2048) {
    this.W = width
    this.items = []
  }

  // Reserve a cell; `draw(g, w, h)` paints it later, once the size is known.
  add(w, h, draw) {
    const item = { w, h, draw, rect: null }
    this.items.push(item)
    return item
  }

  build() {
    // Shelf pack, tallest first.
    const order = this.items.slice().sort((a, b) => b.h - a.h)
    let x = 0
    let y = 0
    let shelf = 0
    const pad = 2
    for (const it of order) {
      if (x + it.w > this.W) { x = 0; y += shelf + pad; shelf = 0 }
      it.px = x
      it.py = y
      x += it.w + pad
      shelf = Math.max(shelf, it.h)
    }
    let H = 1
    while (H < y + shelf) H *= 2
    const c = document.createElement('canvas')
    c.width = this.W
    c.height = H
    const g = c.getContext('2d')
    for (const it of order) {
      g.save()
      g.translate(it.px, it.py)
      g.beginPath()
      g.rect(0, 0, it.w, it.h)
      g.clip()
      it.draw(g, it.w, it.h)
      g.restore()
      it.rect = [it.px / this.W, 1 - (it.py + it.h) / H, (it.px + it.w) / this.W, 1 - it.py / H]
    }
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    this.texture = tex
    this.canvas = c
    return tex
  }
}

function fit(g, text, font, size, maxW) {
  let s = size
  g.font = `${font.replace('$', s)}`
  while (g.measureText(text).width > maxW && s > 8) {
    s -= 1
    g.font = `${font.replace('$', s)}`
  }
  return s
}

// Brass plate with an engraved number.
export function drawPlate(number) {
  return (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h)
    grd.addColorStop(0, '#d9b871')
    grd.addColorStop(0.5, '#a9843f')
    grd.addColorStop(1, '#7c5f2a')
    g.fillStyle = grd
    g.fillRect(0, 0, w, h)
    g.strokeStyle = '#5a4219'
    g.lineWidth = 4
    g.strokeRect(3, 3, w - 6, h - 6)
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    fit(g, number, `600 $px ${SERIF}`, h * 0.78, w - 18)
    g.fillStyle = 'rgba(255,240,200,0.35)'
    g.fillText(number, w / 2 + 1, h / 2 + 3)
    g.fillStyle = '#2a1d08'
    g.fillText(number, w / 2, h / 2 + 2)
  }
}

// The card in the window: title, the night, typed on an index card.
export function drawCard(title, line2) {
  return (g, w, h) => {
    g.fillStyle = '#efe6d2'
    g.fillRect(0, 0, w, h)
    g.fillStyle = 'rgba(160,40,40,0.55)'
    g.fillRect(0, h * 0.27, w, 2)
    g.fillStyle = '#1d1a16'
    g.textAlign = 'left'
    g.textBaseline = 'alphabetic'
    // Title: one line if it fits at a readable size, else two.
    const words = title.split(' ')
    const maxW = w - 24
    let lines = [title]
    g.font = `600 30px ${SERIF}`
    if (g.measureText(title).width > maxW && words.length > 1) {
      let best = null
      for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(' ')
        const b = words.slice(i).join(' ')
        const m = Math.max(g.measureText(a).width, g.measureText(b).width)
        if (!best || m < best.m) best = { m, a, b }
      }
      lines = [best.a, best.b]
    }
    const size = Math.min(...lines.map((l) => fit(g, l, `600 $px ${SERIF}`, lines.length > 1 ? 26 : 32, maxW)))
    g.font = `600 ${size}px ${SERIF}`
    if (lines.length === 1) g.fillText(lines[0], 12, h * 0.62)
    else {
      g.fillText(lines[0], 12, h * 0.5)
      g.fillText(lines[1], 12, h * 0.5 + size)
    }
    g.font = `500 15px ${SANS}`
    g.fillStyle = '#5b5348'
    g.fillText(line2.toUpperCase(), 12, h * 0.2)
  }
}

// Painted lettering, no background: floor bands, curb marks.
export function drawPaint(text, { color = '#e9dfc9', weight = 600, font = SANS, spacing = 4, align = 'center' } = {}) {
  return (g, w, h) => {
    g.fillStyle = color
    g.textBaseline = 'middle'
    g.textAlign = align
    if (g.letterSpacing !== undefined) g.letterSpacing = `${spacing}px`
    const s = fit(g, text, `${weight} $px ${font}`, h * 0.72, w - 12 - spacing * text.length * 0.2)
    g.font = `${weight} ${s}px ${font}`
    g.fillText(text, align === 'center' ? w / 2 : 6, h / 2)
    if (g.letterSpacing !== undefined) g.letterSpacing = '0px'
  }
}

// The pole sign. The name is lit by its floodlight; NO VACANCY is a dead
// tube (plan ruling 5).
export function drawSign(name, sub) {
  return (g, w, h) => {
    g.fillStyle = '#16222b'
    g.fillRect(0, 0, w, h)
    g.strokeStyle = '#c9b48a'
    g.lineWidth = 10
    g.strokeRect(12, 12, w - 24, h - 24)
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillStyle = '#f2e6c8'
    const s = fit(g, name, `700 $px ${SERIF}`, h * 0.32, w - 60)
    g.font = `700 ${s}px ${SERIF}`
    g.fillText(name, w / 2, h * 0.36)
    g.font = `600 ${Math.round(h * 0.09)}px ${SANS}`
    if (g.letterSpacing !== undefined) g.letterSpacing = '10px'
    g.fillStyle = '#c9b48a'
    g.fillText(sub, w / 2, h * 0.58)
    // the dead tube
    g.font = `500 ${Math.round(h * 0.14)}px ${SANS}`
    g.strokeStyle = '#3b4248'
    g.lineWidth = 3
    g.strokeText('NO VACANCY', w / 2, h * 0.8)
    if (g.letterSpacing !== undefined) g.letterSpacing = '0px'
  }
}
