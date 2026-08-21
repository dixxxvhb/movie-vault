import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { gaze } from '../../CameraRig.jsx'
import { makeMetaTexture } from '../infoTextures.js'
import { sheetOf, mix } from '../../palette.js'
import { setGradeOverride, clearGradeOverride } from '../gradeBus.js'
import { useRoomAudio } from '../audio/engine.js'
import { start as startSicarioAudio } from '../audio/recipes/sicario.js'
import { notifyDepth } from './sicarioBus.js'
import {
  makeDuskSkyTexture, makeTunnelTexture, makeMissionBriefTexture, makeThermalNumeralTexture,
} from './sicarioTextures.js'

// 9.9 — "the tunnel descent." Two zones, one click-to-advance path between
// them: the dusk staging ground (the silhouette-line-at-sunset entry
// composition, long shadows, the tunnel mouth) and, below it, a dark ribbed
// corridor whose own grade — published through gradeBus, same seam Memento
// uses for its split — is keyed to depth: night-vision green through most of
// the descent, thermal white-hot for the last stretch, "exactly like the
// film's dual optics." The room darkens the longer you stay down there
// (ambient + floor brightness slowly decaying, reset the moment you're back
// at the ground), and the 9.9 waits in thermal white at the very bottom.
const CELL_LEN = 1.6
const CELLS = 7             // 7 * 1.6 ≈ 11.2m forward, 7 * 1.05 ≈ 7.3m down —
                             // a steep ramp so the tunnel actually goes
                             // UNDER the staging ground rather than digging
                             // forward along the surface for 11m
const SLOPE = 1.05          // metres of drop per cell
const TUNNEL_W = 2.4
const TUNNEL_H = 2.3
const EYE_H = 1.5

const GROUND_STATION = { pos: [0, 1.9, 3.2], look: [0, 0.85, -2.4], fov: 56 }

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function floorY(i) { return i < 0 ? 0 : -i * SLOPE }
function stationFor(i) {
  const z = -(i + 0.4) * CELL_LEN
  // the eye stands 0.4 cells INTO cell i (matching the z above), so its
  // local floor has already dropped further than floorY(i) alone accounts
  // for — floorY is linear, so floorY(i + 0.4) is that interpolated local
  // floor directly. Using floorY(i) here (QA bug) put the eye up to ~0.4m
  // higher than the actual local floor, and by the last station that was
  // enough to put the camera ABOVE the end cap's own ceiling line — the
  // reason the bottom of the descent rendered as a black void with nothing
  // in it, 9.9 included.
  const y = floorY(i + 0.4) + EYE_H
  return { pos: [0, y, z], look: [0, y - 0.3, z - 5], fov: 46 }
}

// ------------------------------------------------------------ grade zones
const GREEN = { sat: -0.3, contrast: 0.18, hue: 0.05, key: '#4fae6a', fill: '#16261a', bg: '#050a06' }
const THERMAL = { sat: -1, contrast: 0.36, hue: -0.02, key: '#ffdca0', fill: '#3a2412', bg: '#160c04' }

function lerpGrade(a, b, t) {
  return {
    sat: THREE.MathUtils.lerp(a.sat, b.sat, t),
    contrast: THREE.MathUtils.lerp(a.contrast, b.contrast, t),
    hue: THREE.MathUtils.lerp(a.hue, b.hue, t),
    key: mix(a.key, b.key, t),
    fill: mix(a.fill, b.fill, t),
    bg: mix(a.bg, b.bg, t),
  }
}

// index -1 (the ground) returns null — "no override," let the room's base
// config.grade (the dusk look) show through unmodified.
function gradeForIndex(index) {
  if (index < 0) return null
  const thermalStart = CELLS - 2   // last two stations are the thermal switch
  if (index < thermalStart) return GREEN
  const t = clamp01((index - thermalStart) / (CELLS - 1 - thermalStart))
  return lerpGrade(GREEN, THERMAL, t)
}

/* ------------------------------------------------------------ ground zone */

