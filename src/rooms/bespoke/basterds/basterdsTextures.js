import { CHAPTERS, CHARACTERS } from './content.js'
import { loadImage, wrap, makePaintedTexture } from '../../kit/paint.js'

// the shared painters live in the kit; re-exported so the room's files keep one import
export { loadImage, wrap, makePaintedTexture }

// LE GAMAAR's printed matter: lobby cards, the marquee, tent cards.
// Canvas textures, painted once the period fonts and the images have loaded
// (a card painted in the fallback serif would be read in the fallback serif).
// All images are same-origin (public/stills, public/cast), so no taint.

const BASE = import.meta.env.BASE_URL || '/'
export const stillUrl = (key, png) => BASE + 'stills/inglourious-basterds/' + key + (png ? '.png' : '.jpg')
export const castUrl = (photo) => (photo ? BASE + photo : null)

export const INK = '#1b1612'
export const PAPER = '#efe4cf'
export const RED = '#b3261e'

const FONTS = [
  '700 64px "Bodoni Moda"', 'italic 400 40px "Bodoni Moda"', 'italic 700 40px "Bodoni Moda"',
  '600 40px "Josefin Sans"', '300 40px "Josefin Sans"', '700 40px "Oswald"', '500 40px "Oswald"',
]
let fontsReady = null
export function whenFonts() {
  if (!fontsReady) {
    fontsReady = Promise.all(FONTS.map((f) => document.fonts.load(f).catch(() => null)))
      .then(() => document.fonts.ready)
  }
  return fontsReady
}


// Paper with a little tooth and a darker edge, the way old card stock reads.
function paper(ctx, w, h, seed = 1) {
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, w, h)
  let s = seed * 9301 + 49297
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(90,70,40,${rnd() * 0.05})`
    ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2)
  }
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(80,55,25,0.28)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

// Cover-crop an image into a rect.
function cover(ctx, im, x, y, w, h) {
  const r = Math.max(w / im.width, h / im.height)
  const sw = w / r, sh = h / r
  ctx.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, w, h)
}

const NUM = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE']

// A lobby card: the chapter as the film would hang it in its own foyer.
// cast = vault-data cast list for the film (for actor names and headshots).
export async function paintLobbyCard(canvas, n, cast) {
  const ch = CHAPTERS[n - 1]
  const W = canvas.width, H = canvas.height
  const ctx = canvas.getContext('2d')
  const [still] = await Promise.all([loadImage(stillUrl('ch' + n)), whenFonts()])
  const people = CHARACTERS.filter((c) => c.chapter === n)
  const faces = await Promise.all(people.map((c) => loadImage(castUrl(cast?.find((p) => p.id === c.cast)?.photo))))

  paper(ctx, W, H, n)
  const M = 56
  // the still, inset like a lobby card's photograph
  const sh = Math.round((W - 2 * M) * 9 / 16)
  ctx.fillStyle = INK
  ctx.fillRect(M - 6, M - 6, W - 2 * M + 12, sh + 12)
  if (still) cover(ctx, still, M, M, W - 2 * M, sh)

  let y = M + sh + 70
  ctx.fillStyle = RED
  ctx.font = '600 30px "Josefin Sans"'
  ctx.textAlign = 'left'
  ctx.fillText('CHAPTER ' + NUM[n], M, y)
  ctx.fillStyle = 'rgba(27,22,18,0.55)'
  ctx.textAlign = 'right'
  ctx.fillText((ch.where + ', ' + ch.when).toUpperCase(), W - M, y)
  ctx.textAlign = 'left'

  // the title: big Bodoni, shrunk to fit two lines at most
  let size = 76
  let lines
  do {
    ctx.font = `italic 700 ${size}px "Bodoni Moda"`
    lines = wrap(ctx, ch.title, W - 2 * M)
    size -= 4
  } while (lines.length > 2 && size > 40)
  ctx.fillStyle = INK
  y += size + 22
  for (const l of lines) { ctx.fillText(l, M, y); y += size + 10 }

  // rule
  y += 8
  ctx.fillStyle = INK
  ctx.fillRect(M, y, 120, 3)
  y += 44

  // who enters here: sized first, so the recap can shrink to fit above it
  const n2 = people.length
  const slot = n2 ? Math.min(170, (W - 2 * M) / n2) : 0
  const r = n2 ? Math.min(52, slot / 2 - 12) : 0
  const top = n2 ? H - M - r * 2 - 58 : H - M

  // the recap, 29px down to 21px until it clears the faces
  let fs = 29, rl
  for (;;) {
    ctx.font = `400 ${fs}px Georgia, "Times New Roman", serif`
    rl = wrap(ctx, ch.recap, W - 2 * M)
    if (y + (rl.length - 1) * fs * 1.4 < top - 62 || fs <= 21) break
    fs -= 1
  }
  ctx.fillStyle = 'rgba(27,22,18,0.92)'
  for (const l of rl) { ctx.fillText(l, M, y); y += fs * 1.4 }

  if (n2) {
    ctx.fillStyle = 'rgba(27,22,18,0.5)'
    ctx.font = '600 22px "Josefin Sans"'
    ctx.fillText('WHO WALKS IN', M, top - 22)
    people.forEach((c, i) => {
      const cx = M + slot * i + slot / 2
      const cy = top + r
      ctx.save()
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath()
      ctx.fillStyle = '#cbbfa6'; ctx.fill()
      ctx.clip()
      if (faces[i]) cover(ctx, faces[i], cx - r, cy - r * 1.15, r * 2, r * 2.6)
      ctx.restore()
      ctx.strokeStyle = INK; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = INK
      ctx.textAlign = 'center'
      ctx.font = '600 19px "Josefin Sans"'
      const short = c.name.replace(/^(Col\.|Lt\.|Sgt\.|Pfc\.|Pvt\.|Cpl\.|Maj\.|Gen\.|Staff Sgt\.)\s+/, '')
      const nameLines = wrap(ctx, short.toUpperCase(), slot - 8).slice(0, 2)
      nameLines.forEach((l, k) => ctx.fillText(l, cx, cy + r + 26 + k * 21))
      ctx.textAlign = 'left'
    })
  }
}

