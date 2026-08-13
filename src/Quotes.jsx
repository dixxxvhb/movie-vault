import React, { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makeQuoteTexture } from './archiveTextures.js'

// 45 lines he wrote down. They are marginalia, not a sixth wall — a scrap is
// always smaller than the photograph it belongs to, always sits under or beside
// it, and never gets its own station. If you can read the scrap before you can
// read the film, the scrap is too big.

export function QuoteScrap({ q, position, rotation = [0, 0, 0], width = 0.13 }) {
  const ref = useRef()
  const [hovered, setHovered] = useState(false)
  const tex = useMemo(() => makeQuoteTexture(q), [q])
  const h = width * 0.5   // the canvas is 420x210

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    // a scrap only ever lifts a little: it must not compete with a print
    const s = THREE.MathUtils.damp(g.scale.x, hovered ? 1.5 : 1, 8, dt)
    g.scale.setScalar(s)
  })

  return (
    <group
      ref={ref}
      position={position}
      rotation={rotation}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0.003, -0.004, -0.001]}>
        <planeGeometry args={[width * 1.04, h * 1.06]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} />
      </mesh>
      <mesh>
        <planeGeometry args={[width, h]} />
        <meshStandardMaterial
          map={tex}
          emissiveMap={tex}
          emissive="#ffffff"
          emissiveIntensity={0.22}
          roughness={0.96}
        />
      </mesh>
    </group>
  )
}

// On the Ledger wall a scrap tapes to the wallpaper just under its Polaroid,
// slightly proud of it so it reads as added later — which it was.
export function WallQuotes({ quotes, positions, cardH }) {
  const placed = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const q of quotes) {
      if (!q.slug || seen.has(q.slug)) continue   // one scrap per film, the rest live in the case file
      const p = positions[q.slug]
      if (!p) continue
      seen.add(q.slug)
      out.push({ q, position: [p[0] + 0.055, p[1] - cardH / 2 - 0.03, p[2] + 0.006] })
    }
    return out
  }, [quotes, positions, cardH])

  return (
    <group>
      {placed.map(({ q, position }, i) => (
        <QuoteScrap key={i} q={q} position={position} rotation={[0, 0, -0.05]} width={0.115} />
      ))}
    </group>
  )
}
