import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { abstractFigure } from '../props.jsx'
import { makeHotTakeTexture, makeMetaTexture, makeScoreTexture } from '../infoTextures.js'
import { sheetOf } from '../../palette.js'
import { setGradeOverride, clearGradeOverride } from '../gradeBus.js'
import { useRoomAudio } from '../audio/engine.js'
import { start as startBR2049Audio } from '../audio/recipes/br2049.js'
import RainField from '../systems/RainField.jsx'
import ScheduledCut from '../systems/ScheduledCut.jsx'
import { makeBillboardTexture, makeWetConcreteTexture } from './br2049Textures.js'
import DoorRow from '../DoorRow.jsx'
import { wasDrag } from '../../pointer.js'
import { registerColliders, setBounds, clearOwner } from '../colliders.js'

// BLADE RUNNER 2049 (2017) · 9.8 · "the sea wall." Brief
// (VAULT-IMMERSION-BRIEF-v2.md §5): night, driving rain, waves detonating
// against concrete, cold blue-grey grade, a monumental far figure facing
// away, the heartbreak line at billboard scale readable only from a
// distance, the score reflected (inverted, rippling) in the wet concrete —
// never upright anywhere. Camera height lowered in this room only.
//
// Geometry in meters. The wall sits at z=-6.5; the water fills the gap
// between the entry deck (z: 3 down to -1) and the wall; the monumental
// figure stands just this side of it, facing -Z, never toward you; the
// billboard is 24m further out, past the wall, at a scale that only reads
// once you've backed off (there is no station that close to it).
const WALL_Z = -6.5
const HEARTBREAK_FRAGMENT = 'him finding out he was not special was truly heartbreaking'

const ENTRY_STATION = { pos: [0, 1.35, 3], look: [0, 1.05, -8], fov: 50 }
const WALL_STATION = { pos: [0, 1.35, -1.5], look: [0, 1.5, -6.5], fov: 54 }
const REFLECTION_STATION = { pos: [0.4, 1.1, 1.6], look: [0, 0.01, 1.1], fov: 46 }
const STATIONS = { entry: ENTRY_STATION, wall: WALL_STATION, reflection: REFLECTION_STATION }

/* ------------------------------------------------------------------ shell */

const texCache = new Map()
function concreteTexture(tint) {
  const key = 'concrete|' + tint
  if (texCache.has(key)) return texCache.get(key)
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, S, S)
  let s = 33
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  ctx.globalAlpha = 0.07
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = r() > 0.5 ? '#000' : '#4a5a62'
    ctx.fillRect(r() * S, r() * S, 1.6, 1.6)
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  texCache.set(key, tex)
  return tex
}

// A 2-pixel-wide vertical gradient strip, stretched across the sky dome by
// the geometry's own UVs — NOT a 512x512 canvas with a 2px-wide painted
// region in the corner (that first pass left over 99% of the canvas fully
// transparent, so the dome sampled mostly empty alpha and read as a hole
// straight through to the app's own starfield backdrop behind it).
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

function SeaWallShell({ grade }) {
  // Lightened from the first pass (#141a1e/#1c2226): against this room's
  // low key light and heavy fog, that near-black concrete tint was
  // indistinguishable from the void — the wall and deck effectively
  // vanished even though they were rendering (QA sweep). A lighter
  // blue-grey stock still reads as wet concrete under a cold key, but
  // actually catches the light.
  const floorTex = useMemo(() => concreteTexture('#2a3540'), [])
  const wallTex = useMemo(() => concreteTexture('#333f48'), [])
  const sky = useMemo(() => skyTexture(grade.fogColor || '#0a1620', '#03060a'), [grade.fogColor])
  return (
    <group>
      {/* the night sky backdrop: a plain flat gradient plane rather than a
          dome — a partial sphereGeometry (the pattern other rooms use for
          their own sky) left most of this camera's forward view looking
          straight through the geometry's own open cap at this room's
          particular height/distance combination (QA sweep). A big plane
          facing the camera's resting look direction is simpler and can't
          have that failure mode. */}
      <mesh position={[0, 10, -45]}>
        <planeGeometry args={[90, 50]} />
        <meshBasicMaterial map={sky} fog={false} />
      </mesh>
      {/* the deck you stand on */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]}>
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial map={floorTex} roughness={0.5} metalness={0.15} />
      </mesh>
      {/* the wall itself */}
      <mesh position={[0, 3, WALL_Z]}>
        <boxGeometry args={[14, 6, 1]} />
        <meshStandardMaterial map={wallTex} roughness={0.85} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 5, 1.2, -3]} rotation={[0, 0, 0]}>
          <boxGeometry args={[1.4, 2.4, 6]} />
          <meshStandardMaterial map={wallTex} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ sea */

