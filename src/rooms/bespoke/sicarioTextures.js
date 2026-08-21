import * as THREE from 'three'

// Procedural canvas textures for Sicario. Same rule as every other bespoke
// texture file: no imported assets, every pixel drawn here — the mission
// brief renders Dixon's own verbatim hot take (which already carries the
// July 25 amendment inline), never a line of the film's own dialogue.

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return c
}

function rngFor(seed) {
  let s = (seed * 2654435761) >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

// The dusk staging ground's sky: a horizon band, orange low, cooling fast
// overhead — the Deakins dusk grade the brief asks for up top, before the
// descent ever begins.
export function makeDuskSkyTexture(top, mid, bottom) {
  const W = 2, H = 512
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, top)
  g.addColorStop(0.55, mid)
  g.addColorStop(1, bottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// The tunnel's own ribbed wall grain — dark, close-toned, so the green and
// thermal grade passes are doing the real work of separating the two zones
// rather than the wall material itself.
export function makeTunnelTexture(tint) {
  const S = 256
  const c = canvas(S, S)
  const ctx = c.getContext('2d')
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, S, S)
  const r = rngFor(614)
  ctx.globalAlpha = 0.12
  for (let y = 0; y < S; y += 4) {
    ctx.fillStyle = r() > 0.5 ? '#000' : '#3a3a34'
    ctx.fillRect(0, y, S, 2)
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(3, 1)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// The mission brief: the hot take (already carrying the 9.9 amendment
// inline, per data/hot_takes.json) rendered verbatim on an ops-document
// panel at the entry, styled dark olive with a stamped feel rather than a
// printed card — this room's version of Departed's case-file dossier.
export function makeMissionBriefTexture(film, palette) {
  const W = 1500, H = 1050
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const paper = palette.paper || '#c8bc9a'
  const ink = palette.ink || '#20241c'
  const acc = palette.acc || '#8a6a3a'

  ctx.fillStyle = '#2a3020'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = paper
  ctx.fillRect(34, 90, W - 68, H - 130)
  ctx.strokeStyle = acc
  ctx.lineWidth = 6
  ctx.strokeRect(34, 90, W - 68, H - 130)

  ctx.fillStyle = acc
  ctx.font = '700 44px Georgia, serif'
  ctx.fillText('MISSION BRIEF', 92, 78)
  ctx.fillStyle = ink
  ctx.font = '600 26px system-ui, sans-serif'
  ctx.fillText((film.title || '').toUpperCase() + ' — TASK FORCE READOUT', 92, 150)

  // a stamped corner, our own invented ops-document flourish, no real seal
  ctx.save()
  ctx.translate(W - 190, 210)
  ctx.rotate(-0.18)
  ctx.strokeStyle = 'rgba(160,40,30,0.55)'
  ctx.lineWidth = 5
  ctx.strokeRect(-90, -34, 180, 68)
  ctx.fillStyle = 'rgba(160,40,30,0.55)'
  ctx.font = '700 30px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText('CLEARED', 0, 10)
  ctx.restore()

  ctx.font = 'italic 34px Georgia, serif'
  ctx.textAlign = 'left'
  const text = film.hot_take || 'no hot take on record for this one yet.'
  const words = text.split(/\s+/)
  const maxW = W - 210
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = w }
    else line = test
  }
  if (line) lines.push(line)
  let ty = 250
  lines.forEach((l) => { ctx.fillText(l, 92, ty); ty += 46 })

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// The 9.9 at the bottom, rendered thermal white-hot — the same "written
// once, styled to the room it hangs in" trick every bespoke score gets, just
// pushed all the way to a blown-out thermal-camera white rather than a
// printed numeral.
export function makeThermalNumeralTexture(score) {
  const W = 512, H = 512
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, W, H)
  // QA fix: the numeral used to sit in a color almost identical to the
  // glow's own hottest point (#fffdf6 text on a #ffffff core) — legible
  // nowhere, closest of all right where you actually arrive. The glow's
  // core is pulled back to a warm (not pure white) orange-white instead, so
  // the digits — drawn in true blown-out white on top — read as the
  // hottest point IN the glow rather than disappearing into it.
  const g = ctx.createRadialGradient(W / 2, H / 2, 6, W / 2, H / 2, W * 0.46)
  g.addColorStop(0, '#ffdca8')
  g.addColorStop(0.5, '#ffb060')
  g.addColorStop(1, 'rgba(255,176,96,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 180px Georgia, serif'
  ctx.shadowColor = '#ffb060'
  ctx.shadowBlur = 30
  ctx.fillStyle = '#ffffff'
  ctx.fillText((score ?? 0).toFixed(1), W / 2, H / 2)
  ctx.shadowBlur = 0
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}
