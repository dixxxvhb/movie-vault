import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { abstractFigure } from '../props.jsx'
import { makeHotTakeTexture, makeMetaTexture } from '../infoTextures.js'
import { sheetOf } from '../../palette.js'
import { setGradeOverride, clearGradeOverride } from '../gradeBus.js'
import { useRoomAudio } from '../audio/engine.js'
import { start as startMatrixAudio } from '../audio/recipes/matrix.js'
import { getMatrixGlyphTextures, makeGlyphStripTexture, makeMatrixCharGlyphTexture } from './matrixTextures.js'
import DoorRow from '../DoorRow.jsx'

// THE MATRIX (1999) · 9.8 · "the rooftop, mid bullet-time." Brief
// (VAULT-IMMERSION-BRIEF-v2.md §5): the helipad rooftop, hazy overcast city,
// green-tinted grade; a FROZEN radial shockwave — concentric shells + a
// suspended particle trail — around a crouched figure, walkable, that
// resumes for exactly one second on click; falling code on the periphery in
// an alphabet we designed ourselves (matrixTextures.js), never the film's;
// the score rains into place as glyphs and freezes.
//
// Geometry in meters. The sculpture sits at the world origin; the entry
// station and three orbit stations ring it at radius ~3.2m so you can walk
// around the freeze without ever leaving the helipad.
const GLYPH_COLOR = '#5fe88a'
const SHELL_COLOR = '#bcd8a0'

const ENTRY_STATION = { pos: [0, 1.7, 3.4], look: [0, 1.3, 0], fov: 52 }
const ORBIT_ANGLES = [40, 130, 220, 300] // degrees, entry sits at ~90
function orbitStation(deg) {
  const rad = (deg * Math.PI) / 180
  const r = 3.2
  const pos = [Math.sin(rad) * r, 1.7, Math.cos(rad) * r]
  return { pos, look: [0, 1.3, 0], fov: 52 }
}
const STATIONS = ORBIT_ANGLES.map(orbitStation)

const clamp01 = (v) => Math.max(0, Math.min(1, v))

/* ------------------------------------------------------------------ shell */

const texCache = new Map()
function buildGroundTexture(tint) {
  if (texCache.has(tint)) return texCache.get(tint)
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, S, S)
  // a faint helipad ring + crossed guide lines, poured concrete otherwise
  ctx.strokeStyle = '#cfe0b8'
  ctx.globalAlpha = 0.35
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, S * 0.34, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(S * 0.2, S / 2); ctx.lineTo(S * 0.8, S / 2)
  ctx.moveTo(S / 2, S * 0.2); ctx.lineTo(S / 2, S * 0.8)
  ctx.stroke()
  ctx.globalAlpha = 0.08
  let s = 71
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = r() > 0.5 ? '#000' : '#fff'
    ctx.fillRect(r() * S, r() * S, 1.6, 1.6)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  texCache.set(tint, tex)
  return tex
}

function skyTexture(top, bottom) {
  const key = 'sky|' + top + '|' + bottom
  if (texCache.has(key)) return texCache.get(key)
  const c = document.createElement('canvas')
  c.width = 2
  c.height = 512
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 512)
  g.addColorStop(0, top)
  g.addColorStop(1, bottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 2, 512)
  const tex = new THREE.CanvasTexture(c)
  texCache.set(key, tex)
  return tex
}