// Waves detonating against the wall: a floor-level water plane whose own
// texture animates (ripple bands, same device props.jsx's waterPlane uses)
// plus a set of white burst planes low against the wall base that flash on
// their own uneven schedule — spray catching what little light there is,
// never a synchronized "explosion" beat.
function DetonatingWater() {
  const ref = useRef()
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    return new THREE.CanvasTexture(c)
  }, [])
  useEffect(() => () => tex.dispose(), [tex])
  useFrame(({ clock }) => {
    const c = tex.image
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#081820'
    ctx.fillRect(0, 0, 256, 256)
    const t = clock.elapsedTime
    ctx.strokeStyle = '#3a6a8a'
    ctx.globalAlpha = 0.4
    for (let i = 0; i < 10; i++) {
      const y = ((i * 26 + t * 40) % 300) - 20
      ctx.lineWidth = 2 + Math.sin(t * 2 + i) * 1.2
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.bezierCurveTo(80, y + 14, 176, y - 14, 256, y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    tex.needsUpdate = true
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -3.6]}>
      <planeGeometry args={[10, 5.2]} />
      <meshStandardMaterial map={tex} color="#ffffff" roughness={0.2} metalness={0.15} />
    </mesh>
  )
}

function SplashBursts() {
  const marks = useMemo(() => Array.from({ length: 5 }, (_, i) => ({
    x: (i - 2) * 2.3, seed: i * 3.7 + 1,
  })), [])
  return (
    <group>
      {marks.map((m, i) => <SplashBurst key={i} x={m.x} seed={m.seed} />)}
    </group>
  )
}

