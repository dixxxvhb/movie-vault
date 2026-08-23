import * as THREE from 'three'

// The procedural surface factory (Wave P0, IMMERSION-V2-POLISH-SPEC.md #1).
// Every surface in this file is canvas + math, never a loaded image — the
// fidelity contract (VAULT-IMMERSION-BRIEF-v2.md §1) allows nothing else.
//
// makeSurface({kind, tint, scale, wear, repeat, seed}) -> {map, bumpMap,
// roughnessMap}, three CanvasTextures sharing one generated color layer so
// the height/rough variation actually lines up with what you SEE, the way a
// real PBR triplet does. Cached by a Map keyed on every param that changes
// the pixels (module-level, never disposed — matCache in GenericRoom.jsx is
// the existing precedent for that).
//
// standardMat({...}) wraps makeSurface in a cached meshStandardMaterial —
// the thing a room config actually reaches for.

const texCache = new Map()
const matCache = new Map()

function rng(seed) {
  let s = (seed >>> 0) || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function hashStr(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// sRGB bytes for the canvas, NOT THREE.Color's .r/.g/.b. Since r152
// ColorManagement is on by default, so `new THREE.Color('#808080').r` is the
// LINEAR value (0.216), not 0.5. Painting those linear bytes onto a canvas
// that makeSurface() then tags SRGBColorSpace made the GPU gamma-decode them
// a second time: every tint lost 6-12x of its albedo (#8a6c3c rendered 7.7x
// too dark, #5a4424 12x). That double-gamma was the "materials.js rooms
// need ~7x more light than the wallCanvas() fallback" bug of 2026-08-21.
// getHex() hands back the sRGB encoding whatever the working color space is.
function hexToRgb(hex) {
  const h = new THREE.Color(hex).getHex()
  return [(h >> 16) & 255, (h >> 8) & 255, h & 255]
}

function shade([r, g, b], amt, alpha = 1) {
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt)))
  return `rgba(${f(r)},${f(g)},${f(b)},${alpha})`
}

const S = 512

function fillBase(ctx, tint) {
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, S, S)
}

// soft radial blotches — the macro tonal variance every kind starts from.
// Real surfaces are never one flat color; this is the layer that sells "a
// wall", not "a swatch".
function blotches(ctx, r, rgb, count, spread, alpha) {
  for (let i = 0; i < count; i++) {
    const x = r() * S, y = r() * S, rad = S * (0.06 + r() * 0.22)
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
    const amt = (r() - 0.5) * spread
    g.addColorStop(0, shade(rgb, amt, 0.9))
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = alpha * (0.35 + r() * 0.5)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, rad, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function speckle(ctx, r, count, size, alpha) {
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * (0.4 + r() * 0.6)
    ctx.fillStyle = r() > 0.5 ? '#ffffff' : '#000000'
    ctx.fillRect(r() * S, r() * S, size, size)
  }
  ctx.globalAlpha = 1
}

// a single jagged hairline (crack) from (x,y) roughly toward (dx,dy)
function crack(ctx, r, x, y, len, color, width) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(x, y)
  let cx = x, cy = y
  let a = r() * Math.PI * 2
  const steps = 5 + Math.floor(r() * 6)
  for (let i = 0; i < steps; i++) {
    a += (r() - 0.5) * 1.6
    cx += Math.cos(a) * (len / steps)
    cy += Math.sin(a) * (len / steps)
    ctx.lineTo(cx, cy)
  }
  ctx.stroke()
}

/* ---------------------------------------------------------------- kinds */
// Each returns optional metadata (e.g. shine-pool centers) consumed by
// deriveMaps() below when building the roughness pass.

