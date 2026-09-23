import { CHAPTERS, CHARACTERS } from './content.js'
import { whenFonts, loadImage, wrap, stillUrl, castUrl, INK, RED, PAPER } from './basterdsTextures.js'

// The auditorium's printed matter: the seat cards (the cast, one per seat) and
// everything the big screen shows (the film playing, a threaded reel, her reel,
// the burn, the rewind).

function cover(ctx, im, x, y, w, h, fy = 0.5) {
  const r = Math.max(w / im.width, h / im.height)
  const sw = w / r, sh = h / r
  ctx.drawImage(im, (im.width - sw) / 2, (im.height - sh) * fy, sw, sh, x, y, w, h)
}

function grain(ctx, W, H, amount = 0.08, seed = 7) {
  let s = seed
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  for (let i = 0; i < (W * H) / 900; i++) {
    const v = rnd() < 0.5 ? 0 : 255
    ctx.fillStyle = `rgba(${v},${v},${v},${rnd() * amount})`
    ctx.fillRect(rnd() * W, rnd() * H, 2, 2)
  }
}

// ---------------------------------------------------------------- seat card
// A reserved card on the back of a seat: face, name, actor, who, what happens.
export async function paintSeatCard(canvas, ch, castList) {
  await whenFonts()
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  const person = castList?.find((p) => p.id === ch.cast)
  const face = await loadImage(castUrl(person?.photo))
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(27,22,18,0.35)'; ctx.lineWidth = 3
  ctx.strokeRect(14, 14, W - 28, H - 28)

  ctx.fillStyle = ch.premiere ? RED : 'rgba(27,22,18,0.55)'
  ctx.font = '600 20px "Josefin Sans"'
  ctx.textAlign = 'center'
  ctx.fillText(ch.premiere ? 'HERE TONIGHT' : 'RÉSERVÉ · NEVER CAME', W / 2, 52)

  const R = 92, cx = W / 2, cy = 72 + R + 8
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip()
  ctx.fillStyle = '#cbbfa6'; ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
  if (face) cover(ctx, face, cx - R, cy - R * 1.15, R * 2, R * 2.6, 0.2)
  ctx.restore()
  ctx.strokeStyle = INK; ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke()

  let y = cy + R + 58
  ctx.fillStyle = INK
  let size = 44
  let lines
  do { ctx.font = `italic 700 ${size}px "Bodoni Moda"`; lines = wrap(ctx, ch.name, W - 60); size -= 2 } while (lines.length > 2 && size > 28)
  for (const l of lines) { ctx.fillText(l, W / 2, y); y += size + 4 }
  if (ch.aka) {
    ctx.font = 'italic 400 24px "Bodoni Moda"'
    ctx.fillStyle = 'rgba(27,22,18,0.7)'
    ctx.fillText('"' + ch.aka + '"', W / 2, y); y += 34
  }
  if (person) {
    ctx.fillStyle = 'rgba(27,22,18,0.6)'
    ctx.font = '600 21px "Josefin Sans"'
    ctx.fillText(person.name.toUpperCase(), W / 2, y + 4); y += 44
  }
  ctx.textAlign = 'left'
  ctx.fillStyle = INK
  ctx.font = '400 23px Georgia, serif'
  for (const l of wrap(ctx, ch.who, W - 64)) { ctx.fillText(l, 32, y); y += 30 }
  y += 8
  ctx.fillStyle = RED
  ctx.font = 'italic 400 23px Georgia, serif'
  for (const l of wrap(ctx, ch.fate, W - 64)) { ctx.fillText(l, 32, y); y += 30 }
  ctx.fillStyle = 'rgba(27,22,18,0.5)'
  ctx.font = '600 16px "Josefin Sans"'
  ctx.textAlign = 'center'
  ctx.fillText(('CHAPTER ' + ch.chapter + '  ·  ON THE SEAT: ' + ch.object).toUpperCase().slice(0, 64), W / 2, H - 30)
}