function SplashBurst({ x, seed }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime * 0.9 + seed
    // a hard, brief spike rather than a smooth pulse: mostly dark, spray
    // catching light for a beat every few seconds, offset per burst
    const cycle = (t % 4.2) / 4.2
    const active = cycle < 0.12
    ref.current.material.opacity = active ? (1 - cycle / 0.12) * 0.85 : 0
  })
  return (
    <mesh ref={ref} position={[x, 1.0, WALL_Z + 0.55]}>
      <planeGeometry args={[1.1, 1.6]} />
      <meshBasicMaterial color="#dfeaf0" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

/* ------------------------------------------------------------- billboard */

function Billboard() {
  const tex = useMemo(() => makeBillboardTexture(HEARTBREAK_FRAGMENT), [])
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <mesh position={[0, 7, -28]}>
      <planeGeometry args={[24, 6]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

/* ------------------------------------------------- reflection-only score */

// The 9.8 exists ONLY as an inverted, rippling reflection in the wet
// concrete — "no upright numeral anywhere" per the brief. A floor-lying
// plane (rotation already flattens it) with its local Y scaled -1 flips the
// numeral's own reading direction, the same trick Memento's mirror plaque
// uses on X; the "rippling" is a slow sinusoidal opacity/offset shimmer
// rather than a real refraction shader.
function ReflectedScore({ film }) {
  const palette = sheetOf(film.palette)
  const [scoreTex, setScoreTex] = useState(null)
  useEffect(() => {
    let live = true
    const t = makeScoreTexture(film, palette)
    if (live) setScoreTex(t)
    return () => { live = false; t.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.score])
  const concreteTex = useMemo(() => makeWetConcreteTexture(), [])
  useEffect(() => () => concreteTex.dispose(), [concreteTex])

  const scoreRef = useRef()
  useFrame(({ clock }) => {
    if (!scoreRef.current || !scoreRef.current.material.map) return
    const t = clock.elapsedTime
    scoreRef.current.material.opacity = 0.4 + Math.sin(t * 1.3) * 0.12
    scoreRef.current.material.map.offset.x = Math.sin(t * 0.6) * 0.01
  })

  return (
    <group position={[0, 0.006, 1.1]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 2.4]} />
        <meshStandardMaterial map={concreteTex} roughness={0.35} metalness={0.2} transparent opacity={0.9} />
      </mesh>
      {/* scale.y = -1 inverts the numeral's reading direction on this
          floor-lying plane — the reflection trick, never an upright copy */}
      <mesh ref={scoreRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} scale={[1, -1, 1]}>
        <planeGeometry args={[1.1, 1.1]} />
        {scoreTex
          ? <meshBasicMaterial map={scoreTex} transparent opacity={0.4} depthWrite={false} toneMapped={false} />
          : <meshBasicMaterial transparent opacity={0} />}
      </mesh>
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
    <group position={[2.4, 0, 1.7]} rotation={[0, -0.5, 0]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.06, 1.1, 0.06]} />
        <meshStandardMaterial color="#161c20" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.22, 0.02]}>
        <planeGeometry args={[1.0, 0.62]} />
        {hotTex
          ? <meshBasicMaterial key="mapped" map={hotTex} toneMapped={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" color={palette.paper} toneMapped={false} />}
      </mesh>
      <mesh position={[0, 0.86, 0.02]}>
        <planeGeometry args={[0.86, 0.16]} />
        {metaTex
          ? <meshBasicMaterial key="mapped" map={metaTex} transparent depthWrite={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" transparent opacity={0} />}
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ room */

const DOOR_MOUNT = { position: [-4.6, 0, 1.4], rotationY: Math.PI / 2, spacing: 1.0, scale: 0.85 }
const OWNER_ID = 'bespoke:br2049'

export default function BR2049({ film, config, doors = [], goToStation, onDoor }) {
  const { grade } = config
  const [stationKey, setStationKey] = useState('entry')

  const stepTo = (key) => {
    setStationKey(key)
    goToStation?.(STATIONS[key], key)
  }

  // The deck runs from the entry (z=5, the plane's far edge) to the
  // concrete lip at z=-1, where the water starts (DetonatingWater sits at
  // z=-3.6, depth 5.2 -> its near edge is exactly z=-1). Free walking must
  // stop AT that lip — the waves are never walkable, and the monumental
  // figure (z=-5.3, past the wall gap) stays out of reach entirely.
  // Breakwater side walls + the sea wall itself are registered too, even
  // though the bound already keeps the walker well short of them.
  useEffect(() => {
    registerColliders(OWNER_ID, [
      { minX: -5.7, maxX: -4.3, minZ: -6, maxZ: 0 }, // -X breakwater wall
      { minX: 4.3, maxX: 5.7, minZ: -6, maxZ: 0 },    // +X breakwater wall
      { minX: -7, maxX: 7, minZ: -7, maxZ: -6 },      // the sea wall
      { minX: 2.3, maxX: 2.5, minZ: 1.6, maxZ: 1.8 }, // info plinth
    ])
    setBounds(OWNER_ID, { kind: 'rect', minX: -4.6, maxX: 4.6, minZ: -0.7, maxZ: 4.6 })
    return () => clearOwner(OWNER_ID)
  }, [])

  // cold blue-grey resting grade, per the brief's own base — the orange
  // wash is entirely ScheduledCut's job (a full-view overlay), so this
  // override never itself changes over time.
  useEffect(() => {
    setGradeOverride({ sat: grade.sat ?? -0.15, bg: grade.bg, fogColor: grade.fogColor })
    return clearGradeOverride
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useRoomAudio(startBR2049Audio)

  return (
    <group>
      <fogExp2 attach="fog" args={[grade.fogColor || '#0a1620', 0.05]} />
      {/* QA sweep: the first-pass keyIntensity*10 read as a near-black void
          on the wall/floor's own dark concrete tint — this room's textures
          are all cold, low-albedo stock, so the multiplier needs to sit
          well above GenericRoom's already-empirical 16x/4x range rather
          than under it. */}
      <pointLight position={[3, 5, 1]} intensity={(grade.keyIntensity ?? 1) * 30} color={grade.key || '#3a6a8a'} distance={40} decay={1.6} />
      <pointLight position={[0, 3, -6]} intensity={(grade.keyIntensity ?? 1) * 14} color={grade.key || '#3a6a8a'} distance={20} decay={1.8} />
      <ambientLight intensity={0.5} color={grade.fill || '#0a1620'} />

      <SeaWallShell grade={grade} />
      <DetonatingWater />
      <SplashBursts />
      <Billboard />
      <ReflectedScore film={film} />
      <InfoPlinth film={film} />

      {/* the monumental figure: holographic-scale, facing away (-Z),
          never toward you, standing just this side of the wall */}
      {abstractFigure({ pos: [1.6, 0, -5.3], scale: 3.2, color: '#05070a', pose: 'stand', emissive: '#3a6a8a' })}

      <RainField density={500} wind={0.22} area={[9, 6, 8]} color="#bcd6e0" />
      <ScheduledCut period={90} duration={8000} altGrade="#e8874a" />

      {/* three click stations: entry, up at the wall, and down at the
          reflection — same disc-pad convention Matrix's orbit stations use */}
      {Object.entries(STATIONS).map(([key, st]) => (
        <mesh
          key={key}
          position={[st.pos[0], 0.012, st.pos[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e) => { e.stopPropagation(); if (wasDrag()) return; stepTo(key) }}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'auto' }}
        >
          <ringGeometry args={[0.2, 0.26, 20]} />
          <meshBasicMaterial color="#8ac8e0" transparent opacity={stationKey === key ? 0.55 : 0.2} depthWrite={false} />
        </mesh>
      ))}

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