function DuskGround({ grade }) {
  const skyTex = useMemo(
    () => makeDuskSkyTexture(grade.fill || '#2a3a55', grade.key || '#e8935a', '#1a1410'),
    [grade.fill, grade.key]
  )
  return (
    <group>
      {/* two ground patches, not one continuous plane — there's a gap
          between them right over the tunnel's own footprint (roughly z:
          -0.3 to -4.8) so the descent's upper cells, which still poke a
          little above y=0 near the mouth, aren't sliced by a flat plane
          that has no business being there. The near patch doubles as the
          hole's rim; the far one grounds the silhouette line. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 1.85]}>
        <planeGeometry args={[16, 4.3]} />
        <meshStandardMaterial color="#3a3226" roughness={0.96} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -10.4]}>
        <planeGeometry args={[16, 11.2]} />
        <meshStandardMaterial color="#3a3226" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0, -22]}>
        <sphereGeometry args={[60, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
        <meshBasicMaterial map={skyTex} side={THREE.BackSide} fog={false} />
      </mesh>
      {/* the low sun, near-set */}
      <mesh position={[4, 1.6, -32]}>
        <circleGeometry args={[2.8, 24]} />
        <meshBasicMaterial color="#ffb060" transparent opacity={0.9} fog={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

// Five abstracted figures, dark against the horizon, in a line — the entry
// composition itself, per the brief. Each throws a long shadow back toward
// the camera, the way anything does at true dusk.
// Spread wide enough that the outer four clear the tunnel-mouth rib arch's
// own silhouette (a near, 2.4m-wide frame at z:0 subtends almost the same
// angle from the camera as a narrower spread would at the figures' own,
// farther z — QA pass: at +-3.2 the arch nearly exactly eclipsed them).
const FIGURE_LINE = [-4.4, -2.2, 0, 2.2, 4.4]

// Pulled to z: -5 (was -7.5) and scaled up — at the original distance/size
// the five capsules read as a couple of pixels against the horizon and
// vanished into the ground-plane/sky-dome seam entirely. This is the room's
// own entry composition per the brief, so it has to actually read as a line
// of figures, not a rumor of one.
function SilhouetteLine() {
  return (
    <group position={[0, 0, -5]}>
      {FIGURE_LINE.map((x, i) => (
        <group key={i} position={[x, 0, (i % 2) * 0.5]}>
          <mesh position={[0, 1.15, 0]}>
            <capsuleGeometry args={[0.22, 1.5, 4, 8]} />
            <meshStandardMaterial color="#050403" roughness={0.98} />
          </mesh>
          <mesh position={[0, 2.05, 0]}>
            <sphereGeometry args={[0.16, 10, 10]} />
            <meshStandardMaterial color="#050403" roughness={0.98} />
          </mesh>
          {/* the long shadow, stretched toward the camera (+Z) */}
          <mesh position={[0, 0.003, 2.1]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.7, 4.4]} />
            <meshBasicMaterial color="#0c0906" transparent opacity={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// The tunnel mouth: a dark opening ringed by a low frame, sitting in the
// ground between the camera's entry position and the silhouette line.
function TunnelMouth() {
  return (
    <group position={[0, 0, -1.2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[1.15, 28]} />
        <meshBasicMaterial color="#020202" />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.2, 0.09, 8, 28]} />
        <meshStandardMaterial color="#3a342a" roughness={0.85} />
      </mesh>
    </group>
  )
}

/* ---------------------------------------------------------------- tunnel */

// One tunnel cell: floor/ceiling/side planes plus a ring of ribs at its far
// boundary — configs.js's own Wave B stand-in used the word "ribs" for this
// shell shape, kept here as real geometry rather than a shell param.
function TunnelCell({ index, tex }) {
  const y0 = floorY(index)
  const y1 = floorY(index + 1)
  const z0 = -index * CELL_LEN
  const z1 = -(index + 1) * CELL_LEN
  const midY = (y0 + y1) / 2
  const midZ = (z0 + z1) / 2
  const tilt = Math.atan2(y1 - y0, -(z1 - z0))

  return (
    <group>
      <group position={[0, midY, midZ]} rotation={[tilt, 0, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[TUNNEL_W, CELL_LEN * 1.02]} />
          <meshStandardMaterial map={tex} roughness={0.95} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, TUNNEL_H, 0]}>
          <planeGeometry args={[TUNNEL_W, CELL_LEN * 1.02]} />
          <meshStandardMaterial map={tex} roughness={0.96} />
        </mesh>
        <mesh position={[-TUNNEL_W / 2, TUNNEL_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[CELL_LEN * 1.02, TUNNEL_H]} />
          <meshStandardMaterial map={tex} roughness={0.92} />
        </mesh>
        <mesh position={[TUNNEL_W / 2, TUNNEL_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[CELL_LEN * 1.02, TUNNEL_H]} />
          <meshStandardMaterial map={tex} roughness={0.92} />
        </mesh>
      </group>
      {/* a rib arch at this cell's near boundary — four short beams framing
          the tunnel's cross-section, the "ribbed" read from the brief */}
      <group position={[0, y0, z0]}>
        <mesh position={[-TUNNEL_W / 2, TUNNEL_H / 2, 0]}>
          <boxGeometry args={[0.1, TUNNEL_H, 0.14]} />
          <meshStandardMaterial color="#1c1a16" roughness={0.9} />
        </mesh>
        <mesh position={[TUNNEL_W / 2, TUNNEL_H / 2, 0]}>
          <boxGeometry args={[0.1, TUNNEL_H, 0.14]} />
          <meshStandardMaterial color="#1c1a16" roughness={0.9} />
        </mesh>
        <mesh position={[0, TUNNEL_H, 0]}>
          <boxGeometry args={[TUNNEL_W + 0.1, 0.1, 0.14]} />
          <meshStandardMaterial color="#1c1a16" roughness={0.9} />
        </mesh>
      </group>
    </group>
  )
}

function TunnelEndCap() {
  const tex = useMemo(() => makeTunnelTexture('#100e0a'), [])
  const y = floorY(CELLS) + TUNNEL_H / 2
  const z = -CELLS * CELL_LEN
  return (
    <mesh position={[0, y, z]}>
      <planeGeometry args={[TUNNEL_W, TUNNEL_H]} />
      <meshStandardMaterial map={tex} roughness={0.96} />
    </mesh>
  )
}

// Click-catchers at every cell boundary, ground/tunnel threshold included —
// same "vertical pane across the corridor's cross-section" trick as
// Memento's own CorridorClickPlanes, because a near-level view vector down
// a tunnel almost never crosses a floor- or ceiling-height plane in time.
function TunnelClickPlanes({ onAdvance }) {
  return (
    <>
      {Array.from({ length: CELLS + 1 }, (_, i) => {
        const z = -i * CELL_LEN
        const y = floorY(i) + TUNNEL_H / 2
        return (
          <mesh
            key={i}
            position={[0, y, z]}
            onClick={(e) => { e.stopPropagation(); onAdvance() }}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
            onPointerOut={() => { document.body.style.cursor = 'auto' }}
          >
            <planeGeometry args={[TUNNEL_W, TUNNEL_H]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
    </>
  )
}

/* --------------------------------------------------------------- descent light */

// The tunnel has no fixtures of its own, so a dim pool of light travels with
// the camera — same device as Memento's CorridorGlow — scaled by the dwell
// decay factor (the room darkening the longer you stay).
function DescentGlow({ decayRef, tint }) {
  const ref = useRef()
  useFrame(({ camera }) => {
    if (!ref.current) return
    ref.current.position.copy(camera.position)
    ref.current.intensity = 55 * decayRef.current
  })
  return <pointLight ref={ref} color={tint} intensity={55} distance={7} decay={1.8} />
}

/* -------------------------------------------------------------------- 9.9 */

function ThermalScore({ film }) {
  const [tex, setTex] = useState(null)
  useEffect(() => {
    let live = true
    const t = makeThermalNumeralTexture(film.score)
    if (live) setTex(t)
    return () => { live = false; t.dispose() }
  }, [film.score])
  // parked just in front of the end cap, at roughly the LAST station's own
  // eye height (not the cross-section's geometric centre) — QA fix: the
  // final station's look vector is nearly flat (it's a ramp, not a look-
  // down), so a numeral centred on the tunnel's actual floor/ceiling
  // midpoint sat well below where the camera was actually pointed and never
  // entered frame. Matching eye height instead means it reads as "waiting
  // for you" the instant you arrive, which is the whole point of it.
  const y = floorY(CELLS - 1 + 0.4) + EYE_H - 0.15
  const z = -CELLS * CELL_LEN + 0.15
  return (
    <mesh position={[0, y, z]}>
      {/* smaller than the first pass, and a tighter glow falloff in the
          texture itself (sicarioTextures.js) — at the ~0.8m the last
          station actually stands from the end cap, a 1.1m plane with a
          wide glow blew out to solid white, and the read digits were lost
          in it long before you got anywhere close */}
      <planeGeometry args={[0.65, 0.65]} />
      {tex
        ? <meshBasicMaterial key="mapped" map={tex} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        : <meshBasicMaterial key="blank" transparent opacity={0} />}
    </mesh>
  )
}

/* ---------------------------------------------------------- entry record */

function MissionBrief({ film }) {
  const palette = sheetOf(film.palette)
  const [briefTex, setBriefTex] = useState(null)
  const [metaTex, setMetaTex] = useState(null)

  useEffect(() => {
    let live = true
    const t = makeMissionBriefTexture(film, palette)
    if (live) setBriefTex(t)
    return () => { live = false; t.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug])

  useEffect(() => {
    let live = true
    const t = makeMetaTexture(film, palette)
    if (live) setMetaTex(t)
    return () => { live = false; t.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug])

  // Propped upright on its own post, well clear of the ground plane and
  // angled slightly toward the entry camera — never flush against another
  // surface, per the standing depth-clip lesson (BabyDriver's own QA note).
  return (
    <group position={[1.9, 0, 0.4]} rotation={[0, -0.5, 0]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.06, 1.1, 0.06]} />
        <meshStandardMaterial color="#2a2620" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.25, 0.02]}>
        <planeGeometry args={[1.05, 0.74]} />
        {briefTex
          ? <meshBasicMaterial key="mapped" map={briefTex} toneMapped={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" color={palette.paper} toneMapped={false} />}
      </mesh>
      <mesh position={[0, 0.78, 0.02]} rotation={[0, 0, 0]}>
        <planeGeometry args={[0.9, 0.2]} />
        {metaTex
          ? <meshBasicMaterial key="mapped" map={metaTex} transparent depthWrite={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" transparent opacity={0} />}
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ room */

export default function Sicario({ film, config, goToStation }) {
  const { grade } = config
  const [stationIndex, setStationIndex] = useState(-1)
  const stationRef = useRef(-1)
  stationRef.current = stationIndex
  const dwellRef = useRef(0)
  const decayRef = useRef(1)

  const tunnelTex = useMemo(() => makeTunnelTexture('#1c1a14'), [])

  const stepTo = (next) => {
    setStationIndex(next)
    goToStation?.(next < 0 ? GROUND_STATION : stationFor(next), next < 0 ? 'ground' : 'descent-' + next)
    notifyDepth(next < 0 ? 0 : clamp01(next / (CELLS - 1)))
  }
  const moveOneStep = () => {
    const facingDown = Math.cos(gaze.yaw) > 0
    const dir = facingDown ? 1 : -1
    const next = clamp(stationRef.current + dir, -1, CELLS - 1)
    if (next !== stationRef.current) stepTo(next)
  }

  // grade: keyed to depth, published on gradeBus the same way Memento
  // publishes its split — a discrete zone per the film's own "dual optics,"
  // not a continuous per-frame lerp against gaze.
  useEffect(() => {
    const g = gradeForIndex(stationIndex)
    if (g) setGradeOverride(g)
    else clearGradeOverride()
  }, [stationIndex])
  useEffect(() => clearGradeOverride, [])

  // dwell + the slow darkening. Resets the instant you're back at the
  // ground (index -1); otherwise a floor at 0.4x over roughly 80s.
  useFrame((_, dt) => {
    if (stationRef.current >= 0) dwellRef.current += dt
    else dwellRef.current = 0
    const target = THREE.MathUtils.lerp(1, 0.4, clamp01(dwellRef.current / 80))
    decayRef.current = THREE.MathUtils.damp(decayRef.current, target, 2, dt)
  })

  useRoomAudio(startSicarioAudio)

  const inTunnel = stationIndex >= 0
  const tint = stationIndex >= CELLS - 2 ? '#ffdca0' : '#4fae6a'

  return (
    <group>
      {inTunnel ? (
        <fogExp2 attach="fog" args={[tint, 0.05]} />
      ) : (
        <fogExp2 attach="fog" args={[grade.fogColor || '#2a3a55', 0.018]} />
      )}
      {/* the dusk sun — the room's static config.grade key, so it only
          really matters at the ground; scaled way down underground rather
          than removed outright, since a stray beam finding its way down the
          shaft is more honest than a hard cut to zero */}
      <pointLight position={[3, 4, 2]} intensity={(grade.keyIntensity ?? 1) * (inTunnel ? 1.5 : 18)} color={grade.key || '#e8935a'} distance={30} decay={1.8} />
      <ambientLight intensity={0.06} />

      {!inTunnel && (
        <>
          <DuskGround grade={grade} />
          <SilhouetteLine />
          <TunnelMouth />
          <MissionBrief film={film} />
        </>
      )}

      {Array.from({ length: CELLS }, (_, i) => (
        <TunnelCell key={i} index={i} tex={tunnelTex} />
      ))}
      <TunnelEndCap />
      <TunnelClickPlanes onAdvance={moveOneStep} />
      <DescentGlow decayRef={decayRef} tint={tint} />
      <ThermalScore film={film} />
    </group>
  )
}
