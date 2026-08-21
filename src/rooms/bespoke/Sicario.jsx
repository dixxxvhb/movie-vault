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
import { standardMat } from '../materials.js'
import { Bevel, wireRun as WireRun } from '../detail.jsx'
import LightRig, { LIGHT_SCALE } from '../lightRig.js'
import { HazeCone } from '../atmosphere.jsx'

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
// grain/vignette/bloomIntensity (Wave P1 triplet): night-vision green reads
// grainier and more vignetted (cheap optics, narrow FOV); thermal white-hot
// tightens the vignette but pushes bloom harder (the film's own thermal
// bloom-to-white look) — capped well short of clipping per the "confirm
// feet stay planted, never blow the last stretch to solid white" standard.
const GREEN = { sat: -0.3, contrast: 0.18, hue: 0.05, key: '#4fae6a', fill: '#16261a', bg: '#050a06', grain: 0.1, vignette: 0.84, bloomIntensity: 0.22 }
const THERMAL = { sat: -1, contrast: 0.36, hue: -0.02, key: '#ffdca0', fill: '#3a2412', bg: '#160c04', grain: 0.07, vignette: 0.7, bloomIntensity: 0.3 }

function lerpGrade(a, b, t) {
  return {
    sat: THREE.MathUtils.lerp(a.sat, b.sat, t),
    contrast: THREE.MathUtils.lerp(a.contrast, b.contrast, t),
    hue: THREE.MathUtils.lerp(a.hue, b.hue, t),
    key: mix(a.key, b.key, t),
    fill: mix(a.fill, b.fill, t),
    bg: mix(a.bg, b.bg, t),
    grain: THREE.MathUtils.lerp(a.grain, b.grain, t),
    vignette: THREE.MathUtils.lerp(a.vignette, b.vignette, t),
    bloomIntensity: THREE.MathUtils.lerp(a.bloomIntensity, b.bloomIntensity, t),
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
  // dusty staging-area ground: gravel near the mouth (kicked-up, well-
  // trodden), plain asphalt-dry dirt further out — materials.js rule again,
  // the two patches get their own params rather than sharing one instance.
  const nearMat = useMemo(() => standardMat({ kind: 'gravel', tint: '#39311f', scale: 1.3, wear: 0.55, repeat: [7, 2] }), [])
  const farMat = useMemo(() => standardMat({ kind: 'asphalt', tint: '#332c1c', scale: 1, wear: 0.4, repeat: [7, 5] }), [])
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
        <primitive object={nearMat} attach="material" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -10.4]}>
        <planeGeometry args={[16, 11.2]} />
        <primitive object={farMat} attach="material" />
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

// Staging-area props: a low crate/barrier line off to one side, well clear
// of the figures' own silhouette line and the tunnel mouth so the entry
// composition (brief's "silhouette-line-at-sunset frame") isn't crowded —
// these read as dark, low shapes against the dusk sky, not as detail.
function StagingCrates() {
  const crateMat = useMemo(() => standardMat({ kind: 'metal', tint: '#22201a', scale: 0.7, wear: 0.6, roughness: 0.85, metalness: 0.15 }), [])
  const crates = [
    { pos: [-6.4, 0.24, 0.6], size: [0.9, 0.48, 0.7], rot: 0.2 },
    { pos: [-5.6, 0.32, 1.4], size: [0.7, 0.64, 0.7], rot: -0.15 },
    { pos: [6.2, 0.26, 1.0], size: [1.0, 0.52, 0.6], rot: -0.3 },
  ]
  return (
    <group>
      {crates.map((c, i) => (
        <Bevel key={i} pos={c.pos} rot={[0, c.rot, 0]} w={c.size[0]} h={c.size[1]} d={c.size[2]} radius={0.02} mat={crateMat} />
      ))}
      {/* a low barrier bar, silhouette-only (basic material, no lighting
          fuss needed for something that should read as a flat dark shape) */}
      <mesh position={[6.0, 0.5, 1.1]}>
        <boxGeometry args={[1.6, 0.06, 0.06]} />
        <meshStandardMaterial color="#0c0a06" roughness={0.9} />
      </mesh>
      <mesh position={[5.3, 0.25, 1.1]}>
        <boxGeometry args={[0.06, 0.5, 0.06]} />
        <meshStandardMaterial color="#0c0a06" roughness={0.9} />
      </mesh>
      <mesh position={[6.7, 0.25, 1.1]}>
        <boxGeometry args={[0.06, 0.5, 0.06]} />
        <meshStandardMaterial color="#0c0a06" roughness={0.9} />
      </mesh>
    </group>
  )
}

