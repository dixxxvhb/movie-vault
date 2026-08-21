import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// {area, color, glyphs}: falling canvas-texture glyph quads — OUR OWN
// alphabet, drawn from primitive strokes below. Never the film's glyph set
// (matrix periphery, silverlake floor-projected/static variant).
//
// 8 distinct marks, each built from a deterministic mix of straight strokes,
// arcs and dots so every glyph reads as a *character* rather than a blob, but
// none of them are letters, digits or anything else recognizable — this is
// the whole point of building our own alphabet instead of reusing a real one.
const GLYPH_COUNT = 8
let glyphCache = null
function getGlyphTextures(color) {
  const key = color
  if (glyphCache && glyphCache.key === key) return glyphCache.textures
  const textures = []
  for (let g = 0; g < GLYPH_COUNT; g++) {
    const c = document.createElement('canvas')
    c.width = c.height = 96
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, 96, 96)
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    let s = (g * 7919 + 13) >>> 0
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    const strokes = 2 + Math.floor(r() * 3)
    for (let i = 0; i < strokes; i++) {
      const kind = Math.floor(r() * 3)
      ctx.globalAlpha = 0.55 + r() * 0.45
      if (kind === 0) {
        ctx.beginPath()
        ctx.moveTo(16 + r() * 20, 16 + r() * 64)
        ctx.lineTo(16 + r() * 64, 16 + r() * 64)
        ctx.stroke()
      } else if (kind === 1) {
        ctx.beginPath()
        ctx.arc(48, 48, 14 + r() * 18, r() * Math.PI * 2, r() * Math.PI * 2 + Math.PI * (0.6 + r()))
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.arc(24 + r() * 48, 24 + r() * 48, 3 + r() * 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
    const t = new THREE.CanvasTexture(c)
    t.needsUpdate = true
    textures.push(t)
  }
  glyphCache = { key, textures }
  return textures
}

function Column({ tex, x, area, speed, seed }) {
  const ref = useRef()
  const perCol = 6
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const ys = useMemo(() => Array.from({ length: perCol }, (_, i) => (i / perCol) * area[1]), [])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime * speed + seed
    for (let i = 0; i < perCol; i++) {
      const y = (((ys[i] - t) % area[1]) + area[1]) % area[1]
      dummy.position.set(x, y, 0)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(0.16)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, perCol]} key={perCol}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent opacity={0.8} depthWrite={false} side={THREE.DoubleSide} />
    </instancedMesh>
  )
}

export default function GlyphRain({ pos = [0, 0, -3], area = [6, 4], color = '#4fd67a', speed = 0.6, columns = 10 }) {
  const textures = useMemo(() => getGlyphTextures(color), [color])
  const cols = useMemo(() => Array.from({ length: columns }, (_, i) => ({
    x: (i / columns - 0.5) * area[0],
    tex: textures[i % textures.length],
    speed: speed * (0.7 + (i % 3) * 0.2),
    seed: i * 1.7,
  })), [columns, area[0], textures, speed])
  return (
    <group position={pos}>
      {cols.map((c, i) => <Column key={i} x={c.x} tex={c.tex} area={area} speed={c.speed} seed={c.seed} />)}
    </group>
  )
}
