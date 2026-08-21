import * as THREE from 'three'

// Procedural canvas texture for a bloodline door's plaque. Self-contained
// (own wrap/fit helpers) rather than importing infoTextures.js's private
// ones — that file is close to the concurrently-edited bespoke-room pass
// this session, and a door plaque's needs are small enough not to share.

function wrapLines(ctx, text, maxWidth) {
  const words = (text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

// Shrinks font size until the wrapped block fits maxHeight — every word of
// the link's authored note has to render (brief §6: verbatim), never
// truncated, so this floors low rather than clipping.
function fitText(ctx, text, maxWidth, maxHeight, startSize, minSize, lineHeightRatio, fontOf) {
  let size = startSize
  let lines = []
  while (size >= minSize) {
    ctx.font = fontOf(size)
    lines = wrapLines(ctx, text, maxWidth)
    if (lines.length * size * lineHeightRatio <= maxHeight) break
    size -= 1
  }
  return { size: Math.max(size, minSize), lines }
}

// spec: {kind, targetTitle, targetYear, note} from rooms/doors.js.
// grade: the room's own config.grade — the plaque borrows its accent color
// so it reads as part of the room's material language, not a UI overlay.
export function makeDoorPlaqueTexture(spec, grade) {
  const W = 900, H = 460
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')

  const locked = spec.kind === 'locked'
  const paper = locked ? '#17130e' : '#efe6d0'
  const ink = locked ? '#7a6c52' : '#241c14'
  const acc = grade?.key || (locked ? '#5a4a34' : '#8a5030')

  ctx.fillStyle = paper
  ctx.fillRect(0, 0, W, H)
  ctx.globalAlpha = 0.06
  let s = (spec.id?.length || 7) * 977 + 13
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  for (let i = 0; i < 1100; i++) {
    ctx.fillStyle = rnd() > 0.5 ? '#000' : '#fff'
    ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6)
  }
  ctx.globalAlpha = 1

  ctx.strokeStyle = acc
  ctx.lineWidth = 5
  ctx.strokeRect(14, 14, W - 28, H - 28)

  ctx.fillStyle = ink
  ctx.textBaseline = 'alphabetic'

  const title = spec.targetTitle + (spec.targetYear ? ' (' + spec.targetYear + ')' : '')
  ctx.font = '600 38px Georgia, serif'
  const titleLines = wrapLines(ctx, title, W - 80)
  let y = 74
  titleLines.slice(0, 2).forEach((l) => { ctx.fillText(l, 40, y); y += 44 })

  const noteFontOf = (size) => `italic ${size}px Georgia, serif`
  const { size, lines } = fitText(ctx, spec.note || '', W - 80, H - y - 32, 30, 15, 1.3, noteFontOf)
  ctx.font = noteFontOf(size)
  lines.forEach((l, i) => ctx.fillText(l, 40, y + 22 + i * size * 1.3))

  if (locked) {
    ctx.fillStyle = acc
    ctx.font = '600 20px system-ui, sans-serif'
    ctx.fillText('· undeveloped ·', 40, H - 22)
  }

  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}
