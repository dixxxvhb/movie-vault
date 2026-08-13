import * as THREE from 'three'

// Procedural room surfaces. Everything is drawn to canvas at load and cached —
// no external image dependencies, no CDN, nothing to 404 on GitHub Pages.
//
// Rule for this file: color maps get SRGBColorSpace, data maps (roughness,
// bump) must NOT — mislabeling a roughness map as sRGB silently washes out the
// whole room.

const cache = new Map()
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make())
  return cache.get(key)
}

function canvas(size = 1024) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return c
}

// deterministic PRNG so the room's grime is identical every load
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function finish(c, { repeat = [1, 1], srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat[0], repeat[1])
  t.anisotropy = 8
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.needsUpdate = true
  return t
}

/* ---------------------------------------------------------------- wallpaper */

function drawWallpaper(seed, base, stripe) {
  const S = 1024
  const c = canvas(S)
  const x = c.getContext('2d')
  const r = rng(seed)

  x.fillStyle = base
  x.fillRect(0, 0, S, S)

  // faded vertical damask stripes — the pattern that used to be nice
  for (let i = 0; i < S; i += 64) {
    x.fillStyle = stripe
    x.globalAlpha = 0.5
    x.fillRect(i, 0, 30, S)
    x.globalAlpha = 0.22
    x.fillRect(i + 38, 0, 6, S)
  }
  x.globalAlpha = 1

  // faint repeating motif so close-ups have something to read
  x.globalAlpha = 0.13
  x.strokeStyle = '#000'
  x.lineWidth = 1.4
  for (let gy = 32; gy < S; gy += 128) {
    for (let gx = 32; gx < S; gx += 64) {
      x.beginPath()
      x.ellipse(gx, gy, 11, 19, 0, 0, Math.PI * 2)
      x.stroke()
    }
  }
  x.globalAlpha = 1

  // water stains — the room has a bad roof
  for (let i = 0; i < 14; i++) {
    const sx = r() * S
    const sy = r() * S
    const rad = 60 + r() * 190
    const g = x.createRadialGradient(sx, sy, rad * 0.15, sx, sy, rad)
    const dark = 40 + Math.floor(r() * 30)
    g.addColorStop(0, `rgba(${dark + 26},${dark + 14},${dark - 6},0.34)`)
    g.addColorStop(0.6, `rgba(${dark + 16},${dark + 6},${dark - 10},0.16)`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    x.fillStyle = g
    x.beginPath()
    x.ellipse(sx, sy, rad, rad * (0.6 + r() * 0.6), r() * 3, 0, Math.PI * 2)
    x.fill()
  }

  // grime creeping up from the baseboard
  const gg = x.createLinearGradient(0, S, 0, S * 0.55)
  gg.addColorStop(0, 'rgba(18,12,6,0.55)')
  gg.addColorStop(1, 'rgba(18,12,6,0)')
  x.fillStyle = gg
  x.fillRect(0, 0, S, S)

  // scuffs and scratches
  x.strokeStyle = 'rgba(0,0,0,0.20)'
  for (let i = 0; i < 90; i++) {
    x.lineWidth = 0.5 + r() * 1.5
    const sx = r() * S
    const sy = r() * S
    x.beginPath()
    x.moveTo(sx, sy)
    x.lineTo(sx + (r() - 0.5) * 70, sy + (r() - 0.5) * 26)
    x.stroke()
  }

  // fine paper noise
  const img = x.getImageData(0, 0, S, S)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 20
    d[i] += n
    d[i + 1] += n
    d[i + 2] += n
  }
  x.putImageData(img, 0, 0)

  return c
}

// grayscale roughness companion: stains read wetter/duller than dry paper
function drawWallRough(seed) {
  const S = 512
  const c = canvas(S)
  const x = c.getContext('2d')
  const r = rng(seed + 99)
  x.fillStyle = '#c9c9c9'
  x.fillRect(0, 0, S, S)
  for (let i = 0; i < 14; i++) {
    const sx = r() * S
    const sy = r() * S
    const rad = 30 + r() * 95
    const g = x.createRadialGradient(sx, sy, 4, sx, sy, rad)
    g.addColorStop(0, 'rgba(255,255,255,0.55)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    x.fillStyle = g
    x.beginPath()
    x.arc(sx, sy, rad, 0, Math.PI * 2)
    x.fill()
  }
  return c
}

export const wallpaper = (variant = 0) =>
  cached('wp' + variant, () => {
    const looks = [
      ['#7a6a4f', '#6b5c43'], // north — the ledger wall, warmest
      ['#6d5f48', '#5f523d'], // east
      ['#5f5442', '#544a39'], // south, by the door
      ['#726348', '#63563f'], // west
    ]
    const [base, stripe] = looks[variant % looks.length]
    return finish(drawWallpaper(variant * 977 + 13, base, stripe), { repeat: [2, 1] })
  })

export const wallpaperRough = (variant = 0) =>
  cached('wpr' + variant, () =>
    finish(drawWallRough(variant * 977 + 13), { repeat: [2, 1], srgb: false })
  )

/* -------------------------------------------------------------------- floor */

export const carpet = () =>
  cached('carpet', () => {
    const S = 1024
    const c = canvas(S)
    const x = c.getContext('2d')
    const r = rng(4242)
    x.fillStyle = '#2b2018'
    x.fillRect(0, 0, S, S)
    // matted fiber
    for (let i = 0; i < 26000; i++) {
      const v = r()
      const sx = r() * S
      const sy = r() * S
      x.fillStyle = v > 0.72 ? 'rgba(90,72,52,0.30)' : v > 0.4 ? 'rgba(24,17,11,0.42)' : 'rgba(58,44,31,0.22)'
      x.fillRect(sx, sy, 2.4, 1.4)
    }
    // traffic paths and old spills
    for (let i = 0; i < 10; i++) {
      const sx = r() * S
      const sy = r() * S
      const rad = 70 + r() * 170
      const g = x.createRadialGradient(sx, sy, 8, sx, sy, rad)
      g.addColorStop(0, 'rgba(10,6,3,0.42)')
      g.addColorStop(1, 'rgba(10,6,3,0)')
      x.fillStyle = g
      x.beginPath()
      x.arc(sx, sy, rad, 0, Math.PI * 2)
      x.fill()
    }
    return finish(c, { repeat: [3, 3] })
  })

export const ceiling = () =>
  cached('ceiling', () => {
    const S = 512
    const c = canvas(S)
    const x = c.getContext('2d')
    const r = rng(77)
    x.fillStyle = '#2a251d'
    x.fillRect(0, 0, S, S)
    // popcorn texture + the stain that means the roof leaks
    for (let i = 0; i < 9000; i++) {
      x.fillStyle = r() > 0.5 ? 'rgba(255,250,235,0.05)' : 'rgba(0,0,0,0.07)'
      x.beginPath()
      x.arc(r() * S, r() * S, r() * 2.4, 0, Math.PI * 2)
      x.fill()
    }
    for (let i = 0; i < 4; i++) {
      const sx = r() * S
      const sy = r() * S
      const rad = 40 + r() * 90
      const g = x.createRadialGradient(sx, sy, 5, sx, sy, rad)
      g.addColorStop(0, 'rgba(96,72,38,0.34)')
      g.addColorStop(1, 'rgba(96,72,38,0)')
      x.fillStyle = g
      x.beginPath()
      x.arc(sx, sy, rad, 0, Math.PI * 2)
      x.fill()
    }
    return finish(c, { repeat: [2, 2] })
  })
