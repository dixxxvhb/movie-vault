import { whenFonts, loadImage, wrap, INK, RED } from './basterdsTextures.js'

// The street's printed and painted surfaces. Reference: the film's own Le
// Gamaar at night (public/stills/inglourious-basterds/facade.jpg): cream lit
// marquee panels with black and red letters, white freestanding name letters,
// a painted poster panel above.

// The marquee band. state 'premiere' = Nation's Pride; 'ladder' = the day
// Zoller first talked to her: the 1929 mountain film Die weisse Holle vom Piz
// Palu, starring Leni Riefenstahl, with letters missing mid-change.
export async function paintMarquee(canvas, state) {
  await whenFonts()
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.fillStyle = '#f6ead2'
  ctx.fillRect(0, 0, W, H)
  // panel seams, the way a real marquee is built from lit boxes
  ctx.fillStyle = 'rgba(60,40,20,0.35)'
  for (let x = 0; x < W; x += W / 12) ctx.fillRect(x, 0, 3, H)
  ctx.fillRect(0, H * 0.5 - 1, W, 2)
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, 'rgba(255,240,200,0.0)')
  g.addColorStop(1, 'rgba(120,80,30,0.18)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (state === 'ladder') {
    // mid-change: gaps where letters are down in the crate on the pavement
    ctx.fillStyle = INK
    ctx.font = `700 ${H * 0.34}px Oswald`
    ctx.fillText('DIE WEISSE H  LLE VOM PIZ PALÜ', W / 2, H * 0.27)
    ctx.font = `500 ${H * 0.2}px Oswald`
    ctx.fillText('AVEC  LENI  RIEFENST  HL', W / 2, H * 0.72)
  } else {
    ctx.fillStyle = RED
    ctx.font = `700 ${H * 0.36}px Oswald`
    ctx.fillText("STOLZ DER NATION", W / 2, H * 0.27)
    ctx.fillStyle = INK
    ctx.font = `500 ${H * 0.2}px Oswald`
    ctx.fillText('AVEC  FREDRICK  ZOLLER          GALA  CE SOIR', W / 2, H * 0.72)
  }
}

// LE GAMAAR in freestanding white letters (transparent canvas).
export async function paintNameSign(canvas) {
  await whenFonts()
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#fbf6ea'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `600 ${canvas.height * 0.78}px "Josefin Sans"`
  ctx.fillText('LE GAMAAR', canvas.width / 2, canvas.height * 0.56)
}

// The painted premiere poster over the marquee: an original design, a sniper's
// bell tower against a red sky, the way a 1944 propaganda one-sheet would be
// painted. No symbols.
export async function paintPoster(canvas) {
  await whenFonts()
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#c9301f'); g.addColorStop(0.65, '#7c1a12'); g.addColorStop(1, '#2a0d09')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  // the tower
  ctx.fillStyle = '#140a07'
  const tx = W * 0.72
  ctx.fillRect(tx - W * 0.045, H * 0.28, W * 0.09, H * 0.72)
  ctx.beginPath(); ctx.moveTo(tx - W * 0.06, H * 0.3); ctx.lineTo(tx, H * 0.08); ctx.lineTo(tx + W * 0.06, H * 0.3); ctx.fill()
  ctx.fillStyle = '#e8c27a'
  ctx.fillRect(tx - W * 0.012, H * 0.36, W * 0.024, H * 0.06)
  // the scope ring
  ctx.strokeStyle = 'rgba(246,234,210,0.85)'
  ctx.lineWidth = H * 0.018
  ctx.beginPath(); ctx.arc(tx, H * 0.39, H * 0.17, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(tx - H * 0.24, H * 0.39); ctx.lineTo(tx + H * 0.24, H * 0.39)
  ctx.moveTo(tx, H * 0.15); ctx.lineTo(tx, H * 0.63); ctx.stroke()
  // type
  ctx.fillStyle = '#f6ead2'
  ctx.textAlign = 'left'
  ctx.font = `700 ${H * 0.2}px Oswald`
  ctx.fillText('STOLZ', W * 0.06, H * 0.34)
  ctx.fillText('DER NATION', W * 0.06, H * 0.56)
  ctx.font = `italic 700 ${H * 0.085}px "Bodoni Moda"`
  ctx.fillText('mit Fredrick Zoller als er selbst', W * 0.06, H * 0.72)
  ctx.font = `600 ${H * 0.06}px "Josefin Sans"`
  ctx.fillStyle = 'rgba(246,234,210,0.75)'
  ctx.fillText('PREMIÈRE DE GALA  ·  LE GAMAAR', W * 0.06, H * 0.88)
}

// A Haussmann front: pale stone, tall windows in a grid, a few lit.
export function paintBuilding(canvas, seed = 1) {
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  let s = seed * 7919
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  ctx.fillStyle = '#6b6258'
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = `rgba(20,16,12,${rnd() * 0.08})`
    ctx.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 6, 1 + rnd() * 3)
  }
  // courses of stone
  ctx.fillStyle = 'rgba(20,16,12,0.18)'
  for (let y = 0; y < H; y += H / 40) ctx.fillRect(0, y, W, 1.5)
  const cols = 4, rows = 5
  const cw = W / cols, rh = H / (rows + 0.6)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + cw * 0.28, y = H - (r + 1) * rh + rh * 0.12, w = cw * 0.44, h = rh * 0.62
      const lit = rnd() < 0.22
      ctx.fillStyle = lit ? (rnd() < 0.5 ? '#f0c27a' : '#e6a95c') : '#16120f'
      ctx.fillRect(x, y, w, h)
      if (lit) {
        ctx.fillStyle = 'rgba(40,20,5,0.35)'
        ctx.fillRect(x + w * 0.1, y, w * 0.12, h)
        ctx.fillRect(x + w * 0.78, y, w * 0.12, h)
      }
      ctx.fillStyle = 'rgba(12,10,8,0.9)'
      ctx.fillRect(x + w / 2 - 1.5, y, 3, h)
      // cornice over each window
      ctx.fillStyle = 'rgba(200,190,170,0.18)'
      ctx.fillRect(x - 6, y - 10, w + 12, 6)
      // balcony rail on the second floor
      if (r === rows - 2) {
        ctx.fillStyle = 'rgba(8,6,5,0.9)'
        ctx.fillRect(x - 10, y + h - 4, w + 20, 5)
        for (let k = 0; k < 9; k++) ctx.fillRect(x - 10 + k * (w + 20) / 8, y + h - 26, 2, 24)
      }
    }
  }
  // ground floor shop band
  ctx.fillStyle = '#2a241e'
  ctx.fillRect(0, H - rh * 0.55, W, rh * 0.55)
}

