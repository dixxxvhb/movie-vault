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
import Touchable from '../Touchable.jsx'
import { standardMat } from '../materials.js'
import { Bevel, Trim } from '../detail.jsx'
import LightRig from '../lightRig.js'
import { Rainlight } from '../atmosphere.jsx'

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

function SeaWallShell({ grade, onTouchDeck }) {
  // materials.js standardMat surfaces (Wave P1 finishing pass) replace the
  // room's own hand-rolled canvas helper. `wetconcrete` gives the deck real
  // sheen pools that catch the cold key at a grazing angle — the "wet
  // concrete everywhere" the brief calls for. The wall and the two
  // breakwater faces are all `concrete` but never share params (spec rule:
  // no two adjacent surfaces get an identical material instance) — tint,
  // scale and wear all drift a little between the three, and the two
  // breakwater sides drift from EACH OTHER too so the room doesn't read as
  // one material stamped three times.
  const floorMat = useMemo(() => standardMat({
    kind: 'wetconcrete', tint: '#2f3c46', scale: 1.15, wear: 0.62,
    repeat: [5, 3], seed: 101, roughness: 0.85, bumpScale: 0.022,
  }), [])
  // wear stays under drawConcrete's own 0.45 "damp pool" threshold on every
  // vertical face here — standing-water pools read as sensible weathering
  // on the horizontal deck (wetconcrete, below) but as odd blotches on a
  // wall, since water doesn't pool on a vertical surface. Variance between
  // the three still comes through via tint/scale/form-line seams alone.
  // roughness pulled well down from dry-concrete's usual 0.85-0.95: it's
  // raining on all of this (brief's own "wet concrete everywhere"), and a
  // high-roughness surface barely shows a specular hotspot at all under a
  // single distant point key — the diffuse term alone is nearly uniform
  // across one big flat face, which is what was reading as a textureless
  // void in the QA pass. A tighter specular lobe (plus a touch of
  // metalness for the sheen) is what actually lets the grazing key paint a
  // visible highlight gradient across the wall/breakwater instead of a
  // flat tone — the SAME fix the deck's own wetconcrete kind already gets
  // for free from its baked-in shine pools.
  const wallMat = useMemo(() => standardMat({
    kind: 'concrete', tint: '#3c4a54', scale: 1.3, wear: 0.4,
    repeat: [7, 3], seed: 202, roughness: 0.58, metalness: 0.1, bumpScale: 0.022,
  }), [])
  const breakwaterMatL = useMemo(() => standardMat({
    kind: 'concrete', tint: '#333f48', scale: 1.0, wear: 0.38,
    repeat: [1.4, 4.5], seed: 303, roughness: 0.62, metalness: 0.12, bumpScale: 0.026,
  }), [])
  const breakwaterMatR = useMemo(() => standardMat({
    kind: 'concrete', tint: '#404e58', scale: 1.55, wear: 0.3,
    repeat: [1.4, 4.5], seed: 404, roughness: 0.54, metalness: 0.09, bumpScale: 0.02,
  }), [])
  // the coping cap running the top of the sea wall — a real breakwater
  // pours a distinct finishing course along its top edge, and it doubles as
  // a rim-catching silhouette break instead of one flat sharp top edge.
  const copingMat = useMemo(() => standardMat({
    kind: 'concrete', tint: '#4a5862', scale: 0.8, wear: 0.35,
    repeat: [7, 1], seed: 505, roughness: 0.7, bumpScale: 0.012,
  }), [])
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
      {/* the deck you stand on — also the "rain-wet railing/parapet" touch
          surface the brief calls for: this room built its wet edge as a
          walkable concrete deck rather than a separate rail prop, so the
          touch lives on the deck itself, at wherever the click lands. Reach
          is generous (whole-deck) rather than the usual ~2.4 — you can be
          anywhere on this small deck and still be "at the rail". */}
      <Touchable reach={7} foley="glass" anchor={[0, 0, 2]} onUse={(e) => onTouchDeck && onTouchDeck(e)}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]}>
          <planeGeometry args={[10, 6]} />
          <primitive object={floorMat} attach="material" />
        </mesh>
      </Touchable>
      {/* the wall itself: two segments flanking a center gap, not one solid
          14m box. QA sweep found the billboard (24x6 at y=7, z=-28) was
          fully hidden behind a solid wall from EVERY station — the wall's
          own top edge, 9.5m out, subtends a steeper angle from the camera
          than the billboard's top ever can at 31m out, however tall it
          gets, so nothing above the wall was ever going to peek over its
          silhouette. Camera (0,1.35,3) and the billboard both sit on x=0,
          so a breached center channel (a real sea wall's boat gap, and
          thematically the spot the waves come through) puts the line of
          sight straight through instead — no camera retune needed, and the
          two segments still register a full-height collider each. */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 4, 3, WALL_Z]}>
          <boxGeometry args={[6, 6, 1]} />
          <primitive object={wallMat} attach="material" />
        </mesh>
      ))}
      {/* coping cap on each wall segment's top edge — the raised finishing
          course a real sea wall pours along its run, breaking the flat top
          edge in silhouette and catching the cold key along its length. */}
      {[-1, 1].map((side) => (
        <Trim
          key={side}
          pos={[side * 4, 6.08, WALL_Z]} wallLength={6.3} along="x"
          height={0.18} depth={1.16} color="#4a5862"
        />
      ))}
      {[-1, 1].map((side) => {
        const mat = side < 0 ? breakwaterMatL : breakwaterMatR
        return (
          <group key={side}>
            <mesh position={[side * 5, 1.2, -3]}>
              <boxGeometry args={[1.4, 2.4, 6]} />
              <primitive object={mat} attach="material" />
            </mesh>
            {/* coping cap on each breakwater arm too, so the silhouette
                break isn't limited to the main wall alone */}
            <mesh position={[side * 5, 2.44, -3]}>
              <boxGeometry args={[1.55, 0.14, 6.2]} />
              <primitive object={copingMat} attach="material" />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/* --------------------------------------------------------------- ripples */

// Wave T: touching the wet deck expands a ripple ring at the touch point,
// fading over ~1.5s — a small pool of reusable ring meshes (never unbounded
// growth) driven entirely off refs in useFrame, same discipline as this
// room's own DetonatingWater/SplashBurst animators.
const RIPPLE_SLOTS = 4
const RIPPLE_LIFE = 1.5

function RippleField({ triggerRef }) {
  const meshRefs = useRef(Array.from({ length: RIPPLE_SLOTS }, () => React.createRef()))
  const slots = useRef(Array.from({ length: RIPPLE_SLOTS }, () => ({ active: false, start: 0, x: 0, z: 0 })))
  const cursor = useRef(0)

  useEffect(() => {
    triggerRef.current = (x, z) => {
      const i = cursor.current
      cursor.current = (cursor.current + 1) % RIPPLE_SLOTS
      slots.current[i] = { active: true, start: performance.now(), x, z }
    }
    return () => { triggerRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame(() => {
    const now = performance.now()
    slots.current.forEach((s, i) => {
      const m = meshRefs.current[i].current
      if (!m) return
      if (!s.active) { m.visible = false; return }
      const t = (now - s.start) / 1000
      if (t > RIPPLE_LIFE) { s.active = false; m.visible = false; return }
      m.visible = true
      m.position.set(s.x, 0.014, s.z)
      const grow = 0.15 + t * 1.7
      m.scale.set(grow, grow, grow)
      m.material.opacity = Math.max(0, 0.55 * (1 - t / RIPPLE_LIFE))
    })
  })

  return (
    <group>
      {meshRefs.current.map((r, i) => (
        <mesh key={i} ref={r} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.72, 0.86, 40]} />
          <meshBasicMaterial color="#bcd6e0" transparent opacity={0} depthWrite={false} toneMapped={false} />
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
    // fog={false}: at 31m through this room's fogExp2 (density 0.05) the
    // billboard was being fully swallowed by fog before it ever reached
    // camera — a light source this room treats as deliberately readable
    // "at a distance" (spec #5/brief) can't also be the one thing the fog
    // erases entirely. The sky backdrop plane already sets the same
    // precedent for a background element that ignores fog.
    <mesh position={[0, 7, -28]}>
      <planeGeometry args={[24, 6]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} fog={false} side={THREE.DoubleSide} />
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
      <Bevel pos={[0, 0.55, 0]} w={0.07} h={1.1} d={0.07} radius={0.014} segments={2} color="#161c20" roughness={0.75} metalness={0.15} />
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

export default function BR2049({ film, config, infoVisible = true, doors = [], goToStation, onDoor }) {
  const { grade } = config
  const [stationKey, setStationKey] = useState('entry')
  const rippleTriggerRef = useRef(null)
  const handleTouchDeck = (e) => {
    if (rippleTriggerRef.current && e?.point) rippleTriggerRef.current(e.point.x, e.point.z)
  }

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
      {/* Wave P1 finishing pass: the toolkit's LightRig doctrine replaces
          this room's original two raw pointLights + a flat 0.5 ambient.
          FilmWorld already renders its own ambientLight off grade.ambient
          (0.12, per br2049's config block) — the old local ambientLight
          here stacked ANOTHER 0.5 on top of that, which is what was making
          the wall/deck's own material read as a near-void even before this
          pass swapped the canvas textures out: a flat 0.5 ambient floods
          every surface evenly and drowns the grazing highlight that sells
          "wet concrete", it doesn't restore it. Corners/breakwater reach is
          handled instead by two extra cold bounce lights aimed at exactly
          those risk areas (spec #3's own grazing-light check), plus a rim
          light behind the monumental figure so its silhouette edge actually
          catches light through the rain haze, per the brief, instead of
          reading as a flat emissive blob. QA sweep: the original
          keyIntensity*30/*14 tuning was the starting point, but LightRig's
          SCALE constants were empirically tuned against darkknight — a
          tight 4.2x4.2 box, not a 14m-wide open sea wall with a wall 8+
          units from its own key. Matching darkknight's per-unit intensity
          left the wall/deck under-lit again at this room's actual scale
          (2nd QA pass), so the multipliers below sit well above a literal
          old-value match — tuned empirically against this room's own
          screenshots until the wall/deck/breakwater read as lit surfaces
          rather than silhouettes. */}
      <LightRig lights={{
        key: { pos: [3, 5, 1], color: grade.key || '#3a6a8a', intensity: (grade.keyIntensity ?? 1) * 3.2, distance: 46, decay: 1.45 },
        bounce: [
          { pos: [0, 3.4, -6], color: grade.key || '#3a6a8a', intensity: (grade.keyIntensity ?? 1) * 3.4, distance: 24, decay: 1.5 },
          { pos: [-4.6, 1.9, -2.6], color: '#3a6478', intensity: 1.5, distance: 10, decay: 1.6 },
          { pos: [4.6, 1.9, -2.6], color: '#3a6478', intensity: 1.5, distance: 10, decay: 1.6 },
        ],
        rim: { pos: [1.1, 4.6, -7.6], color: '#a8d8ec', intensity: 1.7, distance: 12, decay: 1.5 },
      }} />

      <SeaWallShell grade={grade} onTouchDeck={handleTouchDeck} />
      <RippleField triggerRef={rippleTriggerRef} />
      <DetonatingWater />
      <SplashBursts />
      <Billboard />
      <ReflectedScore film={film} />
      {infoVisible && <InfoPlinth film={film} />}

      {/* the monumental figure: holographic-scale, facing away (-Z),
          never toward you, standing just this side of the wall — the rim
          light in the LightRig block above is aimed at its far side so the
          silhouette edge actually catches light through the rain haze. */}
      {abstractFigure({ pos: [1.6, 0, -5.3], scale: 3.2, color: '#05070a', pose: 'stand', emissive: '#3a6a8a' })}

      {/* dense driving rain (brief) — pushed up from the P0 baseline now
          that fps headroom was confirmed in the harness (see room's own P1
          polish note). A faint shimmer on the wall face stands in for rain
          catching what little light there is without a second particle
          system. */}
      <RainField density={720} wind={0.24} area={[9, 6, 8]} color="#bcd6e0" />
      <Rainlight pos={[0, 3, WALL_Z + 0.51]} w={12} h={5} color="#9fc4d8" intensity={0.14} speed={0.5} />
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
