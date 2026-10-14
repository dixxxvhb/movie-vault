import React, { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Big outdoor set pieces for the template kit: things a room sees across a
// distance rather than walks up to. Each one merges its parts into a single
// geometry, so a line of towers or a run of hills is a handful of draw calls,
// not hundreds. Leaf module, like props.jsx.

const V3 = (v) => (Array.isArray(v) ? v : [0, 0, 0])

// A strut between two points, as a thin box.
function strut(a, b, t) {
  const d = new THREE.Vector3().subVectors(b, a)
  const len = d.length()
  const g = new THREE.BoxGeometry(t, len, t)
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())
  g.applyQuaternion(q)
  const m = a.clone().add(b).multiplyScalar(0.5)
  g.translate(m.x, m.y, m.z)
  return g
}

const towerCache = new Map()
// A lattice transmission tower: four tapering legs, X-braced on every face,
// a waist, two crossarms. Returns the geometry and the wire attach points.
function towerGeometry(h) {
  if (towerCache.has(h)) return towerCache.get(h)
  const parts = []
  const base = h * 0.13, waist = h * 0.04, top = h * 0.025
  const waistY = h * 0.66
  const legAt = (y) => (y < waistY ? base + (waist - base) * (y / waistY) : waist + (top - waist) * ((y - waistY) / (h - waistY)))
  const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]]
  const levels = 9
  const ys = Array.from({ length: levels + 1 }, (_, i) => (h * i) / levels)
  const t = Math.max(0.05, h * 0.006)
  for (let li = 0; li < levels; li++) {
    const y0 = ys[li], y1 = ys[li + 1]
    const r0 = legAt(y0), r1 = legAt(y1)
    for (let c = 0; c < 4; c++) {
      const [ax, az] = corners[c], [bx, bz] = corners[(c + 1) % 4]
      const p00 = new THREE.Vector3(ax * r0, y0, az * r0)
      const p01 = new THREE.Vector3(ax * r1, y1, az * r1)
      const p10 = new THREE.Vector3(bx * r0, y0, bz * r0)
      const p11 = new THREE.Vector3(bx * r1, y1, bz * r1)
      parts.push(strut(p00, p01, t * 1.8))   // leg
      parts.push(strut(p00, p11, t * 0.8))   // brace
      parts.push(strut(p10, p01, t * 0.8))   // brace
      parts.push(strut(p01, p11, t))         // horizontal
    }
  }
  const arms = [h * 0.8, h * 0.64]
  const reach = [h * 0.3, h * 0.38]
  const attach = []
  arms.forEach((y, i) => {
    const r = legAt(y)
    const L = reach[i]
    for (const s of [-1, 1]) {
      parts.push(strut(new THREE.Vector3(s * r, y, -r), new THREE.Vector3(s * L, y, 0), t * 1.2))
      parts.push(strut(new THREE.Vector3(s * r, y, r), new THREE.Vector3(s * L, y, 0), t * 1.2))
      parts.push(strut(new THREE.Vector3(s * r, y + h * 0.06, 0), new THREE.Vector3(s * L, y, 0), t))
      // the insulator string
      const ins = new THREE.CylinderGeometry(t * 1.4, t * 1.4, h * 0.05, 6)
      ins.translate(s * L, y - h * 0.025, 0)
      parts.push(ins)
      attach.push(new THREE.Vector3(s * L, y - h * 0.05, 0))
    }
  })
  // the earth-wire peak
  parts.push(strut(new THREE.Vector3(-top, h, 0), new THREE.Vector3(0, h * 1.06, 0), t))
  parts.push(strut(new THREE.Vector3(top, h, 0), new THREE.Vector3(0, h * 1.06, 0), t))
  const geo = mergeGeometries(parts)
  parts.forEach((g) => g.dispose())
  const out = { geo, attach }
  towerCache.set(h, out)
  return out
}

// pylonLine: a march of towers from `from` to `to` ([x, z] each), wires
// sagging between them. The towers face along the line.
export function pylonLine({ from = [-6, -14], to = [10, -60], count = 4, height = 16, color = '#2a2a28', wire = '#1a1a18', sag = 0.12 }) {
  const { geo, attach } = towerGeometry(height)
  const towers = useMemo(() => Array.from({ length: count }, (_, i) => {
    const k = count === 1 ? 0 : i / (count - 1)
    return new THREE.Vector3(from[0] + (to[0] - from[0]) * k, 0, from[1] + (to[1] - from[1]) * k)
  }), [from[0], from[1], to[0], to[1], count])
  const yaw = Math.atan2(to[0] - from[0], to[1] - from[1]) + Math.PI / 2
  const wires = useMemo(() => {
    const segs = []
    const rot = new THREE.Matrix4().makeRotationY(yaw)
    for (let i = 0; i < towers.length - 1; i++) {
      for (const a of attach) {
        const p = a.clone().applyMatrix4(rot)
        const A = towers[i].clone().add(p), B = towers[i + 1].clone().add(p)
        const span = A.distanceTo(B)
        const pts = Array.from({ length: 17 }, (_, j) => {
          const u = j / 16
          const v = new THREE.Vector3().lerpVectors(A, B, u)
          v.y -= Math.sin(Math.PI * u) * span * sag
          return v
        })
        segs.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, Math.max(0.02, height * 0.002), 4, false))
      }
    }
    if (!segs.length) return null
    const g = mergeGeometries(segs)
    segs.forEach((s) => s.dispose())
    return g
  }, [towers, attach, yaw, sag, height])
  useEffect(() => () => wires?.dispose(), [wires])
  return (
    <group>
      {towers.map((p, i) => (
        <mesh key={i} geometry={geo} position={p} rotation={[0, yaw, 0]}>
          <meshStandardMaterial color={color} roughness={0.7} metalness={0.35} />
        </mesh>
      ))}
      {wires && (
        <mesh geometry={wires}>
          <meshStandardMaterial color={wire} roughness={0.6} metalness={0.3} />
        </mesh>
      )}
    </group>
  )
}

