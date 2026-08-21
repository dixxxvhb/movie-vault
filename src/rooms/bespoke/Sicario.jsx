import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { makeMetaTexture } from '../infoTextures.js'
import { sheetOf, mix } from '../../palette.js'
import { setGradeOverride, clearGradeOverride } from '../gradeBus.js'
import { registerColliders, setBounds, registerFloor, clearOwner } from '../colliders.js'
import { useRoomAudio } from '../audio/engine.js'
import { start as startSicarioAudio } from '../audio/recipes/sicario.js'
import { notifyDepth } from './sicarioBus.js'
import {
  makeDuskSkyTexture, makeTunnelTexture, makeMissionBriefTexture, makeThermalNumeralTexture,
} from './sicarioTextures.js'
import DoorRow from '../DoorRow.jsx'
import Touchable from '../Touchable.jsx'
import { OpenKind } from '../touchKinds.jsx'

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
const WALL_T = 0.15

// Wave M3: free walk. GROUND_STATION documents the entry viewpoint — it's
// what configs.js's own sicario.camera matches exactly — but no code path
// here calls goToStation with it any more; the walker simply starts there
// and descends under its own power.
const GROUND_STATION = { pos: [0, 1.9, 3.2], look: [0, 0.85, -2.4], fov: 56 }

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// Continuous version of the old per-station floorY(i): SLOPE is constant
// per cell, so the ramp is linear in z the whole way down. Negative i (the
// staging ground, z > 0) stays flat.
function floorY(i) { return i < 0 ? 0 : -i * SLOPE }
// Grade zone depth: clamped to [0, CELLS-1], matching the old station index
// range gradeForIndex was written against (thermalStart = CELLS - 2, etc).
function depthIndexAt(z) { return clamp(-z / CELL_LEN, 0, CELLS - 1) }
// Floor depth: clamped to [0, CELLS] — one cell further than the grade zone
// — because TunnelCell/TunnelEndCap's own geometry keeps sloping through the
// full last cell (floorY(CELLS) is the end cap's height); capping this one
// at CELLS-1 the same way would flatten the last 1.6m of ramp and leave the
// walker's feet floating above the actual rendered floor near the bottom.
function rawDepthAt(z) { return clamp(-z / CELL_LEN, 0, CELLS) }
function tunnelFloorAt(z) { return floorY(rawDepthAt(z)) }

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

// Wave T: the split seam. The hot take already carries the Jul 25 amendment
// inline (data/hot_takes.json) as a trailing "[Amended ...]" bracket — page
// 1 keeps the original take, page 2 carries the amendment verbatim, both
// substrings of the SAME string, nothing paraphrased or dropped. A hot_take
// without that bracket (a different film's data shape, belt-and-suspenders)
// falls back to the nearest sentence boundary past the midpoint so the
// panel still gets two honest pages instead of a blank second one.
function splitBriefPages(hotTake) {
  const text = hotTake || ''
  const m = text.match(/\[Amended[^\]]*\]/)
  if (m) {
    return [text.slice(0, m.index).trim(), text.slice(m.index).trim()]
  }
  const mid = Math.floor(text.length / 2)
  const dot = text.indexOf('. ', mid)
  const seam = dot === -1 ? mid : dot + 1
  return [text.slice(0, seam).trim(), text.slice(seam).trim()]
}