// ---------------------------------------------------------------- the screen
// mode: 'idle' | 'reel' (n) | 'her' | 'burn' (p 0..1) | 'rewind' | 'burnt'
export async function paintScreen(canvas, { mode, n, p = 0, t = 0, cast }) {
  await whenFonts()
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.textAlign = 'center'

  if (mode === 'idle') {
    // Nation's Pride is playing: a grey, grainy picture of a bell tower
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#8a8680'); g.addColorStop(1, '#3c3a36')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#1c1a18'
    ctx.fillRect(W * 0.62, H * 0.18, W * 0.06, H * 0.82)
    ctx.beginPath(); ctx.moveTo(W * 0.6, H * 0.2); ctx.lineTo(W * 0.65, H * 0.04); ctx.lineTo(W * 0.7, H * 0.2); ctx.fill()
    ctx.fillStyle = 'rgba(240,236,228,0.85)'
    ctx.font = `700 ${H * 0.09}px Oswald`
    ctx.fillText('STOLZ DER NATION', W * 0.32, H * 0.86)
    grain(ctx, W, H, 0.12, 3)
    return
  }

  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H)

  if (mode === 'reel') {
    const ch = CHAPTERS[n - 1]
    const still = await loadImage(stillUrl('ch' + n))
    if (still) { ctx.globalAlpha = 0.38; cover(ctx, still, 0, 0, W, H); ctx.globalAlpha = 1 }
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, W * 0.6)
    vg.addColorStop(0, 'rgba(0,0,0,0.35)'); vg.addColorStop(1, 'rgba(0,0,0,0.9)')
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#f4efe6'
    ctx.font = `600 ${H * 0.04}px "Josefin Sans"`
    ctx.fillText(('CHAPTER ' + ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'][n] + '  ·  ' + ch.title).toUpperCase(), W / 2, H * 0.17)
    ctx.font = `italic 700 ${H * 0.115}px "Bodoni Moda"`
    const big = wrap(ctx, ch.screen, W * 0.84)
    let y = H * 0.38
    for (const l of big) { ctx.fillText(l, W / 2, y); y += H * 0.13 }
    ctx.font = `400 ${H * 0.042}px Georgia, serif`
    ctx.fillStyle = 'rgba(244,239,230,0.9)'
    y += H * 0.02
    for (const l of wrap(ctx, ch.moment, W * 0.7)) { ctx.fillText(l, W / 2, y); y += H * 0.058 }
    // the faces who walk in
    const people = CHARACTERS.filter((c) => c.chapter === n)
    const faces = await Promise.all(people.map((c) => loadImage(castUrl(cast?.find((x) => x.id === c.cast)?.photo))))
    const r = H * 0.055, gap = r * 2.6
    const x0 = W / 2 - (gap * (people.length - 1)) / 2
    people.forEach((c, i) => {
      const cx = x0 + gap * i, cy = H * 0.86
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip()
      ctx.fillStyle = '#333'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
      if (faces[i]) cover(ctx, faces[i], cx - r, cy - r * 1.15, r * 2, r * 2.6, 0.2)
      ctx.restore()
    })
    grain(ctx, W, H, 0.07, n)
    return
  }

  if (mode === 'her' || mode === 'burn') {
    const sh = cast?.find((x) => x.id === 19119)
    const face = await loadImage(castUrl(sh?.photo))
    if (face) {
      ctx.filter = 'grayscale(0.6) sepia(0.35) contrast(1.15) brightness(1.05)'
      const fw = H * 0.9 * (face.width / face.height)
      ctx.drawImage(face, W / 2 - fw / 2, H * 0.02, fw, H * 0.98)
      ctx.filter = 'none'
    }
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, W * 0.55)
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.95)')
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)
    grain(ctx, W, H, 0.14, 11)
    if (mode === 'her') {
      ctx.fillStyle = 'rgba(244,239,230,0.92)'
      ctx.font = `italic 400 ${H * 0.045}px Georgia, serif`
      ctx.fillText('She spliced herself into the last reel.', W / 2, H * 0.9)
      ctx.font = `600 ${H * 0.03}px "Josefin Sans"`
      ctx.fillText('EVERYONE IN THIS ROOM IS ABOUT TO FIND OUT WHOSE CINEMA IT IS', W / 2, H * 0.96)
      return
    }
    // the burn: a hole opening from the centre, an ember edge, char beyond
    const R = Math.max(1, p * W * 0.72)
    const cx = W * 0.52, cy = H * 0.55
    ctx.save()
    ctx.beginPath()
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.08) {
      const wob = 1 + 0.12 * Math.sin(a * 7 + p * 9) + 0.07 * Math.sin(a * 13 - p * 5)
      const x = cx + Math.cos(a) * R * wob, y = cy + Math.sin(a) * R * wob * 0.75
      a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.closePath()
    const eg = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.12)
    eg.addColorStop(0, 'rgba(8,4,2,1)'); eg.addColorStop(0.72, 'rgba(40,10,2,1)')
    eg.addColorStop(0.86, 'rgba(255,140,40,1)'); eg.addColorStop(1, 'rgba(255,220,140,0)')
    ctx.fillStyle = eg
    ctx.fill()
    ctx.restore()
    flames(ctx, W, H, cx, cy, R, p, t)
    return
  }

  if (mode === 'rewind' || mode === 'burnt') {
    ctx.fillStyle = '#f4efe6'
    ctx.font = `italic 700 ${H * 0.1}px "Bodoni Moda"`
    ctx.fillText(mode === 'rewind' ? 'The reel rewinds.' : 'She burned it down.', W / 2, H * 0.5)
    if (mode === 'burnt') {
      ctx.font = `400 ${H * 0.04}px Georgia, serif`
      ctx.fillStyle = 'rgba(244,239,230,0.75)'
      ctx.fillText('(Room events are switched off, so the fire stays a sentence.)', W / 2, H * 0.62)
    }
  }
}