// hills: a run of low rounded rises (squashed spheres sunk into the ground),
// placed along a band. `seed` keeps the layout stable.
export function hills({ count = 8, band = [-40, -18], spread = 70, height = [2, 6], width = [10, 22], color = '#a08a5a', seed = 3, clear = 0 }) {
  const geo = useMemo(() => {
    let s = seed >>> 0
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    const parts = []
    for (let i = 0; i < count; i++) {
      const w = width[0] + r() * (width[1] - width[0])
      const h = height[0] + r() * (height[1] - height[0])
      const g = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)
      g.scale(w / 2, h, w * (0.35 + r() * 0.25))
      // `clear`: keep a corridor down the middle (a road) free of rises
      let x = (r() - 0.5) * spread
      if (clear && Math.abs(x) < clear + w / 2) x = Math.sign(x || 1) * (clear + w / 2)
      g.translate(x, -0.05, band[0] + r() * (band[1] - band[0]))
      parts.push(g)
    }
    const m = mergeGeometries(parts)
    parts.forEach((g) => g.dispose())
    return m
  }, [count, band[0], band[1], spread, height[0], height[1], width[0], width[1], seed, clear])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  )
}

// roadStrip: a stretch of road laid on the ground or pitched over a rise,
// with a dashed centre line and pale edges. Drawn as one canvas texture.
const roadTex = new Map()
function roadTexture(lineColor) {
  if (roadTex.has(lineColor)) return roadTex.get(lineColor)
  const c = document.createElement('canvas')
  c.width = 128; c.height = 512
  const x = c.getContext('2d')
  x.fillStyle = '#2c2a28'; x.fillRect(0, 0, 128, 512)
  let s = 7
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  for (let i = 0; i < 2500; i++) { x.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)'; x.fillRect(r() * 128, r() * 512, 2, 2) }
  x.fillStyle = '#c8c0a8'; x.fillRect(4, 0, 3, 512); x.fillRect(121, 0, 3, 512)
  x.fillStyle = lineColor
  for (let y = 0; y < 512; y += 128) x.fillRect(61, y + 10, 6, 70)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 4
  roadTex.set(lineColor, t)
  return t
}

export function roadStrip({ pos, rot, w = 3.6, len = 12, line = '#e8c040' }) {
  const tex = useMemo(() => {
    const t = roadTexture(line).clone()
    t.needsUpdate = true
    t.repeat.set(1, len / 6)
    return t
  }, [line, len])
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <group position={V3(pos)} rotation={V3(rot)}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, len]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
    </group>
  )
}

// scrub: low desert brush scattered over a rectangle, instanced, keeping a
// corridor clear down x = 0 (`clear`).
export function scrub({ count = 60, area = [40, 40], center = [0, -20], clear = 3, color = '#4a5432', seed = 11, size = [0.3, 0.9] }) {
  const ref = React.useRef()
  const items = useMemo(() => {
    let s = seed >>> 0
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    return Array.from({ length: count }, () => {
      let x = (r() - 0.5) * area[0]
      if (Math.abs(x) < clear) x = Math.sign(x || 1) * (clear + r() * 2)
      return { x: center[0] + x, z: center[1] + (r() - 0.5) * area[1], s: size[0] + r() * (size[1] - size[0]), sy: 0.5 + r() * 0.4 }
    })
  }, [count, area[0], area[1], center[0], center[1], clear, seed, size[0], size[1]])
  useEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new THREE.Object3D()
    items.forEach((it, i) => { o.position.set(it.x, it.s * it.sy * 0.4, it.z); o.scale.set(it.s, it.s * it.sy, it.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix) })
    m.instanceMatrix.needsUpdate = true
  }, [items])
  return (
    <instancedMesh ref={ref} args={[null, null, count]} key={count}>
      <icosahedronGeometry args={[0.5, 1]} />
      <meshStandardMaterial color={color} roughness={0.95} flatShading />
    </instancedMesh>
  )
}