function RoofShell({ grade }) {
  const groundTex = useMemo(() => buildGroundTexture('#3c3e34'), [])
  const sky = useMemo(() => skyTexture(grade.fill || '#5a6a48', '#2a3222'), [grade.fill])
  // hazy distant city, overcast — same deterministic-box trick GenericRoom's
  // OpenShell uses, kept local so this bespoke room has no dependency on it
  const city = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    x: (Math.sin(i * 12.9898) * 0.5) * 70,
    z: -26 - (i % 5) * 7,
    h: 2.4 + (i % 6) * 1.8,
    w: 1.6 + (i % 3) * 0.7,
  })), [])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[7, 6]} />
        <meshStandardMaterial map={groundTex} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0, -30]}>
        <sphereGeometry args={[80, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
        <meshBasicMaterial map={sky} side={THREE.BackSide} fog={false} />
      </mesh>
      {/* the ledge: the helipad drops off just past its own ring */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[7, 7.4, 1, 24, 1, true]} />
        <meshStandardMaterial color="#26281f" roughness={0.95} side={THREE.BackSide} />
      </mesh>
      {city.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial color="#1a1c16" emissive={grade.key || '#7fae5a'} emissiveIntensity={0.06} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------ shockwave */

// The frozen shockwave: concentric transparent shells, a suspended particle
// trail, and the crouched figure at its focus. `burstStart` (elapsedTime of
// the last click, or null) drives the one-second resume; everything here
// reads a single `radiusMult(t)` curve so the shells and the particles
// surge in lockstep.
function radiusMult(elapsed, burstStart) {
  if (burstStart == null) return 1
  const t = elapsed - burstStart
  if (t < 0 || t > 1) return 1
  // hard attack out to 1.9x by t=0.4, settle back to 1 by t=1 — "particles
  // surge outward, then re-freeze," not a smooth sine round-trip
  if (t < 0.4) return THREE.MathUtils.lerp(1, 1.9, t / 0.4)
  return THREE.MathUtils.lerp(1.9, 1, (t - 0.4) / 0.6)
}

function ShockwaveShells({ burstRef }) {
  const refs = [useRef(), useRef(), useRef()]
  const radii = [0.55, 0.95, 1.4]
  useFrame(({ clock }) => {
    const m = radiusMult(clock.elapsedTime, burstRef.current)
    refs.forEach((ref) => {
      if (ref.current) ref.current.scale.setScalar(m)
    })
  })
  return (
    <group position={[0, 1.15, 0]}>
      {radii.map((r, i) => (
        <mesh key={i} ref={refs[i]}>
          <sphereGeometry args={[r, 24, 16]} />
          <meshPhysicalMaterial
            color={SHELL_COLOR} transparent opacity={0.14 - i * 0.02} roughness={0.1}
            transmission={0.55} side={THREE.DoubleSide} depthWrite={false}
          />
        </mesh>
      ))}
      {radii.map((r, i) => (
        <lineSegments key={'w' + i}>
          <edgesGeometry args={[new THREE.SphereGeometry(r, 12, 8)]} />
          <lineBasicMaterial color="#4fd67a" transparent opacity={0.35} />
        </lineSegments>
      ))}
    </group>
  )
}

// Suspended particle trails: fixed radial directions, each holding a base
// radius; frozen they sit at that radius, and the burst multiplies it live.
function ShockwaveTrails({ burstRef }) {
  const COUNT = 260
  const ref = useRef()
  const { base, dir } = useMemo(() => {
    const base = new Float32Array(COUNT)
    const dir = []
    let s = 909
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    for (let i = 0; i < COUNT; i++) {
      base[i] = 0.3 + r() * 1.5
      const theta = r() * Math.PI * 2
      const phi = Math.acos(2 * r() - 1) * 0.6 + 0.2 // biased toward the equator band, not a full sphere
      dir.push([Math.sin(phi) * Math.cos(theta), Math.cos(phi) * 0.7, Math.sin(phi) * Math.sin(theta)])
    }
    return { base, dir }
  }, [])
  const positions = useMemo(() => new Float32Array(COUNT * 3), [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const m = radiusMult(clock.elapsedTime, burstRef.current)
    for (let i = 0; i < COUNT; i++) {
      const rr = base[i] * m
      positions[i * 3] = dir[i][0] * rr
      positions[i * 3 + 1] = 1.15 + dir[i][1] * rr
      positions[i * 3 + 2] = dir[i][2] * rr
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={COUNT} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#8aff9a" transparent opacity={0.75} sizeAttenuation depthWrite={false} />
    </points>
  )
}

// The whole sculpture's click target: a big invisible sphere, generous
// enough to catch a click from any of the orbit stations without requiring
// a precise hit on one of the thin shockwave shells themselves.
function WaveClickTarget({ onTouch }) {
  return (
    <mesh
      position={[0, 1.15, 0]}
      onClick={(e) => { e.stopPropagation(); onTouch() }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = 'auto' }}
    >
      <sphereGeometry args={[1.7, 16, 12]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

/* --------------------------------------------------------------- glyphs */

// One falling column: a tall repeating glyph-strip texture, scrolled via
// texture.offset.y (cheap — no per-frame canvas redraw, unlike a live-drawn
// approach). Distinct from systems/GlyphRain.jsx's instanced-quad columns;
// this room wants ~24 distinct marks and its own strip-scroll feel for the
// periphery rain plus the score-assembly glyphs below, so it stays local.
function GlyphColumn({ x, z, height, speed, seed }) {
  const ref = useRef()
  const tex = useMemo(() => makeGlyphStripTexture(GLYPH_COLOR, seed), [seed])
  useEffect(() => () => tex.dispose(), [tex])
  useFrame(({ clock }) => {
    tex.offset.y = (clock.elapsedTime * speed + seed) % 1
  })
  return (
    <mesh ref={ref} position={[x, height / 2, z]}>
      <planeGeometry args={[0.4, height]} />
      <meshBasicMaterial map={tex} transparent opacity={0.75} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

function GlyphPeriphery() {
  const cols = useMemo(() => {
    const out = []
    const ring = 5.4
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      out.push({ x: Math.sin(a) * ring, z: Math.cos(a) * ring, seed: i * 3.1, speed: 0.25 + (i % 3) * 0.12 })
    }
    return out
  }, [])
  return (
    <group>
      {cols.map((c, i) => <GlyphColumn key={i} x={c.x} z={c.z} height={5.5} speed={c.speed} seed={c.seed} />)}
    </group>
  )
}

/* ---------------------------------------------------- score, rained in */

// The 9.8: three characters ('9', '.', '8'), each its own falling strip that
// scrolls for a settle window and then crossfades into a static glyph
// drawn in the SAME stroke vocabulary — "rains into place as glyphs and
// freezes," never a typeset numeral. Settles are staggered per character and
// never re-trigger once landed.
function ScoreGlyphs({ film }) {
  const chars = useMemo(() => String((film.score ?? 9.8).toFixed(1)).split(''), [film.score])
  const settleAt = useMemo(() => chars.map((_, i) => 2.4 + i * 0.9 + Math.random() * 0.6), [chars])
  const stripTex = useMemo(() => makeGlyphStripTexture(GLYPH_COLOR, 401), [])
  const finalTexes = useMemo(
    () => chars.map((ch) => makeMatrixCharGlyphTexture(ch.charCodeAt(0), '#e8ffe0')),
    [chars]
  )
  useEffect(() => () => { stripTex.dispose(); finalTexes.forEach((t) => t.dispose()) }, [stripTex, finalTexes])

  const rainRefs = useMemo(() => chars.map(() => React.createRef()), [chars])
  const finalRefs = useMemo(() => chars.map(() => React.createRef()), [chars])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    chars.forEach((_, i) => {
      const settled = t > settleAt[i]
      const fadeT = clamp01((t - settleAt[i]) / 0.5)
      if (rainRefs[i].current) {
        rainRefs[i].current.material.map.offset.y = (t * 1.4 + i) % 1
        rainRefs[i].current.material.opacity = settled ? (1 - fadeT) * 0.9 : 0.9
      }
      if (finalRefs[i].current) {
        finalRefs[i].current.material.opacity = settled ? fadeT : 0
      }
    })
  })

  return (
    <group position={[0, 2.2, -0.9]}>
      {chars.map((ch, i) => (
        <group key={i} position={[i * 0.42 - (chars.length - 1) * 0.21, 0, 0]}>
          <mesh ref={rainRefs[i]}>
            <planeGeometry args={[0.36, 0.52]} />
            <meshBasicMaterial map={stripTex} transparent opacity={0.9} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh ref={finalRefs[i]} position={[0, 0, 0.01]}>
            <planeGeometry args={[0.36, 0.52]} />
            <meshBasicMaterial map={finalTexes[i]} transparent opacity={0} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* -------------------------------------------------------------- record */

function InfoPlinth({ film }) {
  const palette = sheetOf(film.palette)
  const [hotTex, setHotTex] = useState(null)
  const [metaTex, setMetaTex] = useState(null)
  useEffect(() => {
    let live = true
    const h = makeHotTakeTexture(film, palette)
    const m = makeMetaTexture(film, palette)
    if (live) { setHotTex(h); setMetaTex(m) }
    return () => { live = false; h.dispose(); m.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug])

  return (
    <group position={[-2.1, 0, 1.6]} rotation={[0, 0.4, 0]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.06, 1.1, 0.06]} />
        <meshStandardMaterial color="#22241c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.22, 0.02]}>
        <planeGeometry args={[1.0, 0.62]} />
        {hotTex
          ? <meshBasicMaterial key="mapped" map={hotTex} toneMapped={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" color={palette.paper} toneMapped={false} />}
      </mesh>
      <mesh position={[0, 0.86, 0.02]}>
        <planeGeometry args={[0.86, 0.16] } />
        {metaTex
          ? <meshBasicMaterial key="mapped" map={metaTex} transparent depthWrite={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" transparent opacity={0} />}
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ room */

const DOOR_MOUNT = { position: [2.6, 0, 2.2], rotationY: -Math.PI / 4, spacing: 1.0, scale: 0.85 }

export default function Matrix({ film, config, doors = [], goToStation, onDoor }) {
  const { grade } = config
  const [stationIndex, setStationIndex] = useState(-1) // -1 = entry
  const burstRef = useRef(null)

  const stepTo = (i) => {
    setStationIndex(i)
    goToStation?.(i < 0 ? ENTRY_STATION : STATIONS[i], i < 0 ? 'entry' : 'orbit-' + i)
  }

  const touchWave = () => { burstRef.current = performance.now() / 1000 }
  // clear the burst well after it's finished so radiusMult's t math never
  // has to worry about a huge elapsed-time delta on a second click
  useFrame(({ clock }) => {
    if (burstRef.current != null && clock.elapsedTime - burstRef.current > 1.2) burstRef.current = null
  })

  // overcast green-tinted grade, steady — this room has no split/depth
  // logic, so the override just republishes the config's own grade fields
  // (kept on gradeBus for consistency with the other bespoke rooms rather
  // than skipping the hook entirely).
  useEffect(() => {
    setGradeOverride({ sat: grade.sat ?? -0.05, hue: grade.hue ?? 0.03, contrast: grade.contrast ?? 0 })
    return clearGradeOverride
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useRoomAudio(startMatrixAudio)

  return (
    <group>
      <fogExp2 attach="fog" args={[grade.fill || '#3a4a2a', 0.028]} />
      <pointLight position={[2, 4, 2]} intensity={(grade.keyIntensity ?? 1) * 20} color={grade.key || '#7fae5a'} distance={26} decay={1.8} />
      <ambientLight intensity={grade.ambient ?? 0.28} color={grade.fill || '#2a3a22'} />

      <RoofShell grade={grade} />

      <group>
        {abstractFigure({ pos: [0, 0, 0], pose: 'crouch', color: '#12140f' })}
        <ShockwaveShells burstRef={burstRef} />
        <ShockwaveTrails burstRef={burstRef} />
        <WaveClickTarget onTouch={touchWave} />
      </group>

      <GlyphPeriphery />
      <ScoreGlyphs film={film} />
      <InfoPlinth film={film} />

      {/* orbit stations: small ring pads on the helipad, click to walk to
          that vantage; entry pad returns you to the front-on station */}
      {STATIONS.map((st, i) => (
        <mesh
          key={i}
          position={[st.pos[0], 0.01, st.pos[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e) => { e.stopPropagation(); stepTo(i) }}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'auto' }}
        >
          <ringGeometry args={[0.22, 0.28, 20]} />
          <meshBasicMaterial color="#8aff9a" transparent opacity={stationIndex === i ? 0.55 : 0.22} depthWrite={false} />
        </mesh>
      ))}
      <mesh
        position={[ENTRY_STATION.pos[0], 0.01, ENTRY_STATION.pos[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); stepTo(-1) }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        <ringGeometry args={[0.22, 0.28, 20]} />
        <meshBasicMaterial color="#8aff9a" transparent opacity={stationIndex === -1 ? 0.55 : 0.22} depthWrite={false} />
      </mesh>

      <DoorRow
        doors={doors}
        position={DOOR_MOUNT.position}
        rotationY={DOOR_MOUNT.rotationY}
        spacing={DOOR_MOUNT.spacing}
        scale={DOOR_MOUNT.scale}
        grade={grade}
        onDoor={onDoor}
      />
    </group>
  )
}