function drawWood(ctx, r, rgb, scale, wear) {
  fillBase(ctx, `rgb(${rgb.join(',')})`)
  blotches(ctx, r, rgb, 10, 14, 0.5) // varnish variance
  const step = Math.max(3, S / (26 * scale))
  for (let x = 0; x < S; x += step) {
    const dark = r() > 0.45
    ctx.strokeStyle = shade(rgb, dark ? -26 - r() * 20 : 18 + r() * 14, 0.28)
    ctx.lineWidth = 1 + r() * 1.4
    ctx.beginPath()
    const wob = 5 + r() * 6
    const ph = r() * Math.PI * 2
    ctx.moveTo(x, 0)
    for (let y = 0; y <= S; y += 24) {
      ctx.lineTo(x + Math.sin(y * 0.02 + ph) * wob, y)
    }
    ctx.stroke()
  }
  const knots = 2 + Math.floor(r() * 3)
  for (let i = 0; i < knots; i++) {
    const x = r() * S, y = r() * S, rad = 8 + r() * 14
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
    g.addColorStop(0, shade(rgb, -50, 0.7))
    g.addColorStop(0.6, shade(rgb, -30, 0.4))
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(x, y, rad, rad * 0.6, r() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  if (wear > 0.5) speckle(ctx, r, 900, 1.4, 0.06 * wear)
}

function drawPlaster(ctx, r, rgb, scale, wear) {
  fillBase(ctx, `rgb(${rgb.join(',')})`)
  blotches(ctx, r, rgb, 22, 10, 0.4)
  speckle(ctx, r, 2600, 1.6, 0.05)
  const cracks = Math.floor((0.5 + wear) * 3)
  for (let i = 0; i < cracks; i++) {
    crack(ctx, r, r() * S, r() * S, 60 + r() * 140, shade(rgb, -40, 0.35), 0.8 + r() * 0.6)
  }
}

function drawConcrete(ctx, r, rgb, scale, wear) {
  fillBase(ctx, `rgb(${rgb.join(',')})`)
  blotches(ctx, r, rgb, 16, 12, 0.35)
  // pores
  speckle(ctx, r, 3400, 1.2, 0.05)
  // form lines: faint straight seams from the formwork
  ctx.globalAlpha = 0.12
  for (let i = 0; i < 4 + Math.floor(r() * 3); i++) {
    ctx.strokeStyle = shade(rgb, -20)
    ctx.lineWidth = 1
    ctx.beginPath()
    if (r() > 0.5) {
      const y = r() * S
      ctx.moveTo(0, y); ctx.lineTo(S, y)
    } else {
      const x = r() * S
      ctx.moveTo(x, 0); ctx.lineTo(x, S)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  const pools = []
  if (wear > 0.45) {
    const n = 2 + Math.floor(wear * 3)
    for (let i = 0; i < n; i++) {
      const x = r() * S, y = r() * S, rad = S * (0.05 + r() * 0.1)
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
      g.addColorStop(0, shade(rgb, -34, 0.5))
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill()
      pools.push({ x: x / S, y: y / S, r: rad / S })
    }
  }
  return { pools }
}

function drawCarpet(ctx, r, rgb, scale, wear) {
  fillBase(ctx, `rgb(${rgb.join(',')})`)
  speckle(ctx, r, 5200, 1.1, 0.08)
  blotches(ctx, r, rgb, 8, 8, 0.25)
  const lanes = 1 + Math.floor(r() * 2)
  for (let i = 0; i < lanes; i++) {
    const horiz = r() > 0.5
    const at = 0.25 + r() * 0.5
    const w = S * (0.12 + r() * 0.1)
    const g = ctx.createLinearGradient(
      horiz ? 0 : at * S - w / 2, horiz ? at * S - w / 2 : 0,
      horiz ? S : at * S + w / 2, horiz ? at * S + w / 2 : S
    )
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.5, shade(rgb, wear > 0.5 ? -16 : 10, 0.14 + wear * 0.12))
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
  }
}

function drawFabric(ctx, r, rgb, scale, wear) {
  fillBase(ctx, `rgb(${rgb.join(',')})`)
  const step = Math.max(2, S / (48 * scale))
  ctx.globalAlpha = 0.16
  for (let x = 0; x < S; x += step) {
    ctx.strokeStyle = shade(rgb, ((x / step) % 2 === 0) ? -16 : 12)
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S); ctx.stroke()
  }
  for (let y = 0; y < S; y += step) {
    ctx.strokeStyle = shade(rgb, ((y / step) % 2 === 0) ? -10 : 14)
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke()
  }
  ctx.globalAlpha = 1
  speckle(ctx, r, 1200, 1, 0.04)
}

function drawMetal(ctx, r, rgb, scale, wear) {
  fillBase(ctx, `rgb(${rgb.join(',')})`)
  // brushed streaks
  ctx.globalAlpha = 0.14
  for (let i = 0; i < 260; i++) {
    const y = r() * S
    ctx.strokeStyle = shade(rgb, (r() - 0.5) * 60)
    ctx.lineWidth = 0.6 + r() * 1
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(S, y + (r() - 0.5) * 3)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  blotches(ctx, r, rgb, 6, 10, 0.18)
  const scratches = 6 + Math.floor(wear * 18)
  ctx.globalAlpha = 0.2
  for (let i = 0; i < scratches; i++) {
    const x = r() * S, y = r() * S
    ctx.strokeStyle = shade(rgb, r() > 0.5 ? 40 : -40)
    ctx.lineWidth = 0.6
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 10)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  // edge wear darkening
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.72)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, shade(rgb, -30, 0.25 * wear))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
}

function drawPaper(ctx, r, rgb, scale, wear) {
  fillBase(ctx, `rgb(${rgb.join(',')})`)
  blotches(ctx, r, rgb, 14, 8, 0.3)
  ctx.globalAlpha = 0.1
  for (let i = 0; i < 1400; i++) {
    const x = r() * S, y = r() * S, a = r() * Math.PI
    ctx.strokeStyle = shade(rgb, (r() - 0.5) * 26)
    ctx.lineWidth = 0.6
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  if (wear > 0.4) speckle(ctx, r, 600, 1.4, 0.05)
}

function drawGrid(ctx, r, rgb, scale, wear, kind) {
  const groutColor = shade(rgb, -60, 1)
  fillBase(ctx, groutColor)
  const cell = S / (kind === 'tile' ? Math.max(2, Math.round(4 * scale)) : Math.max(3, Math.round(7 * scale)))
  const gap = kind === 'tile' ? cell * 0.045 : cell * 0.09
  const rowOffset = kind === 'brick' ? cell / 2 : 0
  let row = 0
  for (let y = 0; y < S; y += cell) {
    const off = (row % 2) * rowOffset
    for (let x = -rowOffset; x < S + rowOffset; x += cell) {
      const jitter = (r() - 0.5) * 30
      ctx.fillStyle = shade(rgb, jitter)
      ctx.fillRect(x + off + gap / 2, y + gap / 2, cell - gap, cell - gap)
      if (wear > 0.5 && r() < 0.12 * wear) {
        // chipped corner
        ctx.fillStyle = shade(rgb, -50, 0.4)
        ctx.fillRect(x + off + gap / 2, y + gap / 2, cell * 0.22, cell * 0.15)
      }
    }
    row++
  }
}

function drawAggregate(ctx, r, rgb, scale, wear, kind) {
  fillBase(ctx, `rgb(${rgb.join(',')})`)
  blotches(ctx, r, rgb, 10, 10, 0.3)
  const count = kind === 'gravel' ? 3600 : 2600
  for (let i = 0; i < count; i++) {
    const sz = kind === 'gravel' ? 1 + r() * 3 : 0.6 + r() * 1.4
    ctx.globalAlpha = 0.3 + r() * 0.4
    ctx.fillStyle = shade(rgb, (r() - 0.5) * 50)
    ctx.fillRect(r() * S, r() * S, sz, sz)
  }
  ctx.globalAlpha = 1
  if (wear > 0.4) {
    const cracks = 1 + Math.floor(wear * 3)
    for (let i = 0; i < cracks; i++) crack(ctx, r, r() * S, r() * S, 80 + r() * 160, shade(rgb, -46, 0.4), 1 + r())
  }
}

function drawWetConcrete(ctx, r, rgb, scale, wear) {
  const meta = drawConcrete(ctx, r, rgb, scale, Math.max(wear, 0.5))
  const n = 3 + Math.floor(r() * 3)
  const pools = meta?.pools ? [...meta.pools] : []
  for (let i = 0; i < n; i++) {
    const x = r() * S, y = r() * S, rad = S * (0.05 + r() * 0.12)
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
    g.addColorStop(0, shade(rgb, -46, 0.55))
    g.addColorStop(0.7, shade(rgb, -30, 0.3))
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill()
    pools.push({ x: x / S, y: y / S, r: rad / S, shine: true })
  }
  return { pools }
}

const GENERATORS = {
  wood: (ctx, r, rgb, scale, wear) => drawWood(ctx, r, rgb, scale, wear),
  plaster: (ctx, r, rgb, scale, wear) => drawPlaster(ctx, r, rgb, scale, wear),
  concrete: (ctx, r, rgb, scale, wear) => drawConcrete(ctx, r, rgb, scale, wear),
  carpet: (ctx, r, rgb, scale, wear) => drawCarpet(ctx, r, rgb, scale, wear),
  fabric: (ctx, r, rgb, scale, wear) => drawFabric(ctx, r, rgb, scale, wear),
  metal: (ctx, r, rgb, scale, wear) => drawMetal(ctx, r, rgb, scale, wear),
  paper: (ctx, r, rgb, scale, wear) => drawPaper(ctx, r, rgb, scale, wear),
  brick: (ctx, r, rgb, scale, wear) => drawGrid(ctx, r, rgb, scale, wear, 'brick'),
  tile: (ctx, r, rgb, scale, wear) => drawGrid(ctx, r, rgb, scale, wear, 'tile'),
  asphalt: (ctx, r, rgb, scale, wear) => drawAggregate(ctx, r, rgb, scale, wear, 'asphalt'),
  gravel: (ctx, r, rgb, scale, wear) => drawAggregate(ctx, r, rgb, scale, wear, 'gravel'),
  wetconcrete: (ctx, r, rgb, scale, wear) => drawWetConcrete(ctx, r, rgb, scale, wear),
}

// base roughness per kind (before wear/variance modulation) — where the
// PBR-feel actually comes from: metal reads shiny, plaster reads chalky,
// carpet never reads shiny at all.
const BASE_ROUGH = {
  wood: 0.5, plaster: 0.88, concrete: 0.86, carpet: 0.96, fabric: 0.9,
  metal: 0.38, paper: 0.75, brick: 0.8, tile: 0.55, asphalt: 0.92,
  gravel: 0.94, wetconcrete: 0.62, flat: 0.85,
}
const BASE_METAL = {
  metal: 0.55, tile: 0.05, wetconcrete: 0.08, wood: 0, plaster: 0,
  concrete: 0, carpet: 0, fabric: 0, paper: 0, brick: 0, asphalt: 0,
  gravel: 0, flat: 0,
}

// Derive bump + roughness canvases from the finished color canvas's own
// luminance, so height/roughness variation lines up with what the eye sees
// instead of drifting from an independent noise pass.
function deriveMaps(colorCanvas, kind, wear, meta) {
  const ctx = colorCanvas.getContext('2d')
  const img = ctx.getImageData(0, 0, S, S)
  const data = img.data

  const bumpCanvas = document.createElement('canvas')
  bumpCanvas.width = bumpCanvas.height = S
  const bctx = bumpCanvas.getContext('2d')
  const bimg = bctx.createImageData(S, S)

  const roughCanvas = document.createElement('canvas')
  roughCanvas.width = roughCanvas.height = S
  const rctx = roughCanvas.getContext('2d')
  const rimg = rctx.createImageData(S, S)

  const baseRough = BASE_ROUGH[kind] ?? 0.85
  const roughVar = 0.16 + wear * 0.12
  const pools = meta?.pools || []
  const pw = S

  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const i = (py * S + px) * 4
      const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255
      const h = Math.max(0, Math.min(255, Math.round(lum * 255)))
      bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = h
      bimg.data[i + 3] = 255

      let rough = baseRough + (lum - 0.5) * roughVar
      if (pools.length) {
        const u = px / pw, v = py / pw
        for (let k = 0; k < pools.length; k++) {
          const p = pools[k]
          const d = Math.hypot(u - p.x, v - p.y) / p.r
          if (d < 1) rough -= (1 - d) * 0.5
        }
      }
      rough = Math.max(0.04, Math.min(1, rough))
      const rv = Math.round(rough * 255)
      rimg.data[i] = rimg.data[i + 1] = rimg.data[i + 2] = rv
      rimg.data[i + 3] = 255
    }
  }
  bctx.putImageData(bimg, 0, 0)
  rctx.putImageData(rimg, 0, 0)
  return { bumpCanvas, roughCanvas }
}