// The tunnel mouth: a ring frame around a painted cut in the ground.
//
// ARCHITECT FIX (two rounds): round 1 deleted the opaque cap outright to
// "reveal the real tunnel" — that exposed the FULL 11m sloped shaft from
// directly above/outside the ground station, including cell 0/1's ceiling
// planes poking a couple metres above y=0 near the mouth (a known, already-
// documented quirk of this geometry, previously hidden by the old flat
// black disc) and the 9.9 numeral clear across the far end, killing the
// "waits at the bottom" reveal entirely. Round 2: the disc is back, but
// repainted — a canvas gradient (bright near the rim under the mouth
// work-lights, fading to black toward the far edge) rather than one flat
// #020202 fill, so the opening reads as "a lit ramp descending into dark"
// exactly like the brief asks, without literally exposing geometry that
// was never composed to be seen from this angle.
const mouthDiscTex = (() => {
  if (typeof document === 'undefined') return null
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  // gradient runs along local +Z->-Z (canvas Y): near-rim (mouth-ward,
  // canvas bottom) lit warm-white, far edge (deeper into the cut, canvas
  // top) black.
  const g = ctx.createLinearGradient(0, 0, 0, S)
  g.addColorStop(0, '#050403')
  g.addColorStop(0.55, '#0a0806')
  g.addColorStop(0.82, '#4a4438')
  g.addColorStop(1, '#8a8270')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
})()