// Flames coming through the screen: tongues along the burn edge and a wall of
// fire rising from the bottom of the frame, flickering with t. Painted, not
// particles: the nitrate is behind the screen, so the fire shows through it.
function flame(ctx, x, y, w, h, heat) {
  const g = ctx.createLinearGradient(x, y, x, y - h)
  g.addColorStop(0, `rgba(255,${Math.round(150 + 80 * heat)},${Math.round(60 + 90 * heat)},0.95)`)
  g.addColorStop(0.45, 'rgba(255,110,30,0.75)')
  g.addColorStop(1, 'rgba(160,30,10,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(x - w / 2, y)
  ctx.quadraticCurveTo(x - w * 0.6, y - h * 0.45, x + w * 0.08 * Math.sin(h), y - h)
  ctx.quadraticCurveTo(x + w * 0.6, y - h * 0.45, x + w / 2, y)
  ctx.closePath()
  ctx.fill()
}

function flames(ctx, W, H, cx, cy, R, p, t) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  // tongues around the burn edge
  const n = 36
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const wob = 1 + 0.12 * Math.sin(a * 7 + p * 9)
    const x = cx + Math.cos(a) * R * wob, y = cy + Math.sin(a) * R * wob * 0.75
    if (x < -40 || x > W + 40 || y < -40 || y > H + 60) continue
    const f = 0.5 + 0.5 * Math.sin(t * 7.3 + i * 2.1)
    flame(ctx, x, y + 10, 40 + 30 * f, (60 + 110 * f) * Math.min(1, p * 3), f)
  }
  // the wall of fire rising from the bottom of the frame
  const rise = Math.min(1, p * 1.6)
  for (let i = 0; i < 28; i++) {
    const x = (i + 0.5) * (W / 28)
    const f = 0.5 + 0.5 * Math.sin(t * (5.1 + (i % 5)) + i * 1.7)
    flame(ctx, x, H + 20, W / 16 + 30 * f, H * (0.25 + 0.55 * f) * rise, f)
  }
  ctx.restore()
  // heat haze: the whole frame warms
  ctx.fillStyle = `rgba(255,90,20,${0.08 * rise})`
  ctx.fillRect(0, 0, W, H)
}