// makeSurface({kind, tint, scale, wear, repeat, seed}) -> {map, bumpMap,
// roughnessMap}. `scale` tunes feature frequency (grain spacing, cell
// count); `repeat` is baked into the cached texture (never mutated post-
// creation — two callers wanting different repeats get two cache entries,
// never one texture fighting over its own .repeat).
export function makeSurface({ kind = 'flat', tint = '#888888', scale = 1, wear = 0.3, repeat = [1, 1], seed } = {}) {
  const key = [kind, tint, scale, wear, repeat[0], repeat[1], seed || ''].join('|')
  if (texCache.has(key)) return texCache.get(key)

  const gen = GENERATORS[kind]
  const colorCanvas = document.createElement('canvas')
  colorCanvas.width = colorCanvas.height = S
  const ctx = colorCanvas.getContext('2d')
  const r = rng(seed != null ? seed : hashStr(key))
  const rgb = hexToRgb(tint)

  let meta
  if (gen) {
    meta = gen(ctx, r, rgb, scale, wear)
  } else {
    // 'flat' fallback — still a surface, not a swatch
    fillBase(ctx, tint)
    blotches(ctx, r, rgb, 8, 8, 0.2)
    speckle(ctx, r, 1600, 1.4, 0.035)
  }

  const { bumpCanvas, roughCanvas } = deriveMaps(colorCanvas, kind, wear, meta)

  const mk = (canvas, srgb) => {
    const t = new THREE.CanvasTexture(canvas)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(repeat[0], repeat[1])
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    t.needsUpdate = true
    return t
  }

  const result = {
    map: mk(colorCanvas, true),
    bumpMap: mk(bumpCanvas, false),
    roughnessMap: mk(roughCanvas, false),
  }
  texCache.set(key, result)
  return result
}

