import { whenFonts, wrap, INK, RED, PAPER } from './basterdsTextures.js'

// LA LOUISIANE's printed matter: the "Who am I?" cards, the banner, the clock
// face, the napkin. Plan §4.6.

function tooth(ctx, W, H, seed = 3, a = 0.05) {
  let s = seed * 7919 + 17
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  for (let i = 0; i < (W * H) / 260; i++) {
    ctx.fillStyle = `rgba(90,70,40,${rnd() * a})`
    ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2)
  }
}

// The card's back pattern, shared by the deck and the face-down side.
export function paintCardBack(canvas) {
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.fillStyle = '#6e1712'; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(241,232,218,0.55)'; ctx.lineWidth = 4
  ctx.strokeRect(18, 18, W - 36, H - 36)
  ctx.strokeStyle = 'rgba(241,232,218,0.18)'; ctx.lineWidth = 2
  for (let k = -H; k < W; k += 26) {
    ctx.beginPath(); ctx.moveTo(k, 30); ctx.lineTo(k + H, H - 30); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(k + H, 30); ctx.lineTo(k, H - 30); ctx.stroke()
  }
}

const SIDE = { hunted: 'THE HUNTED', reich: 'THE REICH' }
const NUM = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX']

// The front: the question and three clues, never the name.
// card = { kind: 'character' | 'bonus' | 'guest', ... }
export async function paintWhoAmI(canvas, card) {
  await whenFonts()
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H)
  tooth(ctx, W, H, card.seed || 3)
  ctx.strokeStyle = 'rgba(27,22,18,0.4)'; ctx.lineWidth = 3
  ctx.strokeRect(14, 14, W - 28, H - 28)

  ctx.textAlign = 'center'
  ctx.fillStyle = card.kind === 'bonus' ? '#7a5a1e' : RED
  ctx.font = '600 22px "Josefin Sans"'
  ctx.fillText(card.kind === 'bonus' ? 'BONUS ROUND' : card.kind === 'guest' ? 'THE LAST CARD' : 'LA LOUISIANE', W / 2, 56)
  ctx.fillStyle = INK
  ctx.font = 'italic 700 74px "Bodoni Moda"'
  ctx.fillText('Who am I?', W / 2, 148)
  ctx.fillRect(W / 2 - 60, 176, 120, 3)

  const clues = card.kind === 'character'
    ? [['CHAPTER', NUM[card.chapter]], ['SIDE', SIDE[card.side]], ['ON MY SEAT', card.object], ['WHAT I DO', card.who]]
    : card.clues
  let y = 236
  ctx.textAlign = 'left'
  for (const [label, text] of clues) {
    ctx.fillStyle = 'rgba(27,22,18,0.5)'
    ctx.font = '600 18px "Josefin Sans"'
    ctx.fillText(label, 40, y); y += 34
    ctx.fillStyle = INK
    ctx.font = '400 27px Georgia, serif'
    for (const l of wrap(ctx, text, W - 80).slice(0, 4)) { ctx.fillText(l, 40, y); y += 34 }
    y += 16
  }
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(27,22,18,0.45)'
  ctx.font = 'italic 400 20px Georgia, serif'
  ctx.fillText('Touch the card to turn it over.', W / 2, H - 34)
}

// The back of a bonus card or the guest card: a name and who they were.
export async function paintAnswer(canvas, card) {
  await whenFonts()
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H)
  tooth(ctx, W, H, (card.seed || 3) + 11)
  ctx.strokeStyle = 'rgba(27,22,18,0.4)'; ctx.lineWidth = 3
  ctx.strokeRect(14, 14, W - 28, H - 28)
  ctx.textAlign = 'center'
  ctx.fillStyle = card.kind === 'guest' ? RED : '#7a5a1e'
  ctx.font = '600 22px "Josefin Sans"'
  ctx.fillText(card.kind === 'guest' ? 'CHAPTER SIX' : 'ON A FOREHEAD IN THE TAVERN', W / 2, 60)
  ctx.fillStyle = INK
  let size = 76, lines
  do { ctx.font = `italic 700 ${size}px "Bodoni Moda"`; lines = wrap(ctx, card.name, W - 70); size -= 4 } while (lines.length > 2 && size > 40)
  let y = 200
  for (const l of lines) { ctx.fillText(l, W / 2, y); y += size + 8 }
  ctx.fillRect(W / 2 - 60, y - 20, 120, 3)
  y += 40
  ctx.font = '400 28px Georgia, serif'
  for (const l of wrap(ctx, card.answer, W - 80)) { ctx.fillText(l, W / 2, y); y += 38 }
  if (card.fate) {
    y += 18
    ctx.fillStyle = RED
    ctx.font = 'italic 400 28px Georgia, serif'
    for (const l of wrap(ctx, card.fate, W - 80)) { ctx.fillText(l, W / 2, y); y += 38 }
  }
}

// Bunting over the bar: a new baby at the next table.
export async function paintBanner(canvas) {
  await whenFonts()
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.clearRect(0, 0, W, H)
  // the cloth, sagging a little
  ctx.fillStyle = '#e8dcc2'
  ctx.beginPath()
  ctx.moveTo(0, 20); ctx.quadraticCurveTo(W / 2, 60, W, 20)
  ctx.lineTo(W, H - 50); ctx.quadraticCurveTo(W / 2, H - 10, 0, H - 50)
  ctx.closePath(); ctx.fill()
  tooth(ctx, W, H, 21, 0.08)
  ctx.fillStyle = '#2b4a78'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = '700 118px "Oswald"'
  ctx.fillText('ES IST EIN JUNGE!', W / 2, H / 2 + 12)
  ctx.fillStyle = 'rgba(43,74,120,0.7)'
  ctx.font = 'italic 400 34px Georgia, serif'
  ctx.fillText("it's a boy", W / 2, H - 44)
}

export function paintClock(canvas) {
  const ctx = canvas.getContext('2d')
  const W = canvas.width, c = W / 2
  ctx.fillStyle = '#efe4cf'; ctx.beginPath(); ctx.arc(c, c, c - 4, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.stroke()
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = '400 30px "Bodoni Moda", Georgia, serif'
  const R = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']
  R.forEach((r, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2
    ctx.fillText(r, c + Math.cos(a) * (c - 38), c + Math.sin(a) * (c - 38))
  })
}

// The napkin she signed for the baby. Her signature, and nothing else.
export async function paintNapkin(canvas) {
  await whenFonts()
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.fillStyle = '#f6f1e6'; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(120,100,70,0.25)'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke()
  ctx.strokeStyle = 'rgba(120,100,70,0.35)'; ctx.strokeRect(10, 10, W - 20, H - 20)
  ctx.fillStyle = '#1d2a5a'
  ctx.textAlign = 'center'
  ctx.save(); ctx.translate(W / 2, H / 2 + 10); ctx.rotate(-0.12)
  ctx.font = 'italic 400 64px "Bodoni Moda"'
  ctx.fillText('Bridget', 0, -26)
  ctx.font = 'italic 400 46px "Bodoni Moda"'
  ctx.fillText('von Hammersmark', 0, 36)
  ctx.restore()
}
