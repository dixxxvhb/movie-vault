import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

// THE KIT: painted canvas textures (docs/VAULT-TWO-SCENE-STANDARD.md §4).
// Every sign, card, label and note in a Two-Scene room is a canvas painted
// once its fonts and images have loaded (a card painted in the fallback serif
// would be read in the fallback serif).

// One CanvasTexture per painter, repainted when its inputs arrive.
export function makePaintedTexture(w, h, paint) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  Promise.resolve(paint(canvas)).then(() => { tex.needsUpdate = true })
  return tex
}

// The same, as a hook that disposes the texture when its inputs change.
export function usePainted(w, h, paint, deps) {
  const tex = useMemo(() => makePaintedTexture(w, h, paint), deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => tex.dispose(), [tex])
  return tex
}

// Word wrap that returns the lines, so a caller can measure before drawing.
export function wrap(ctx, text, maxW) {
  const words = String(text).split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const t = line ? line + ' ' + w : w
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w } else line = t
  }
  if (line) lines.push(line)
  return lines
}

// Resolves once each listed font face has loaded (CSS font shorthand strings).
const fontCache = new Map()
export function fontsReady(list = []) {
  const key = list.join('|')
  if (!fontCache.has(key)) {
    fontCache.set(key, Promise.all(list.map((f) => document.fonts.load(f).catch(() => null))).then(() => document.fonts.ready))
  }
  return fontCache.get(key)
}

const imgCache = new Map()
export function loadImage(url) {
  if (!url) return Promise.resolve(null)
  if (!imgCache.has(url)) {
    imgCache.set(url, new Promise((res) => {
      const im = new Image()
      im.onload = () => res(im)
      im.onerror = () => res(null)
      im.src = url
    }))
  }
  return imgCache.get(url)
}
