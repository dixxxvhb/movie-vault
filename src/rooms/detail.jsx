import React, { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'

// The bevel/trim/decal/clutter kit (Wave P0, IMMERSION-V2-POLISH-SPEC.md
// #2). Everything here is geometry + canvas, never a loaded asset — the
// fidelity contract stays intact.
//
// drei's RoundedBox (9.109, three 0.161 pinned) was verified working here —
// a plain `<RoundedBox args={[w,h,d]} radius={r} smoothness={n}>` renders a
// clean chamfered box with no console errors against this pin, so the
// spec's fallback ("hand-roll a chamfered box geometry ONCE") was not
// needed. Bevel below is a thin wrapper around it.

const V3 = (v) => (Array.isArray(v) ? v : [0, 0, 0])

/* ------------------------------------------------------------------ Bevel */
// Bevel: a chamfered box for any prop body that should read as manufactured
// rather than extruded stock. `mat` accepts a materials.js standardMat()
// instance directly; falls back to a plain meshStandardMaterial from
// color/roughness/metalness when no mat is given.
export function Bevel({
  pos, rot, scale = 1, w = 1, h = 1, d = 1, radius = 0.03, segments = 3,
  mat, color = '#666666', roughness = 0.6, metalness = 0.1,
  castShadow = false, receiveShadow = false,
}) {
  const r = Math.min(radius, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)
  return (
    <RoundedBox
      args={[w, h, d]}
      radius={Math.max(0.002, r)}
      smoothness={segments}
      position={V3(pos)}
      rotation={V3(rot)}
      scale={scale}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      {mat ? <primitive object={mat} attach="material" /> : (
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
      )}
    </RoundedBox>
  )
}

/* ------------------------------------------------------------------- Trim */
// Trim: a baseboard/crown/door-frame run — a two-tier step profile (a
// deeper base strip + a thinner lip) rather than a single flat box, so it
// reads as moulding in a grazing light instead of a painted stripe.
// `along` is the wall's own length axis in local space ('x' or 'z');
// `wallLength` sizes the run; `at` is where the run's centerline sits
// (baseboard: floor; crown: ceiling; doorframe: caller passes explicit pos).
export function Trim({
  pos = [0, 0, 0], rot = [0, 0, 0], wallLength = 1, along = 'x',
  kind = 'baseboard', height = 0.09, depth = 0.028, color = '#2a251c',
  roughness = 0.55,
}) {
  const isX = along === 'x'
  const baseSize = isX ? [wallLength, height, depth] : [depth, height, wallLength]
  const lipH = height * 0.32
  const lipD = depth * 0.55
  const lipY = kind === 'crown' ? -(height / 2 - lipH / 2) : (height / 2 - lipH / 2)
  const lipSize = isX ? [wallLength, lipH, lipD] : [lipD, lipH, wallLength]
  const lipOffset = isX ? [0, lipY, depth / 2 - lipD / 2 + 0.001] : [depth / 2 - lipD / 2 + 0.001, lipY, 0]
  return (
    <group position={V3(pos)} rotation={V3(rot)}>
      <mesh>
        <boxGeometry args={baseSize} />
        <meshStandardMaterial color={color} roughness={roughness} />
      </mesh>
      <mesh position={lipOffset}>
        <boxGeometry args={lipSize} />
        <meshStandardMaterial color={color} roughness={roughness * 0.85} />
      </mesh>
    </group>
  )
}

/* --------------------------------------------------------------- FrameOn */
// FrameOn(wall): a picture-frame/panel-moulding rectangle standing slightly
// proud of a flat wall — four thin bars forming a border. Breaks up a bare
// plane even with nothing hung inside it.
export function FrameOn({
  pos, rot, w = 0.8, h = 1.1, bar = 0.05, depth = 0.02, color = '#2a251c',
  roughness = 0.5,
}) {
  const mat = <meshStandardMaterial color={color} roughness={roughness} />
  return (
    <group position={V3(pos)} rotation={V3(rot)}>
      <mesh position={[0, h / 2 - bar / 2, 0]}>
        <boxGeometry args={[w, bar, depth]} />
        {mat}
      </mesh>
      <mesh position={[0, -h / 2 + bar / 2, 0]}>
        <boxGeometry args={[w, bar, depth]} />
        {mat}
      </mesh>
      <mesh position={[-w / 2 + bar / 2, 0, 0]}>
        <boxGeometry args={[bar, h, depth]} />
        {mat}
      </mesh>
      <mesh position={[w / 2 - bar / 2, 0, 0]}>
        <boxGeometry args={[bar, h, depth]} />
        {mat}
      </mesh>
    </group>
  )
}

/* -------------------------------------------------------------- decals */
// Alpha-canvas quads laid flush on a surface. polygonOffset pushes the
// decal a hair toward the camera in depth-buffer space (not world space —
// there is no gap to walk through) so it never z-fights the surface it
// rides on.
const decalCache = new Map()
function decalTexture(kind, seed) {
  const key = kind + '|' + seed
  if (decalCache.has(key)) return decalCache.get(key)
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  let s = (seed >>> 0) || 1
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  ctx.clearRect(0, 0, S, S)
  if (kind === 'scuff') {
    for (let i = 0; i < 5; i++) {
      const x = S * (0.3 + r() * 0.4), y = S * (0.3 + r() * 0.4)
      ctx.strokeStyle = `rgba(20,18,14,${0.15 + r() * 0.2})`
      ctx.lineWidth = 2 + r() * 4
      ctx.beginPath()
      ctx.moveTo(x - 30 - r() * 20, y)
      ctx.lineTo(x + 30 + r() * 20, y + (r() - 0.5) * 20)
      ctx.stroke()
    }
  } else if (kind === 'stain') {
    const x = S / 2, y = S / 2
    const g = ctx.createRadialGradient(x, y, 0, x, y, S * 0.42)
    g.addColorStop(0, `rgba(30,24,14,${0.32})`)
    g.addColorStop(0.6, `rgba(30,24,14,0.14)`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(x, y, S * 0.42, 0, Math.PI * 2); ctx.fill()
  } else if (kind === 'crack') {
    ctx.strokeStyle = `rgba(0,0,0,0.55)`
    ctx.lineWidth = 1.4
    ctx.beginPath()
    let x = S * (0.15 + r() * 0.1), y = S * 0.1
    ctx.moveTo(x, y)
    let a = Math.PI / 2 + (r() - 0.5)
    for (let i = 0; i < 9; i++) {
      a += (r() - 0.5) * 1.2
      x += Math.cos(a) * S * 0.09
      y += Math.sin(a) * S * 0.09
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  decalCache.set(key, tex)
  return tex
}

function Decal({ kind, pos, rot, w = 0.5, h = 0.5, seed = 1, opacity = 0.8 }) {
  const tex = useMemo(() => decalTexture(kind, seed), [kind, seed])
  return (
    <mesh position={V3(pos)} rotation={V3(rot)}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial
        map={tex} transparent opacity={opacity} depthWrite={false}
        polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4}
      />
    </mesh>
  )
}
export const Scuff = (p) => <Decal kind="scuff" {...p} />
export const Stain = (p) => <Decal kind="stain" {...p} />
export const CrackLine = (p) => <Decal kind="crack" {...p} />

/* ------------------------------------------------------------- clutter */
// Environmental-storytelling set dressing. Authored placement per room —
// never random confetti (spec's own rule) — but the shapes themselves are
// procedural. Instanced wherever a room asks for count > 8.

function crumpleGeometry(seed, radius) {
  const geo = new THREE.IcosahedronGeometry(radius, 1)
  const pos = geo.attributes.position
  let s = (seed >>> 0) || 1
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  for (let i = 0; i < pos.count; i++) {
    const jitter = 1 + (r() - 0.5) * 0.5
    pos.setXYZ(i, pos.getX(i) * jitter, pos.getY(i) * jitter, pos.getZ(i) * jitter)
  }
  geo.computeVertexNormals()
  return geo
}

export function crumpledPaper({ pos, rot, scale = 1, radius = 0.05, color = '#e8e0c8', seed = 1 }) {
  const geo = useMemo(() => crumpleGeometry(seed, radius), [seed, radius])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <mesh position={V3(pos)} rotation={V3(rot)} scale={scale} geometry={geo}>
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  )
}

export function cup({ pos, rot, scale = 1, color = '#d8d0bc', h = 0.1, r1 = 0.035, r2 = 0.03 }) {
  return (
    <group position={V3(pos)} rotation={V3(rot)} scale={scale}>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[r1, r2, h, 14]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, h - 0.004, 0]}>
        <torusGeometry args={[r1 * 0.9, r1 * 0.1, 6, 14]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
    </group>
  )
}

// bottleRow: instanced when count > 8, plain meshes below that.
export function bottleRow({ pos, rot, scale = 1, count = 5, spacing = 0.09, color = '#3a5a3a', glass = true, seed = 2 }) {
  const items = useMemo(() => Array.from({ length: count }, (_, i) => {
    let s = (seed + i * 97) >>> 0
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    return { x: (i - (count - 1) / 2) * spacing + (r() - 0.5) * spacing * 0.3, h: 0.16 + r() * 0.06, tilt: (r() - 0.5) * 0.25 }
  }), [count, spacing, seed])
  const ref = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const instanced = count > 8
  useEffect(() => {
    if (!instanced || !ref.current) return
    items.forEach((it, i) => {
      dummy.position.set(it.x, it.h / 2, 0)
      dummy.rotation.set(0, 0, it.tilt)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [items, dummy, instanced])
  const body = (
    <cylinderGeometry args={[0.018, 0.022, 1, 8]} />
  )
  const mat = <meshStandardMaterial color={color} roughness={glass ? 0.15 : 0.6} metalness={glass ? 0.1 : 0} transparent={glass} opacity={glass ? 0.82 : 1} />
  return (
    <group position={V3(pos)} rotation={V3(rot)} scale={scale}>
      {instanced ? (
        <instancedMesh ref={ref} args={[null, null, count]} key={count}>
          {body}
          {mat}
        </instancedMesh>
      ) : items.map((it, i) => (
        <mesh key={i} position={[it.x, it.h / 2, 0]} rotation={[0, 0, it.tilt]} scale={[1, it.h, 1]}>
          {body}
          {mat}
        </mesh>
      ))}
    </group>
  )
}

// wireRun: a catmull tube through authored points, with a sag added at the
// midpoint of each segment so it reads as slack cable, not a rigid rod.
export function wireRun({ points = [[0, 1, 0], [1, 0.6, 0], [2, 1, 0]], sag = 0.15, radius = 0.008, color = '#111111' }) {
  const geo = useMemo(() => {
    const pts = points.map((p) => new THREE.Vector3(...p))
    const sagged = []
    for (let i = 0; i < pts.length; i++) {
      sagged.push(pts[i])
      if (i < pts.length - 1) {
        const mid = pts[i].clone().lerp(pts[i + 1], 0.5)
        mid.y -= sag
        sagged.push(mid)
      }
    }
    const curve = new THREE.CatmullRomCurve3(sagged)
    return new THREE.TubeGeometry(curve, Math.max(16, sagged.length * 8), radius, 6, false)
  }, [JSON.stringify(points), sag, radius])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  )
}

export function bookStack({ pos, rot, scale = 1, count = 4, w = 0.22, d = 0.16, colors, seed = 3 }) {
  const items = useMemo(() => {
    let s = (seed >>> 0) || 1
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    const palette = colors || ['#5a3a2a', '#2a3a4a', '#4a2a2a', '#3a4a2a', '#2a2a3a']
    let y = 0
    return Array.from({ length: count }, (_, i) => {
      const h = 0.028 + r() * 0.018
      const item = { y: y + h / 2, h, rotY: (r() - 0.5) * 0.3, color: palette[i % palette.length], w: w * (0.9 + r() * 0.15), d: d * (0.9 + r() * 0.15) }
      y += h
      return item
    })
  }, [count, w, d, seed, colors])
  return (
    <group position={V3(pos)} rotation={V3(rot)} scale={scale}>
      {items.map((it, i) => (
        <mesh key={i} position={[0, it.y, 0]} rotation={[0, it.rotY, 0]}>
          <boxGeometry args={[it.w, it.h, it.d]} />
          <meshStandardMaterial color={it.color} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

export function boxPile({ pos, rot, scale = 1, count = 5, color = '#8a6a44', spread = 0.5, seed = 4 }) {
  const items = useMemo(() => {
    let s = (seed >>> 0) || 1
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    return Array.from({ length: count }, () => {
      const sz = 0.22 + r() * 0.16
      return {
        x: (r() - 0.5) * spread, z: (r() - 0.5) * spread, sz,
        y: sz / 2, rotY: r() * Math.PI,
      }
    })
  }, [count, spread, seed])
  const ref = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const instanced = count > 8
  useEffect(() => {
    if (!instanced || !ref.current) return
    items.forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z)
      dummy.rotation.set(0, it.rotY, 0)
      dummy.scale.set(it.sz, it.sz, it.sz)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [items, dummy, instanced])
  const mat = <meshStandardMaterial color={color} roughness={0.9} />
  return (
    <group position={V3(pos)} rotation={V3(rot)} scale={scale}>
      {instanced ? (
        <instancedMesh ref={ref} args={[null, null, count]} key={count}>
          <boxGeometry args={[1, 1, 1]} />
          {mat}
        </instancedMesh>
      ) : items.map((it, i) => (
        <mesh key={i} position={[it.x, it.y, it.z]} rotation={[0, it.rotY, 0]}>
          <boxGeometry args={[it.sz, it.sz, it.sz]} />
          {mat}
        </mesh>
      ))}
    </group>
  )
}

export function rag({ pos, rot, scale = 1, w = 0.3, h = 0.24, color = '#4a4238', seed = 5 }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, h, 5, 5)
    const p = g.attributes.position
    let s = (seed >>> 0) || 1
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    for (let i = 0; i < p.count; i++) {
      p.setZ(i, (r() - 0.5) * 0.03 + Math.sin(p.getX(i) * 6 + p.getY(i) * 4) * 0.012)
    }
    g.computeVertexNormals()
    return g
  }, [w, h, seed])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <mesh position={V3(pos)} rotation={rot ? V3(rot) : [-Math.PI / 2, 0, 0]} scale={scale} geometry={geo}>
      <meshStandardMaterial color={color} roughness={0.98} side={THREE.DoubleSide} />
    </mesh>
  )
}

export function shardBits({ pos, rot, scale = 1, count = 14, spread = 0.4, color = '#cfe8ea', metal = false, seed = 6 }) {
  const items = useMemo(() => {
    let s = (seed >>> 0) || 1
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    return Array.from({ length: count }, () => ({
      x: (r() - 0.5) * spread, z: (r() - 0.5) * spread,
      rotY: r() * Math.PI, rotX: (r() - 0.5) * 0.6,
      sz: 0.02 + r() * 0.05,
    }))
  }, [count, spread, seed])
  const ref = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const instanced = count > 8
  const geo = useMemo(() => new THREE.TetrahedronGeometry(1, 0), [])
  useEffect(() => () => geo.dispose(), [geo])
  useEffect(() => {
    if (!instanced || !ref.current) return
    items.forEach((it, i) => {
      dummy.position.set(it.x, it.sz * 0.4, it.z)
      dummy.rotation.set(it.rotX, it.rotY, 0)
      dummy.scale.set(it.sz, it.sz * 0.4, it.sz)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [items, dummy, instanced])
  const mat = <meshStandardMaterial color={color} roughness={metal ? 0.4 : 0.1} metalness={metal ? 0.6 : 0} transparent={!metal} opacity={metal ? 1 : 0.75} />
  return (
    <group position={V3(pos)} rotation={V3(rot)} scale={scale}>
      {instanced ? (
        <instancedMesh ref={ref} args={[null, null, count]} key={count} geometry={geo}>
          {mat}
        </instancedMesh>
      ) : items.map((it, i) => (
        <mesh key={i} position={[it.x, it.sz * 0.4, it.z]} rotation={[it.rotX, it.rotY, 0]} scale={[it.sz, it.sz * 0.4, it.sz]} geometry={geo}>
          {mat}
        </mesh>
      ))}
    </group>
  )
}

export const CLUTTER = {
  crumpledPaper, cup, bottleRow, wireRun, bookStack, boxPile, rag, shardBits,
}

export function Clutter({ type, ...rest }) {
  const Comp = CLUTTER[type]
  if (!Comp) return null
  return <Comp {...rest} />
}
