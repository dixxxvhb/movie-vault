import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// The prop kit: parameterized primitive set pieces. Every export is a pure
// component — pos/rot/scale/color/emissive props, no config reads, no
// imports from configs.js/registry.js (props.js is a leaf module so
// GenericRoom, systems/, and configs can all sit above it without a cycle).
//
// Everything here is built from three's primitive geometries + flat/standard
// materials. No textures loaded from disk, no external geometry — where a
// prop wants surface detail it draws its own canvas (see makeGrain below).

const V3 = (v) => (Array.isArray(v) ? v : [0, 0, 0])

function makeGrainCanvas(seed = 1, base = '#2a2a2a', spots = 900) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const x = c.getContext('2d')
  let s = seed >>> 0
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  x.fillStyle = base
  x.fillRect(0, 0, 256, 256)
  for (let i = 0; i < spots; i++) {
    x.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${0.03 + r() * 0.05})`
    x.fillRect(r() * 256, r() * 256, 1.4, 1.4)
  }
  return c
}

const grainCache = new Map()
export function grainTexture(seed, base) {
  const key = seed + '|' + base
  if (!grainCache.has(key)) {
    const t = new THREE.CanvasTexture(makeGrainCanvas(seed, base))
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(2, 2)
    grainCache.set(key, t)
  }
  return grainCache.get(key)
}

function Wrap({ pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, children }) {
  const s = Array.isArray(scale) ? scale : [scale, scale, scale]
  return <group position={V3(pos)} rotation={V3(rot)} scale={s}>{children}</group>
}

/* --------------------------------------------------------------- generic */

export function slab({ pos, rot, scale = 1, size = [1, 1, 1], color = '#555', emissive, emissiveIntensity = 0, roughness = 0.85, metalness = 0.05 }) {
  return (
    <Wrap pos={pos} rot={rot} scale={scale}>
      <mesh castShadow={false} receiveShadow={false}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} emissive={emissive || '#000'} emissiveIntensity={emissiveIntensity} roughness={roughness} metalness={metalness} />
      </mesh>
    </Wrap>
  )
}

export function table({ pos, rot, scale = 1, w = 1.4, d = 0.8, h = 0.75, color = '#4a3626' }) {
  return (
    <Wrap pos={pos} rot={rot} scale={scale}>
      <mesh position={[0, h - 0.04, 0]}>
        <boxGeometry args={[w, 0.08, d]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (w / 2 - 0.08), (h - 0.08) / 2, sz * (d / 2 - 0.08)]}>
          <boxGeometry args={[0.07, h - 0.08, 0.07]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      ))}
    </Wrap>
  )
}

export function chairRow({ pos, rot, scale = 1, count = 6, spacing = 0.62, color = '#3a3f4a', seatH = 0.46 }) {
  const items = useMemo(() => Array.from({ length: count }, (_, i) => i - (count - 1) / 2), [count])
  return (
    <Wrap pos={pos} rot={rot} scale={scale}>
      {items.map((i) => (
        <group key={i} position={[i * spacing, 0, 0]}>
          <mesh position={[0, seatH, 0]}>
            <boxGeometry args={[0.44, 0.06, 0.44]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[0, seatH + 0.3, -0.2]}>
            <boxGeometry args={[0.44, 0.6, 0.06]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[0, seatH / 2, 0]}>
            <boxGeometry args={[0.04, seatH, 0.04]} />
            <meshStandardMaterial color="#1c1e22" roughness={0.6} metalness={0.4} />
          </mesh>
        </group>
      ))}
    </Wrap>
  )
}

export function counter({ pos, rot, scale = 1, w = 2.4, d = 0.7, h = 0.95, color = '#5a4530' }) {
  return (
    <Wrap pos={pos} rot={rot} scale={scale}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, h + 0.02, 0]}>
        <boxGeometry args={[w + 0.06, 0.05, d + 0.06]} />
        <meshStandardMaterial color="#2c2118" roughness={0.5} />
      </mesh>
    </Wrap>
  )
}

export function barShelf({ pos, rot, scale = 1, count = 14, w = 2, rows = 2, color = '#3a2a1e', glint = '#e8b060' }) {
  const bottles = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: (i / count - 0.5) * w + (Math.sin(i * 12.9) * 0.02),
    row: i % rows,
    h: 0.28 + (i % 5) * 0.02,
  })), [count, w, rows])
  return (
    <Wrap pos={pos} rot={rot} scale={scale}>
      {[0, 1].slice(0, rows).map((r) => (
        <mesh key={r} position={[0, 0.3 + r * 0.34, 0]}>
          <boxGeometry args={[w + 0.1, 0.03, 0.22]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
      ))}
      {bottles.map((b, i) => (
        <mesh key={i} position={[b.x, 0.32 + b.row * 0.34 + b.h / 2, 0]}>
          <cylinderGeometry args={[0.035, 0.045, b.h, 8]} />
          <meshStandardMaterial color={glint} emissive={glint} emissiveIntensity={0.35} roughness={0.2} metalness={0.1} transparent opacity={0.85} />
        </mesh>
      ))}
    </Wrap>
  )
}

export function bed({ pos, rot, scale = 1, color = '#8a8072', frame = '#3a3226' }) {
  return (
    <Wrap pos={pos} rot={rot} scale={scale}>
      <mesh position={[0, 0.24, 0]}>
        <boxGeometry args={[1.3, 0.28, 2]} />
        <meshStandardMaterial color={frame} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.24, 0.16, 1.94]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.56, -0.85]}>
        <boxGeometry args={[1.24, 0.22, 0.3]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.66, 0.95]}>
        <boxGeometry args={[1.3, 0.7, 0.06]} />
        <meshStandardMaterial color={frame} roughness={0.8} />
      </mesh>
    </Wrap>
  )
}

// screenPanel: emissive plane w/ a canvas texture. `draw(ctx,W,H)` lets a
// config author a specific readout (isobars, filter %, scrolling text)
// without a new prop type; default is a soft gradient card.
export function screenPanel({ pos, rot, scale = 1, w = 1, h = 0.6, color = '#eee', intensity = 0.7, draw }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512; c.height = Math.round(512 * (h / w))
    const ctx = c.getContext('2d')
    if (draw) {
      draw(ctx, c.width, c.height)
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, c.height)
      g.addColorStop(0, color)
      g.addColorStop(1, '#00000000')
      ctx.fillStyle = color
      ctx.fillRect(0, 0, c.width, c.height)
    }
    const t = new THREE.CanvasTexture(c)
    t.needsUpdate = true
    return t
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, color])
  return (
    <Wrap pos={pos} rot={rot} scale={scale}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} color={color} transparent opacity={0.94} side={THREE.DoubleSide} />
      </mesh>
    </Wrap>
  )
}

export function podium({ pos, rot, scale = 1, color = '#3a3a42' }) {
  return (
    <Wrap pos={pos} rot={rot} scale={scale}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.55, 1.1, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.14, 0.08]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[0.5, 0.05, 0.32]} />
        <meshStandardMaterial color="#20222a" roughness={0.4} />
      </mesh>
    </Wrap>
  )
}

export function throne({ pos, rot, scale = 1, color = '#3a2a44', accent = '#e8dcc0' }) {
  return (
    <Wrap pos={pos} rot={rot} scale={scale}>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[1, 0.7, 1]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.2, -0.45]}>
        <boxGeometry args={[1, 1.6, 0.14]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={i} position={[x, 1.9, -0.45]}>
          <coneGeometry args={[0.1, 0.35, 4]} />
          <meshStandardMaterial color={accent} roughness={0.3} metalness={0.2} />
        </mesh>
      ))}
      {[-0.55, 0.55].map((x, i) => (
        <mesh key={i} position={[x, 0.7, 0]}>
          <boxGeometry args={[0.12, 0.65, 0.9]} />
          <meshStandardMaterial color={color} roughness={0.55} />
        </mesh>
      ))}
    </Wrap>
  )
}

export function tree({ pos, rot, scale = 1, trunk = '#3a2a1e', foliage = '#2c4a2c', h = 3 }) {
  return (
    <Wrap pos={pos} rot={rot} scale={scale}>
      <mesh position={[0, h * 0.22, 0]}>
        <cylinderGeometry args={[0.09, 0.16, h * 0.44, 8]} />
        <meshStandardMaterial color={trunk} roughness={0.9} />
      </mesh>
      <mesh position={[0, h * 0.6, 0]}>
        <coneGeometry args={[h * 0.32, h * 0.7, 9]} />
        <meshStandardMaterial color={foliage} roughness={0.85} />
      </mesh>
      <mesh position={[0, h * 0.42, 0]}>
        <coneGeometry args={[h * 0.4, h * 0.5, 9]} />
        <meshStandardMaterial color={foliage} roughness={0.85} />
      </mesh>
    </Wrap>
  )
}

export function branchTags({ pos, rot, scale = 1, count = 18, radius = 1.1, color = '#e8dcc0' }) {
  const ref = useRef()
  const items = useMemo(() => Array.from({ length: count }, (_, i) => ({
    a: (i / count) * Math.PI * 2 + i * 0.37,
    r: radius * (0.5 + (i % 4) * 0.16),
    y: 1.4 + (i % 5) * 0.32,
    phase: i * 1.7,
  })), [count, radius])
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.children.forEach((g, i) => {
      const t = clock.elapsedTime
      g.rotation.z = Math.sin(t * 0.7 + items[i].phase) * 0.18
    })
  })
  return (
    <group ref={ref} position={V3(pos)} rotation={V3(rot)} scale={scale}>
      {items.map((it, i) => (
        <mesh key={i} position={[Math.cos(it.a) * it.r, it.y, Math.sin(it.a) * it.r]}>
          <planeGeometry args={[0.09, 0.13]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

export function waterPlane({ pos, rot = [-Math.PI / 2, 0, 0], scale = 1, size = [12, 12], color = '#0a2430', bright = '#3aa0c0' }) {
  const ref = useRef()
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    return new THREE.CanvasTexture(c)
  }, [])
  useFrame(({ clock }) => {
    const c = tex.image
    const ctx = c.getContext('2d')
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 256, 256)
    const t = clock.elapsedTime
    ctx.strokeStyle = bright
    ctx.globalAlpha = 0.35
    for (let i = 0; i < 8; i++) {
      const y = ((i * 34 + t * 22) % 300) - 20
      ctx.lineWidth = 2 + Math.sin(t + i) * 1
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.bezierCurveTo(64, y + 10, 192, y - 10, 256, y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    tex.needsUpdate = true
  })
  return (
    <mesh ref={ref} position={V3(pos)} rotation={rot} scale={scale}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={tex} color="#ffffff" roughness={0.25} metalness={0.1} />
    </mesh>
  )
}

export function glassWall({ pos, rot, scale = 1, w = 2, h = 2.2, color = '#a8d8e0', frame = '#20242a' }) {
  return (
    <Wrap pos={pos} rot={rot} scale={scale}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshPhysicalMaterial color={color} transparent opacity={0.18} roughness={0.05} metalness={0} transmission={0.4} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(w, h)]} />
        <lineBasicMaterial color={frame} />
      </lineSegments>
    </Wrap>
  )
}

export function mirrorPlane({ pos, rot, scale = 1, w = 1, h = 1.6, tint = '#8899a0' }) {
  return (
    <Wrap pos={pos} rot={rot} scale={scale}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={tint} roughness={0.05} metalness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[w + 0.06, h + 0.06]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
      </mesh>
    </Wrap>
  )
}

export function vehicleMass({ pos, rot, scale = 1, color = '#a02020', w = 1.8, h = 1.1, d = 4 }) {
  return (
    <Wrap pos={pos} rot={rot} scale={scale}>
      <mesh position={[0, h * 0.32, 0]}>
        <boxGeometry args={[w, h * 0.5, d]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh position={[0, h * 0.62, -d * 0.08]}>
        <boxGeometry args={[w * 0.86, h * 0.42, d * 0.5]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.3} />
      </mesh>
      {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * w * 0.42, 0.14, sz * d * 0.32]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.16, 0.16, 0.14, 16]} />
          <meshStandardMaterial color="#111" roughness={0.8} />
        </mesh>
      ))}
    </Wrap>
  )
}

export function abstractFigure({ pos, rot, scale = 1, color = '#12141a', pose = 'stand', emissive }) {
  const poseY = pose === 'sit' ? 0.62 : pose === 'crouch' ? 0.5 : 0.9
  const bodyScale = pose === 'crouch' ? [1, 0.55, 1] : pose === 'sit' ? [1, 0.7, 1] : [1, 1, 1]
  const legRot = pose === 'walk-cycle-frozen' ? 0.5 : 0
  return (
    <Wrap pos={pos} rot={rot} scale={scale}>
      <mesh position={[0, poseY * 0.5, 0]} scale={bodyScale}>
        <capsuleGeometry args={[0.2, poseY * 0.6, 4, 8]} />
        <meshStandardMaterial color={color} emissive={emissive || '#000'} emissiveIntensity={emissive ? 0.3 : 0} roughness={0.95} />
      </mesh>
      <mesh position={[0, poseY + 0.14, 0]}>
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      <mesh position={[0.06, poseY * 0.25, 0.06]} rotation={[legRot, 0, 0]}>
        <capsuleGeometry args={[0.07, poseY * 0.5, 4, 6]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      <mesh position={[-0.06, poseY * 0.25, -0.06]} rotation={[-legRot, 0, 0]}>
        <capsuleGeometry args={[0.07, poseY * 0.5, 4, 6]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
    </Wrap>
  )
}

// paperScatter: instanced quads. Count keyed on the mesh key so a resize
// never hits the "resizing buffer attributes" throw (P1 sharp edge).
export function paperScatter({ pos, rot, scale = 1, count = 30, area = [2, 2], color = '#e8e0c8' }) {
  const ref = useRef()
  const items = useMemo(() => Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * area[0],
    z: (Math.random() - 0.5) * area[1],
    r: Math.random() * Math.PI,
    tilt: (Math.random() - 0.5) * 0.3,
  })), [count, area[0], area[1]])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useMemo(() => {
    // positioned once on mount / count change via effect below
  }, [])
  React.useEffect(() => {
    if (!ref.current) return
    items.forEach((it, i) => {
      dummy.position.set(it.x, 0.01, it.z)
      dummy.rotation.set(Math.PI / 2 + it.tilt, it.r, 0)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [items, dummy])
  return (
    <group position={V3(pos)} rotation={V3(rot)} scale={scale}>
      <instancedMesh ref={ref} args={[null, null, count]} key={count}>
        <planeGeometry args={[0.14, 0.2]} />
        <meshStandardMaterial color={color} roughness={0.95} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  )
}

export function pool({ pos, rot = [-Math.PI / 2, 0, 0], scale = 1, radius = 1.6, color = '#0a2a30', glow = '#3ac8d8' }) {
  return (
    <group position={V3(pos)} rotation={rot} scale={scale}>
      <mesh position={[0, 0, -0.02]}>
        <circleGeometry args={[radius + 0.15, 32]} />
        <meshStandardMaterial color="#2a2a28" roughness={0.9} />
      </mesh>
      <mesh>
        <circleGeometry args={[radius, 32]} />
        <meshStandardMaterial color={color} emissive={glow} emissiveIntensity={0.5} roughness={0.15} />
      </mesh>
    </group>
  )
}

// `intensity` is authored small (0.15-1.4, human "how bright is this lamp
// relative to its neighbors" scale) and scaled up here — same physically-
// based-lighting correction as GenericRoom's key/fill (see its comment).
export function lampPractical({ pos, rot, scale = 1, color = '#ffb968', intensity = 1.4, distance = 5 }) {
  return (
    <Wrap pos={pos} rot={rot} scale={scale}>
      <mesh>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} />
      </mesh>
      <pointLight color={color} intensity={intensity * 14} distance={distance} decay={2} />
    </Wrap>
  )
}

export const PROPS = {
  slab, table, chairRow, counter, barShelf, bed, screenPanel, podium, throne,
  tree, branchTags, waterPlane, glassWall, mirrorPlane, vehicleMass,
  abstractFigure, paperScatter, pool, lampPractical,
}

export function Prop({ type, ...rest }) {
  const Comp = PROPS[type]
  if (!Comp) return null
  return <Comp {...rest} />
}