// standardMat({kind, tint, scale, wear, repeat, seed, roughness, metalness,
// bumpScale, emissive, emissiveIntensity}) -> cached meshStandardMaterial.
// `roughness`/`metalness` here are MULTIPLIERS on the map (three reads the
// map as a per-texel factor against the scalar) so a config author can push
// a whole surface shinier/duller without fighting the generated variance.
export function standardMat({
  kind = 'flat', tint = '#888888', scale = 1, wear = 0.3, repeat = [1, 1], seed,
  roughness = 1, metalness, bumpScale = 0.015, emissive, emissiveIntensity = 0,
} = {}) {
  const mAmt = metalness ?? BASE_METAL[kind] ?? 0
  const key = [kind, tint, scale, wear, repeat[0], repeat[1], seed || '', roughness, mAmt, bumpScale, emissive || '', emissiveIntensity].join('|')
  if (matCache.has(key)) return matCache.get(key)
  const { map, bumpMap, roughnessMap } = makeSurface({ kind, tint, scale, wear, repeat, seed })
  const mat = new THREE.MeshStandardMaterial({
    map, bumpMap, roughnessMap,
    bumpScale,
    roughness,
    metalness: mAmt,
    emissive: emissive || '#000000',
    emissiveIntensity,
  })
  matCache.set(key, mat)
  return mat
}

export const SURFACE_KINDS = Object.keys(GENERATORS)
