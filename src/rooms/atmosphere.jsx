import React, { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// The atmosphere kit (Wave P0, IMMERSION-V2-POLISH-SPEC.md #4). Use where
// EARNED — one or two per room, never a full weather system stacked on
// every box. Everything here is canvas/geometry, no loaded assets.

const V3 = (v) => (Array.isArray(v) ? v : [0, 0, 0])

/* --------------------------------------------------------------- HazeCone */
// A volumetric-feel spotlight cone: an additive gradient cone mesh (alpha
// baked along its length so the base and tip both taper to nothing, the
// middle carrying the glow) that fades out as the camera gets close enough
// to clip through its near wall — a hard-edged cone slicing across the lens
// reads as a bug, not fog.
const coneTexCache = new Map()
function coneGradientTexture(color) {
  if (coneTexCache.has(color)) return coneTexCache.get(color)
  const S = 64
  const c = document.createElement('canvas')
  c.width = 4
  c.height = S
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, S)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(0.35, color)
  g.addColorStop(0.7, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, S)
  const tex = new THREE.CanvasTexture(c)
  coneTexCache.set(color, tex)
  return tex
}

export function HazeCone({ pos = [0, 2.2, 0], rot = [0, 0, 0], length = 2.2, radius = 0.9, color = '#e8f0ff', opacity = 0.22 }) {
  const ref = useRef()
  const matRef = useRef()
  const { camera } = useThree()
  const worldPos = useRef(new THREE.Vector3())
  const rgba = useMemo(() => {
    const c = new THREE.Color(color)
    return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},0.9)`
  }, [color])
  const tex = useMemo(() => coneGradientTexture(rgba), [rgba])

  useFrame(() => {
    if (!ref.current || !matRef.current) return
    ref.current.getWorldPosition(worldPos.current)
    const dist = worldPos.current.distanceTo(camera.position)
    const near = THREE.MathUtils.clamp((dist - 0.35) / 0.5, 0, 1)
    matRef.current.opacity = opacity * near
  })

  return (
    <group ref={ref} position={V3(pos)} rotation={V3(rot)}>
      {/* cone apex at the light, opening downward by default; caller rotates
          for a different throw direction */}
      <mesh position={[0, -length / 2, 0]}>
        <coneGeometry args={[radius, length, 20, 1, true]} />
        <meshBasicMaterial
          ref={matRef}
          map={tex}
          color="#ffffff"
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

/* -------------------------------------------------------------- DustField */
// Slow drifting motes — the existing DustDrift system's pattern, exposed
// here as an atmosphere primitive (parameterized density/size) for a room
// that wants dust without also wanting the rest of the `systems` list's
// story-timer machinery.
export function DustField({ pos = [0, 0, 0], density = 60, size = 0.012, color = '#c9c3ae', area = [4, 2.4, 4], speed = 0.12, opacity = 0.35 }) {
  const ref = useRef()
  const count = Math.min(Math.max(density, 1), 220)
  const { positions, base, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * area[0]
      positions[i * 3 + 1] = Math.random() * area[1]
      positions[i * 3 + 2] = (Math.random() - 0.5) * area[2]
      seeds[i * 3] = Math.random() * Math.PI * 2
      seeds[i * 3 + 1] = Math.random() * Math.PI * 2
      seeds[i * 3 + 2] = 0.4 + Math.random() * 0.6
    }
    return { positions, base: positions.slice(), seeds }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, area[0], area[1], area[2]])

  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    const p = g.geometry.attributes.position.array
    const t = clock.elapsedTime * speed
    for (let i = 0; i < count; i++) {
      const ix = i * 3
      const phaseX = seeds[ix], phaseZ = seeds[ix + 1], rate = seeds[ix + 2]
      p[ix] = base[ix] + Math.sin(t * rate + phaseX) * (area[0] * 0.14)
      p[ix + 1] = ((base[ix + 1] + t * rate * 0.35) % area[1] + area[1]) % area[1]
      p[ix + 2] = base[ix + 2] + Math.cos(t * rate + phaseZ) * (area[2] * 0.14)
    }
    g.geometry.attributes.position.needsUpdate = true
  })

  return (
    <group position={V3(pos)}>
      <points ref={ref} key={count}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={size} color={color} transparent opacity={opacity} sizeAttenuation depthWrite={false} />
      </points>
    </group>
  )
}

/* -------------------------------------------------------------- FogLayers */
// Two ground-fog planes scrolling in opposite directions — cheap, reads as
// creeping ground haze rather than a static fogged plane.
const fogTexCache = new Map()
function fogNoiseTexture(color, seed) {
  const key = color + '|' + seed
  if (fogTexCache.has(key)) return fogTexCache.get(key)
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  let s = (seed >>> 0) || 1
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  ctx.clearRect(0, 0, S, S)
  for (let i = 0; i < 24; i++) {
    const x = r() * S, y = r() * S, rad = S * (0.15 + r() * 0.3)
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = 0.25 + r() * 0.25
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  fogTexCache.set(key, tex)
  return tex
}

export function FogLayers({ pos = [0, 0.06, 0], size = [8, 8], color = 'rgba(200,200,210,0.6)', speed = 0.02, opacity = 0.3 }) {
  const a = useRef(), b = useRef()
  const texA = useMemo(() => fogNoiseTexture(color, 11), [color])
  const texB = useMemo(() => fogNoiseTexture(color, 29), [color])
  useMemo(() => { texA.repeat.set(2, 2); texB.repeat.set(2, 2) }, [texA, texB])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    texA.offset.set(t * speed, t * speed * 0.4)
    texB.offset.set(-t * speed * 0.7, t * speed * 0.5)
  })
  return (
    <group position={V3(pos)}>
      <mesh ref={a} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={size} />
        <meshBasicMaterial map={texA} transparent opacity={opacity} depthWrite={false} />
      </mesh>
      <mesh ref={b} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={size} />
        <meshBasicMaterial map={texB} transparent opacity={opacity * 0.7} depthWrite={false} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------- Rainlight */
// A window-light shimmer quad — the animated caustic-ish pattern rain on
// glass throws across a wall/floor, without ever drawing rain itself
// (RainField, the systems-kit particle version, is the actual rain).
export function Rainlight({ pos, rot = [0, 0, 0], w = 1.4, h = 1.8, color = '#9fb0c0', intensity = 0.35, speed = 0.6 }) {
  const ref = useRef()
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 64; c.height = 128
    return new THREE.CanvasTexture(c)
  }, [])
  const rgb = useMemo(() => {
    const cc = new THREE.Color(color)
    return [Math.round(cc.r * 255), Math.round(cc.g * 255), Math.round(cc.b * 255)]
  }, [color])
  useFrame(({ clock }) => {
    const c = tex.image
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, 64, 128)
    const t = clock.elapsedTime * speed
    ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.5)`
    for (let i = 0; i < 10; i++) {
      const x = (i * 6.4 + t * 14) % 64
      ctx.lineWidth = 1 + Math.sin(t * 2 + i) * 0.6
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x + Math.sin(t + i) * 6, 128)
      ctx.stroke()
    }
    tex.needsUpdate = true
  })
  return (
    <mesh ref={ref} position={V3(pos)} rotation={V3(rot)}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} color={color} transparent opacity={intensity} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  )
}

export const ATMOSPHERE = { HazeCone, DustField, FogLayers, Rainlight }

export function Atmosphere({ type, ...rest }) {
  const Comp = ATMOSPHERE[type]
  if (!Comp) return null
  return <Comp {...rest} />
}
