import { CHAPTERS, CHARACTERS, HISTORY, FRAGMENTS } from './content.js'
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
  ctx.fillText(ch.tag || (ch.premiere ? 'HERE TONIGHT' : 'RÉSERVÉ · NEVER CAME'), W / 2, 52)

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

  if (mode === 'history') {
    // House lights up: the projector is off and the screen is just a wall.
    // His line goes on it, then what actually happened.
    ctx.fillStyle = '#d9d2c4'; ctx.fillRect(0, 0, W, H)
    grain(ctx, W, H, 0.05, 9)
    const line = FRAGMENTS.find((f) => f.state === 'motel')
    ctx.fillStyle = '#1f1a26'
    ctx.font = `italic 400 ${H * 0.085}px Georgia, serif`
    ctx.fillText('"' + line.text + '"', W / 2, H * 0.17)
    ctx.fillStyle = 'rgba(31,26,38,0.55)'
    ctx.font = `600 ${H * 0.03}px "Josefin Sans"`
    ctx.fillText('WHAT ACTUALLY HAPPENED', W / 2, H * 0.28)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#1b1612'
    const fs = H * 0.04
    ctx.font = `400 ${fs}px Georgia, serif`
    let y = H * 0.37
    for (const h of HISTORY) {
      const ls = wrap(ctx, h, W * 0.78)
      ctx.fillRect(W * 0.1, y - fs * 0.35, fs * 0.25, fs * 0.25)
      for (const l of ls) { ctx.fillText(l, W * 0.12, y); y += fs * 1.3 }
      y += fs * 0.55
    }
    ctx.textAlign = 'center'
    return
  }

  if (mode === 'idle') {
    // STOLZ DER NATION is playing: Zoller in the bell tower over the town,
    // rifle out of the belfry, smoke drifting across the roofs. Black and
    // white, a projected look: grain, weave, a scratch now and then. `t`
    // advances a few times a second (Screen's own ticker), so it plays.
    const f = t || 0
    let s = 1000 + (f % 97) * 131
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
    const weave = Math.sin(f * 1.7) * 3
    ctx.save(); ctx.translate(0, weave)
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#b9b5ad'); sky.addColorStop(0.62, '#8c8881'); sky.addColorStop(1, '#4a4743')
    ctx.fillStyle = sky; ctx.fillRect(0, -10, W, H + 20)
    // far roofs, then near roofs
    const roofs = (y0, amp, col, seed) => {
      let r = seed; const rr = () => ((r = (r * 9301 + 49297) % 233280) / 233280)
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H)
      for (let x = 0; x <= W; x += 60 + rr() * 90) {
        const h = y0 - rr() * amp
        ctx.lineTo(x, h); if (rr() < 0.4) ctx.lineTo(x + 30, h - 30 - rr() * 40); ctx.lineTo(x + 60, h)
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill()
    }
    roofs(H * 0.7, H * 0.08, '#6b6863', 7)
    // smoke from the square, drifting left
    for (let k = 0; k < 5; k++) {
      const cx = ((W * 0.35 + k * 190 - f * 6) % (W * 0.7) + W * 0.7) % (W * 0.7), cy = H * 0.62 - k * 30
      const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 220)
      g.addColorStop(0, 'rgba(210,206,198,0.35)'); g.addColorStop(1, 'rgba(210,206,198,0)')
      ctx.fillStyle = g; ctx.fillRect(cx - 220, cy - 220, 440, 440)
    }
    roofs(H * 0.86, H * 0.1, '#2e2c29', 19)
    // the tower: stone shaft, belfry arch, the roof spike
    const tx = W * 0.64, tw = W * 0.085
    ctx.fillStyle = '#26241f'
    ctx.fillRect(tx - tw / 2, H * 0.24, tw, H)
    ctx.beginPath(); ctx.moveTo(tx - tw * 0.62, H * 0.25); ctx.lineTo(tx, H * 0.02); ctx.lineTo(tx + tw * 0.62, H * 0.25); ctx.fill()
    ctx.fillStyle = '#3a3731'
    for (let y = H * 0.3; y < H; y += 26) ctx.fillRect(tx - tw / 2, y, tw, 2)
    // the belfry, lit from behind, and the man in it
    ctx.fillStyle = '#d8d3c8'
    ctx.beginPath(); ctx.moveTo(tx - tw * 0.3, H * 0.44); ctx.lineTo(tx - tw * 0.3, H * 0.33)
    ctx.arc(tx, H * 0.33, tw * 0.3, Math.PI, 0); ctx.lineTo(tx + tw * 0.3, H * 0.44); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#141311'
    ctx.beginPath(); ctx.arc(tx + tw * 0.02, H * 0.345, tw * 0.07, 0, Math.PI * 2); ctx.fill()
    ctx.fillRect(tx - tw * 0.08, H * 0.365, tw * 0.17, H * 0.08)
    ctx.save(); ctx.translate(tx - tw * 0.05, H * 0.385); ctx.rotate(0.32)
    ctx.fillRect(-tw * 0.75, -3, tw * 0.75, 7)
    ctx.restore()
    ctx.restore()
    // the title, as the film-within-the-film cards it
    ctx.fillStyle = 'rgba(244,240,232,0.92)'
    ctx.font = `700 ${H * 0.085}px Oswald`
    ctx.fillText('STOLZ DER NATION', W * 0.3, H * 0.9)
    // projection: vignette, grain, a scratch
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.62)
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)')
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)
    for (let i = 0; i < 2200; i++) {
      const v = rnd() < 0.5 ? 0 : 255
      ctx.fillStyle = `rgba(${v},${v},${v},${rnd() * 0.1})`
      ctx.fillRect(rnd() * W, rnd() * H, 2, 2)
    }
    if (rnd() < 0.35) { ctx.fillStyle = 'rgba(240,240,240,0.35)'; ctx.fillRect(rnd() * W, 0, 2, H) }
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

