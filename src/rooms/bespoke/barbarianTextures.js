import * as THREE from 'three'

// Procedural canvas textures for Barbarian. Same rule as the other bespoke
// texture files: no imported assets, every pixel drawn here. The index card
// is a PARAPHRASE of Dixon's own recorded reaction (his baby-voice survival
// strategy, the Ronettes line) per this session's own brief, not the film's
// dialogue and not a verbatim quote-block (the hot take itself still
// renders verbatim, elsewhere) — kept short enough to read as something
// actually taped to a door.

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

// Taped index card by the lit door: the survival plan, paraphrased, plus
// the Ronettes note. Never the verbatim hot take (that lives on its own
// surface elsewhere in the room per the brief's own account of this slug).
const CARD_LINES = [
  'SURVIVAL PLAN, TESTED ONCE:',
  'baby voice. "please mommy." total surrender.',
  'tactically correct, per him.',
  '',
  'collateral damage: the ronettes.',
  'ruined in general, forever, now.',
]

export function makeIndexCardTexture() {
  const W = 480, H = 560
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const r = rngFor(211)

  ctx.fillStyle = '#f2ecd8'
  ctx.fillRect(0, 0, W, H)
  ctx.globalAlpha = 0.06
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = r() > 0.5 ? '#000' : '#fff'
    ctx.fillRect(r() * W, r() * H, 1.3, 1.3)
  }
  ctx.globalAlpha = 1
  // faint ruled lines, an actual index card
  ctx.strokeStyle = 'rgba(120,70,70,0.35)'
  ctx.lineWidth = 2
  for (let y = 90; y < H - 30; y += 44) {
    ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(W - 24, y); ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(70,90,140,0.4)'
  ctx.beginPath(); ctx.moveTo(56, 20); ctx.lineTo(56, H - 20); ctx.stroke()

  // tape at the top
  ctx.save()
  ctx.translate(W / 2, 18)
  ctx.rotate((r() - 0.5) * 0.2)
  ctx.fillStyle = 'rgba(230,225,210,0.6)'
  ctx.fillRect(-56, -14, 112, 28)
  ctx.restore()

  ctx.fillStyle = '#241c14'
  ctx.font = '600 30px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive'
  ctx.textBaseline = 'alphabetic'
  let y = 130
  CARD_LINES.forEach((line) => {
    if (!line) { y += 30; return }
    const words = line.split(' ')
    let cur = ''
    const maxW = W - 96
    const out = []
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w
      if (cur && ctx.measureText(t).width > maxW) { out.push(cur); cur = w } else cur = t
    }
    if (cur) out.push(cur)
    out.forEach((l) => { ctx.fillText(l, 68, y); y += 40 })
  })

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// Rating stenciled directly on the lit door upstairs, spray-paint-through-
// a-cutout style — rough edges, slightly uneven fill.
export function makeDoorRatingTexture(score) {
  const W = 512, H = 512
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const r = rngFor(77)
  ctx.clearRect(0, 0, W, H)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#e8e2cc'
  ctx.font = '900 220px Arial Black, Arial, sans-serif'
  ctx.fillText((score ?? 0).toFixed(1), W / 2, H / 2)
  // stencil noise/roughen the edges by punching a few transparent flecks
  ctx.globalCompositeOperation = 'destination-out'
  for (let i = 0; i < 120; i++) {
    ctx.beginPath()
    ctx.arc(W / 2 + (r() - 0.5) * 380, H / 2 + (r() - 0.5) * 200, 2 + r() * 5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}

// A rain-streaked window: dark glass, vertical smears of light bleeding
// through, per "rain outside, cozy lamp grade."
export function makeRainWindowTexture() {
  const W = 256, H = 320
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const r = rngFor(555)
  ctx.fillStyle = '#0a0e14'
  ctx.fillRect(0, 0, W, H)
  ctx.globalAlpha = 0.5
  for (let i = 0; i < 46; i++) {
    const x = r() * W
    const w = 1 + r() * 2.5
    ctx.strokeStyle = `rgba(140,170,200,${0.15 + r() * 0.25})`
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(x, 0)
    let cy = 0
    while (cy < H) {
      cy += 12 + r() * 20
      ctx.lineTo(x + (r() - 0.5) * 6, cy)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}