function TunnelMouth() {
  return (
    <group position={[0, 0, -1.2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[1.15, 28]} />
        <meshBasicMaterial map={mouthDiscTex} color="#ffffff" fog={false} />
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

  // wet sheen near the bottom: the last two cells swap to wetconcrete (low
  // roughness pools baked right into the material, not a decal) — concrete
  // pores everywhere else, floor gets its own wear/tint from the walls per
  // the no-shared-instance rule.
  const wet = index >= CELLS - 2
  const kind = wet ? 'wetconcrete' : 'concrete'
  const depthWear = clamp(0.42 + index * 0.045, 0.42, 0.82)
  const floorMat = useMemo(() => standardMat({ kind, tint: '#211f1a', scale: 1.1, wear: depthWear, repeat: [1.3, 1.3], seed: 700 + index }), [kind, depthWear, index])
  const ceilMat = useMemo(() => standardMat({ kind: 'concrete', tint: '#1c1a16', scale: 1, wear: depthWear * 0.8, repeat: [1.3, 1.3], seed: 800 + index }), [depthWear, index])
  const wallMat = useMemo(() => standardMat({ kind: 'concrete', tint: '#221f1a', scale: 1.15, wear: depthWear * 0.9, repeat: [1.3, 1.3], seed: 900 + index }), [depthWear, index])
  const ribMat = useMemo(() => standardMat({ kind: 'metal', tint: '#17150f', scale: 0.5, wear: 0.5, roughness: 0.7, metalness: 0.3 }), [])

  return (
    <group>
      <group position={[0, midY, midZ]} rotation={[tilt, 0, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[TUNNEL_W, CELL_LEN * 1.02]} />
          <primitive object={floorMat} attach="material" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, TUNNEL_H, 0]}>
          <planeGeometry args={[TUNNEL_W, CELL_LEN * 1.02]} />
          <primitive object={ceilMat} attach="material" />
        </mesh>
        <mesh position={[-TUNNEL_W / 2, TUNNEL_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[CELL_LEN * 1.02, TUNNEL_H]} />
          <primitive object={wallMat} attach="material" />
        </mesh>
        <mesh position={[TUNNEL_W / 2, TUNNEL_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[CELL_LEN * 1.02, TUNNEL_H]} />
          <primitive object={wallMat} attach="material" />
        </mesh>
      </group>
      {/* a rib arch at this cell's near boundary — beveled beams (was naked
          boxGeometry) with a dark worn-metal surface, the "ribbed" read from
          the brief */}
      <group position={[0, y0, z0]}>
        <Bevel pos={[-TUNNEL_W / 2, TUNNEL_H / 2, 0]} w={0.1} h={TUNNEL_H} d={0.14} radius={0.015} mat={ribMat} />
        <Bevel pos={[TUNNEL_W / 2, TUNNEL_H / 2, 0]} w={0.1} h={TUNNEL_H} d={0.14} radius={0.015} mat={ribMat} />
        <Bevel pos={[0, TUNNEL_H, 0]} w={TUNNEL_W + 0.1} h={0.1} d={0.14} radius={0.015} mat={ribMat} />
      </group>
    </group>
  )
}

function TunnelEndCap() {
  // the literal bottom: wetconcrete, darkest sheen in the tunnel — the wet
  // grade note from the polish spec culminates here rather than fading out.
  const mat = useMemo(() => standardMat({ kind: 'wetconcrete', tint: '#181611', scale: 0.9, wear: 0.75, repeat: [1, 1] }), [])
  const y = floorY(CELLS) + TUNNEL_H / 2
  const z = -CELLS * CELL_LEN
  return (
    <mesh position={[0, y, z]}>
      <planeGeometry args={[TUNNEL_W, TUNNEL_H]} />
      <primitive object={mat} attach="material" />
    </mesh>
  )
}

// Cable run: a sagged tube along the tunnel's upper-left corner, riding the
// slope the same way TunnelCell's own floor/ceiling do (each point matches
// that cell's floorY so it visually tracks the ramp rather than floating
// through it).
function CableRun() {
  const points = useMemo(() => {
    const pts = []
    for (let i = 0; i <= CELLS; i++) {
      pts.push([-TUNNEL_W / 2 + 0.12, floorY(i) + TUNNEL_H - 0.18, -i * CELL_LEN])
    }
    return pts
  }, [])
  return <WireRun points={points} sag={0.06} radius={0.012} color="#0e0d0a" />
}

/* --------------------------------------------------------------- descent light */

// The tunnel has no fixtures of its own, so a dim pool of light travels with
// the camera — same device as Memento's CorridorGlow — scaled by the dwell
// decay factor (the room darkening the longer you stay).
//
// ARCHITECT FIX: this rendered unconditionally at ALL times, including at
// the ground station — a raw intensity-55 point light colocated with the
// camera, sitting right next to the tunnel mouth's metal ring, was the
// stray white specular blob in the arrival frame (same bug class, same
// fix, as Memento's CorridorGlow: retuned to LIGHT_SCALE units and now
// fades to 0 via `inTunnelRef` instead of running full-strength at the
// entry composition where it has nothing useful to light).
function DescentGlow({ decayRef, tint, inTunnelRef }) {
  const ref = useRef()
  useFrame(({ camera }) => {
    if (!ref.current) return
    ref.current.position.copy(camera.position)
    // 55 matches the original tunnel-descent brightness (this was never too
    // bright WHILE actually inside the shaft — only running unconditionally
    // at the ground station, colocated with the camera, was the bug).
    const active = inTunnelRef?.current ? 1 : 0
    ref.current.intensity = 55 * decayRef.current * active
  })
  return <pointLight ref={ref} color={tint} intensity={0} distance={6.5} decay={2} />
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

  // ARCHITECT FIX: was propped on a single thin 1.1m post under a board
  // centered at y=1.25 — a 0.22m gap between the visible top of the post
  // and the board's own frame read as "floating," and the -0.5 rad yaw
  // (~29deg) off the entry camera's own forward axis made it look tilted
  // rather than deliberately angled. Now bolted: a flat base plate stakes
  // it to the ground, the post itself runs the full height to the board's
  // underside, and a back-brace triangulates it to the post the way a real
  // job-site sign stand is actually held up. Yaw pulled in to a slight,
  // clearly-intentional turn instead of a near-diagonal one.
  return (
    <group position={[1.9, 0, 0.4]} rotation={[0, -0.22, 0]}>
      <mesh position={[0, 0.015, 0]}>
        <boxGeometry args={[0.3, 0.03, 0.24]} />
        <meshStandardMaterial color="#1c1a15" roughness={0.85} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.46, 0]}>
        <boxGeometry args={[0.065, 0.92, 0.065]} />
        <meshStandardMaterial color="#2a2620" roughness={0.9} />
      </mesh>
      {/* back-brace, angled from the base up to the post near the board */}
      <mesh position={[0, 0.45, -0.09]} rotation={[0.62, 0, 0]}>
        <boxGeometry args={[0.045, 0.62, 0.045]} />
        <meshStandardMaterial color="#241f1a" roughness={0.9} />
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

// Bloodline doors (brief §6): "the staging ground's perimeter."
//
// ARCHITECT FIX: at [-2.4, 0.8, 1.2] the row sat only ~2m from the entry
// camera (pos [0,1.9,3.2]) and off-axis just enough to straddle the FOV
// edge — close enough that even a single 0.9m-wide door leaf swallowed
// nearly half the arrival frame. The brief's own arrival composition (the
// silhouette-line-at-sunset frame) has to win that shot; the doors move
// behind the camera's entry z (4.6 > the camera's 3.2) so they're
// completely out of frame on arrival and found by walking/turning instead,
// same as any other perimeter detail.
const DOOR_MOUNT = {
  position: [3.2, 0.8, 4.6],
  rotationY: 2.6,
  spacing: 0.95,
  scale: 0.78,
}

// ARCHITECT FIX: Door.jsx styles frame/panel from whatever `grade` object it
// gets handed (grade.key/fill/acc) — the LIVE room grade published through
// gradeBus (Sicario's own GREEN/THERMAL tunnel-optics override) was leaking
// into these doors' material language even though they stand on the dusk
// ground, nowhere near the tunnel, which is how a staging-ground door ended
// up saturated night-vision green. A dedicated, static color block instead —
// dusty steel + worn tarp canvas, this room's own material language up top —
// so the doors read as part of the site, not a shader glitch.
const SICARIO_DOOR_GRADE = { key: '#5a5346', fill: '#3a362c', acc: '#847a63' }

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

  // Harsh work-light practicals bolted at the tunnel mouth — the spec's
  // "harsh work-light practicals at the tunnel mouth" layered on top of the
  // dusk key. Cool white-ish, tight falloff (this is a job-site lamp, not a
  // room fixture), one on each side of the ring frame.
  const mouthLights = useMemo(() => ({
    practicals: [
      { pos: [0.9, 0.55, -1.15], color: '#dce8f0', intensity: 1.3, distance: 3.4, decay: 2.4 },
      { pos: [-0.85, 0.5, -1.3], color: '#cfe0ea', intensity: 0.95, distance: 3, decay: 2.4 },
    ],
  }), [])

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
          <StagingCrates />
          <TunnelMouth />
          <MissionBrief film={film} />
          <LightRig lights={mouthLights} />
          <HazeCone pos={[0, 0.75, -1.2]} rot={[Math.PI, 0, 0]} length={0.9} radius={1.05} color="#dce8f0" opacity={0.1} />
        </>
      )}

      {/* ARCHITECT FIX: cells 0-1's ceiling/walls poke a couple metres above
          y=0 near the mouth (documented quirk, DuskGround's own comment
          above) — invisible in the dark original, but the new mouth
          work-lights lit it up into a gray box/pyramid silhouetted against
          the sky. The painted mouth disc already sells "a lit ramp
          descending" from outside; the real geometry only needs to exist
          once you're actually inside it (inTunnel), so it's skipped here
          for the two cells close enough to break the skyline. */}
      {Array.from({ length: CELLS }, (_, i) => (
        (inTunnel || i >= 2) && <TunnelCell key={i} index={i} tex={tunnelTex} />
      ))}
      <CableRun />
      <TunnelEndCap />
      <DescentGlow decayRef={decayRef} tint={tint} inTunnelRef={inTunnelRef} />
      <ThermalScore film={film} />

      <DoorRow
        doors={doors}
        position={DOOR_MOUNT.position}
        rotationY={DOOR_MOUNT.rotationY}
        spacing={DOOR_MOUNT.spacing}
        scale={DOOR_MOUNT.scale}
        grade={SICARIO_DOOR_GRADE}
        onDoor={onDoor}
      />
    </group>
  )
}