function MissionBrief({ film }) {
  const palette = sheetOf(film.palette)
  const [page1Tex, setPage1Tex] = useState(null)
  const [page2Tex, setPage2Tex] = useState(null)
  const [metaTex, setMetaTex] = useState(null)
  const [token, setToken] = useState(0)

  const [page1Text, page2Text] = useMemo(() => splitBriefPages(film.hot_take), [film.hot_take])

  useEffect(() => {
    let live = true
    const t = makeMissionBriefTexture(film, palette, { text: page1Text, stampLabel: 'CLEARED' })
    if (live) setPage1Tex(t)
    return () => { live = false; t.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug, page1Text])

  useEffect(() => {
    let live = true
    const t = makeMissionBriefTexture(film, palette, { text: page2Text, stampLabel: 'AMENDMENT' })
    if (live) setPage2Tex(t)
    return () => { live = false; t.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug, page2Text])

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
  // The panel itself is Touchable: press flips it (two coincident FrontSide
  // pages rather than one DoubleSide plane, same "rigid 180 never mirrors
  // the text" trick as Memento's wall notes) to reveal the amendment page.
  return (
    <group position={[1.9, 0, 0.4]} rotation={[0, -0.5, 0]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.06, 1.1, 0.06]} />
        <meshStandardMaterial color="#2a2620" roughness={0.9} />
      </mesh>
      <Touchable onUse={() => setToken((t) => t + 1)} reach={2.2} foley="paper" anchor={[0, 1.25, 0]}>
        <OpenKind token={token} mode="hinge" hingeAxis="y" angle={Math.PI}>
          <mesh position={[0, 1.25, 0.021]}>
            <planeGeometry args={[1.05, 0.74]} />
            {page1Tex
              ? <meshBasicMaterial key="mapped" map={page1Tex} toneMapped={false} side={THREE.FrontSide} />
              : <meshBasicMaterial key="blank" color={palette.paper} toneMapped={false} />}
          </mesh>
          <mesh position={[0, 1.25, -0.021]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[1.05, 0.74]} />
            {page2Tex
              ? <meshBasicMaterial key="mapped" map={page2Tex} toneMapped={false} side={THREE.FrontSide} />
              : <meshBasicMaterial key="blank" color={palette.paper} toneMapped={false} />}
          </mesh>
        </OpenKind>
      </Touchable>
      <mesh position={[0, 0.78, 0.02]} rotation={[0, 0, 0]}>
        <planeGeometry args={[0.9, 0.2]} />
        {metaTex
          ? <meshBasicMaterial key="mapped" map={metaTex} transparent depthWrite={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" transparent opacity={0} />}
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------- bloodline doors */

// Bloodline doors (brief §6): "the staging ground's perimeter." Mounted off
// to the left side of the tunnel mouth at ground level, standing clear of the
// silhouette line and mission-brief panel, visible from the entry station.
const DOOR_MOUNT = {
  position: [-2.4, 0.8, 1.2],
  rotationY: 0,
  spacing: 1.0,
  scale: 0.85,
}

/* ------------------------------------------------------------------ room */

// Wave M3: free walk. `goToStation` is no longer called from in here — the
// entry viewpoint stays config.camera (GROUND_STATION above), and the whole
// descent is walked, not clicked — so it's deliberately not destructured;
// FilmWorld still passes it, unused.
export default function Sicario({ film, config, doors = [], onDoor }) {
  const { grade } = config
  const dwellRef = useRef(0)
  const decayRef = useRef(1)

  // `inTunnel`/`nearBottom` are React state, not refs, because they gate
  // JSX (fog color, the ground-only prop group) and so need to trigger a
  // re-render on the rare frame they actually flip — everything continuous
  // (grade lerp, dwell decay, the depth bus) stays imperative in useFrame
  // below and never touches state.
  const inTunnelRef = useRef(false)
  const [inTunnel, setInTunnel] = useState(false)
  const nearBottomRef = useRef(false)
  const [nearBottom, setNearBottom] = useState(false)

  const tunnelTex = useMemo(() => makeTunnelTexture('#1c1a14'), [])

  // grade: keyed to walker depth, published every frame on gradeBus the same
  // way Memento publishes its split — a zone per the film's own "dual
  // optics," now continuous with position instead of jumping per click.
  useFrame(({ camera }, dt) => {
    const z = camera.position.z
    const inTun = z < 0
    if (inTun !== inTunnelRef.current) {
      inTunnelRef.current = inTun
      setInTunnel(inTun)
    }

    const depthIdx = inTun ? depthIndexAt(z) : -1
    const g = gradeForIndex(depthIdx)
    if (g) setGradeOverride(g)
    else clearGradeOverride()

    const bottom = depthIdx >= CELLS - 2
    if (bottom !== nearBottomRef.current) {
      nearBottomRef.current = bottom
      setNearBottom(bottom)
    }

    notifyDepth(inTun ? clamp01(depthIdx / (CELLS - 1)) : 0)

    // dwell + the slow darkening. Resets the instant you're back at the
    // ground; otherwise a floor at 0.4x over roughly 80s.
    if (inTun) dwellRef.current += dt
    else dwellRef.current = 0
    const target = THREE.MathUtils.lerp(1, 0.4, clamp01(dwellRef.current / 80))
    decayRef.current = THREE.MathUtils.damp(decayRef.current, target, 2, dt)
  })
  useEffect(() => clearGradeOverride, [])

  // Wave M3: colliders. The staging ground's perimeter is the room's ONE
  // bounds rect (generous enough to cover the ground zone AND the tunnel's
  // full length — the tunnel's own side walls below give the descent its
  // narrower shape, same "bounds is the envelope, wall rects are the shape"
  // device Memento uses); tunnel side walls + far end block; the floor fn
  // matches TunnelCell's own linear ramp so feet stay planted on the slope.
  useEffect(() => {
    const ownerId = 'bespoke:sicario'
    const tunnelLen = CELLS * CELL_LEN
    registerColliders(ownerId, [
      { minX: -TUNNEL_W / 2 - WALL_T, maxX: -TUNNEL_W / 2, minZ: -tunnelLen, maxZ: 0 },
      { minX: TUNNEL_W / 2, maxX: TUNNEL_W / 2 + WALL_T, minZ: -tunnelLen, maxZ: 0 },
      { minX: -TUNNEL_W / 2, maxX: TUNNEL_W / 2, minZ: -tunnelLen - WALL_T, maxZ: -tunnelLen },
    ])
    setBounds(ownerId, {
      kind: 'rect',
      minX: -8,
      maxX: 8,
      minZ: -tunnelLen - 0.3,
      maxZ: 4.5,
    })
    registerFloor(ownerId, (x, z) => {
      if (z <= 0.1 && Math.abs(x) <= TUNNEL_W / 2 + 0.3) return tunnelFloorAt(z)
      return 0
    })
    return () => clearOwner(ownerId)
  }, [])

  useRoomAudio(startSicarioAudio)

  const tint = nearBottom ? '#ffdca0' : '#4fae6a'

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
      <DescentGlow decayRef={decayRef} tint={tint} />
      <ThermalScore film={film} />

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
