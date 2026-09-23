import React, { useEffect, useMemo } from 'react'
import * as THREE from 'three'

// THE KIT: architecture pieces for Two-Scene rooms
// (docs/VAULT-TWO-SCENE-STANDARD.md §4). Each one was first built for a real
// room (Le Gamaar is the pilot) and kept generic enough for the next film.
// Units are metres; everything is plain meshes, no lights.

// An axis-aligned block from corner to corner.
export function Slab({ x0, x1, y0, y1, z0, z1, mat, ...rest }) {
  return (
    <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]} material={mat} {...rest}>
      <boxGeometry args={[Math.max(0.001, x1 - x0), Math.max(0.001, y1 - y0), Math.max(0.001, z1 - z0)]} />
    </mesh>
  )
}

function useGeo(make, deps) {
  const g = useMemo(make, deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => g.dispose(), [g])
  return g
}

// A hanging curtain in the x/y plane, facing +z. Pleats are a sine in depth;
// `tie` (0..1) pulls the lower part toward one side like a tie-back, `side`
// says which (-1 left, +1 right, 0 none). `scallop` swags the bottom edge.
export function Curtain({ x0, x1, y0, y1, z, pleats = 10, depth = 0.09, tie = 0, tieAt = 0.35, side = 0, scallop = 0, mat }) {
  const geo = useGeo(() => {
    const w = x1 - x0, h = y1 - y0
    const sx = Math.max(8, pleats * 6), sy = 24
    const g = new THREE.PlaneGeometry(w, h, sx, sy)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i) + w / 2, y = p.getY(i) + h / 2
      const u = x / w, v = y / h
      // tie-back: below tieAt the cloth gathers toward `side`, most at the tie point
      let pinch = 0
      if (side && tie) {
        const k = v < tieAt ? 1 - Math.abs(v - tieAt * 0.55) / (tieAt * 0.55 + 0.001) * 0.35 : Math.max(0, 1 - (v - tieAt) / (1 - tieAt))
        pinch = tie * Math.max(0, Math.min(1, k))
        const anchor = side > 0 ? w : 0
        x = x + (anchor - x) * pinch
      }
      let yy = y
      if (scallop) yy = y + (v < 0.15 ? scallop * Math.pow(Math.sin(u * Math.PI * (pleats / 2)), 2) * (1 - v / 0.15) : 0)
      const zz = Math.sin(u * Math.PI * 2 * pleats) * depth * (1 + pinch * 1.5)
      p.setXYZ(i, x0 + x, y0 + yy, z + zz)
    }
    g.computeVertexNormals()
    return g
  }, [x0, x1, y0, y1, z, pleats, depth, tie, tieAt, side, scallop])
  return <mesh geometry={geo} material={mat} />
}

// A sunburst fan (half disc of rays) in the x/y plane, facing +z.
export function Fan({ pos, r = 1.5, rays = 13, mat, glowMat, ry = 0 }) {
  return (
    <group position={pos} rotation={[0, ry, 0]}>
      {Array.from({ length: rays }, (_, k) => {
        const a = (k / (rays - 1)) * Math.PI
        return (
          <mesh key={k} position={[Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, 0]} rotation={[0, 0, a - Math.PI / 2]} material={k % 2 ? mat : (glowMat || mat)}>
            <boxGeometry args={[r * 0.07, r, 0.04]} />
          </mesh>
        )
      })}
      <mesh material={mat} position={[0, 0, 0.03]}><circleGeometry args={[r * 0.22, 24, 0, Math.PI]} /></mesh>
      <mesh material={mat} rotation={[0, 0, 0]} position={[0, 0, 0.01]}><torusGeometry args={[r, 0.035, 8, 48, Math.PI]} /></mesh>
    </group>
  )
}

// A deco wall sconce: a glowing fan shade over a gold stem. No light of its
// own; the bloom and the room's key do the work.
export function Sconce({ pos, ry = 0, scale = 1, gold, glow }) {
  return (
    <group position={pos} rotation={[0, ry, 0]} scale={scale}>
      <mesh material={gold} position={[0, -0.16, 0.03]}><boxGeometry args={[0.05, 0.3, 0.05]} /></mesh>
      <mesh material={glow} position={[0, 0, 0.07]} rotation={[0, 0, 0]}><circleGeometry args={[0.2, 20, 0, Math.PI]} /></mesh>
      <mesh material={gold} position={[0, 0, 0.075]}><torusGeometry args={[0.2, 0.012, 6, 24, Math.PI]} /></mesh>
      {[-0.1, 0, 0.1].map((x) => <mesh key={x} material={gold} position={[x, 0.08, 0.08]}><boxGeometry args={[0.012, 0.16, 0.01]} /></mesh>)}
    </group>
  )
}

// A band that follows a sloped floor: vertical, in the plane x = `x`, from z0
// to z1, bottom at floorY(z) + h0 and top at floorY(z) + h1. facing = +1
// shows its face toward +x, -1 toward -x.
export function FloorBand({ x, z0, z1, h0, h1, floorY, mat, facing = 1, steps = 24 }) {
  const geo = useGeo(() => {
    const pos = [], idx = []
    for (let i = 0; i <= steps; i++) {
      const z = z0 + (z1 - z0) * (i / steps)
      const y = floorY(z)
      pos.push(x, y + h0, z, x, y + h1, z)
      if (i < steps) {
        const a = i * 2
        if (facing > 0) idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
        else idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [x, z0, z1, h0, h1, facing, steps])
  return <mesh geometry={geo} material={mat} />
}

// A strip laid on a sloped floor (a carpet runner): from x0 to x1, z0 to z1.
export function FloorRunner({ x0, x1, z0, z1, floorY, lift = 0.008, mat, steps = 32 }) {
  const geo = useGeo(() => {
    const pos = [], uv = [], idx = []
    for (let i = 0; i <= steps; i++) {
      const z = z0 + (z1 - z0) * (i / steps)
      const y = floorY(z) + lift
      pos.push(x0, y, z, x1, y, z)
      uv.push(0, i / steps * Math.abs(z1 - z0), 1, i / steps * Math.abs(z1 - z0))
      if (i < steps) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [x0, x1, z0, z1, lift, steps])
  return <mesh geometry={geo} material={mat} />
}

// Materials every picture-palace-ish room ends up wanting.
export function useGlow(color = '#ffcf8a', intensity = 2) {
  return useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff4de', emissive: color, emissiveIntensity: intensity, side: THREE.DoubleSide }), [color, intensity])
}