// Cobbles, wet: dark stones with lighter joints.
export function paintCobbles(canvas) {
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.fillStyle = '#1a1816'
  ctx.fillRect(0, 0, W, H)
  let s = 4242
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  const rows = 16, cols = 12
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const off = (r % 2) * (W / cols / 2)
      const x = c * W / cols + off + 3, y = r * H / rows + 3
      const w = W / cols - 6, h = H / rows - 6
      const v = 34 + Math.floor(rnd() * 26)
      ctx.fillStyle = `rgb(${v},${v - 3},${v - 7})`
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, 9); else ctx.rect(x, y, w, h)
      ctx.fill()
      ctx.fillStyle = `rgba(255,240,210,${0.05 + rnd() * 0.06})`
      ctx.fillRect(x + w * 0.2, y + h * 0.15, w * 0.35, h * 0.12)
    }
  }
}

// One Morris-column poster: another film on his wall, with the shared face.
export async function paintFacePoster(canvas, { title, actor, character, score, poster, photo }) {
  await whenFonts()
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  const [pim, fim] = await Promise.all([loadImage(poster), loadImage(photo)])
  ctx.fillStyle = '#e8dcc2'
  ctx.fillRect(0, 0, W, H)
  if (pim) {
    // Only the lower 60% of the one-sheet (the title block, the part people
    // recognise). Le Gamaar draws no swastikas, and some real posters carry
    // one up top (Operation Finale's glasses).
    const srcY = pim.height * 0.4, srcH = pim.height * 0.6
    const r = Math.max(W / pim.width, (H * 0.72) / srcH)
    const sw = W / r, sh = (H * 0.72) / r
    ctx.drawImage(pim, (pim.width - sw) / 2, srcY + (srcH - sh) / 2, sw, sh, 0, 0, W, H * 0.72)
  }
  // the shared face, pinned over the corner
  const R = W * 0.2, cx = W * 0.76, cy = H * 0.64
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip()
  ctx.fillStyle = '#cbbfa6'; ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
  if (fim) {
    const r = Math.max((2 * R) / fim.width, (2.6 * R) / fim.height)
    ctx.drawImage(fim, cx - (fim.width * r) / 2, cy - R * 1.15, fim.width * r, fim.height * r)
  }
  ctx.restore()
  ctx.strokeStyle = '#f6ead2'; ctx.lineWidth = 6
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke()
  // the strip
  ctx.fillStyle = INK
  ctx.textAlign = 'left'
  ctx.font = `600 ${W * 0.075}px "Josefin Sans"`
  ctx.fillText(actor.toUpperCase(), W * 0.06, H * 0.81)
  ctx.font = `italic 400 ${W * 0.07}px "Bodoni Moda"`
  const line = 'was ' + (character || 'in it') + ' in ' + title
  wrap(ctx, line, W * 0.88).slice(0, 2).forEach((l, i) => ctx.fillText(l, W * 0.06, H * 0.875 + i * W * 0.078))
  if (score) {
    ctx.textAlign = 'right'
    ctx.fillStyle = RED
    ctx.font = `700 ${W * 0.1}px Oswald`
    ctx.fillText(score.toFixed(1), W * 0.94, H * 0.81)
  }
}
