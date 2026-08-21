import React, { useEffect, useMemo, useRef, useState } from 'react'
import { chairRow as ChairRow } from '../props.jsx'
import { setGradeOverride, clearGradeOverride } from '../gradeBus.js'
import { useRoomAudio } from '../audio/engine.js'
import { start as startStbyAudio } from '../audio/recipes/stby.js'
import { notifySwerve } from './stbyBus.js'
import {
  makeOfficeScoreTexture, makeMonitorUITexture, makeScreamTexture, makeFleshTexture,
} from './stbyTextures.js'
import DoorRow from '../DoorRow.jsx'
import { registerColliders, setBounds, clearOwner, resolveStep } from '../colliders.js'
import Touchable from '../Touchable.jsx'
import { playOneShot } from '../audio/engine.js'
import { standardMat } from '../materials.js'
import { Bevel, Trim, crumpledPaper as CrumpledPaper, cup as Cup, wireRun as WireRun, boxPile as BoxPile } from '../detail.jsx'
import { DustField } from '../atmosphere.jsx'

// 9.4 — "the call floor, then the swerve." One fixed station, like The
// Departed's roof: the RegalView cubicle grid, fluorescent and mundane, cut
// on a recurring ~60s timer — HARD, zero easing, no cross-fade — into the
// penthouse's gold-lit excess for about 8s, then hard-cut straight back. The
// rating lives in the office; the hot take ("YOURE FUCKING KIDDING",
// verbatim, the opening of his own take) lives in the penthouse, huge and
// jagged like the scream it actually was.
//
// `?peekSwerve` on the URL shortens both timers so a screenshot pass doesn't
// have to sit through a real 60s wait — same doctrine as Departed's own
// `?peekElevator` flag: it changes nothing unless a URL explicitly asks for
// it, and the shipped default is the real ~60s/~8s spec.
const PEEK = typeof window !== 'undefined' &&
  (window.location.search.includes('peekSwerve') || window.location.hash.includes('peekSwerve'))

const OFFICE_MS = PEEK ? 1500 : 58000 + Math.random() * 6000
const PENTHOUSE_MS = PEEK ? 3200 : 8000

/* ------------------------------------------------------------- the office */

const CUBICLES = [
  [-1.3, -1.2], [0, -1.2], [1.3, -1.2],
  [-1.3, 0.2], [0, 0.2], [1.3, 0.2],
]

/* ------------------------------------------------------------- colliders */
// Wave M3: HARD LAW — "during the hard-cut party swap the SAME colliders
// stay (geometry swap is visual only)". Registered ONCE, independent of
// inPenthouse, so nothing re-registers on the swerve. The cubicle grid
// (walls + desks) IS the aisle layout the office is staged around, so it
// stays the base structure through both states; the penthouse's own
// free-standing obstacles (columns, the long table, the two flesh masses)
// are added on top rather than swapped in, since walking through those
// would clip badly the moment the swerve is up even though this is the
// same effect that registers the office grid.
function rectXZ(cx, cz, hx, hz, top) {
  return top === undefined ? { minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz }
    : { minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz, top }
}

// Mirrors Cubicle's own three partitions + desk exactly (local frame ->
// world by cx/cz offset; Cubicle never rotates).
function cubicleRects(cx, cz) {
  return [
    rectXZ(cx - 0.55, cz, 0.02, 0.5, 1.1),   // left partition
    rectXZ(cx + 0.55, cz, 0.02, 0.5, 1.1),   // right partition
    rectXZ(cx, cz - 0.48, 0.57, 0.02, 1.1),  // back partition
    rectXZ(cx, cz + 0.15, 0.45, 0.25, 0.72), // desk (Table w=0.9 d=0.5)
  ]
}

// OfficeScoreScreen's pole: group at [-2.2,0,-1.6] rot.y 0.35, local box
// [0.06,1.8,0.5] (half extents 0.03 x 0.25 before rotation).
function rotatedHalfExtentsRad(hx, hz, rotY) {
  const c = Math.abs(Math.cos(rotY)), s = Math.abs(Math.sin(rotY))
  return { hx: hx * c + hz * s, hz: hx * s + hz * c }
}
const SCORE_EXT = rotatedHalfExtentsRad(0.03, 0.25, 0.35)
const SCORE_RECT = rectXZ(-2.2, -1.6, SCORE_EXT.hx, SCORE_EXT.hz, 1.8)

// Office shell — 7x6 box, walls at ±3.5 X / ±3 Z. (OfficeShell's own
// ±Z planes sit at 2.9, the ceiling/floor span the full 6; walls treated
// as thin like every other box shell in this app.)
const OFFICE_SHELL_RECTS = [
  { minX: -3.5, maxX: 3.5, minZ: -3 - 0.1, maxZ: -3 },
  { minX: -3.5, maxX: 3.5, minZ: 3, maxZ: 3 + 0.1 },
  { minX: -3.5 - 0.1, maxX: -3.5, minZ: -3, maxZ: 3 },
  { minX: 3.5, maxX: 3.5 + 0.1, minZ: -3, maxZ: 3 },
]

// QA pass: GoldColumns/LongTable/FleshMass (the penthouse's own free-
// standing pieces) were first tried as always-on colliders too, on the
// theory that "same colliders" meant union-of-both-states. Reading the hard
// law again — "unless the party props obviously intersect the aisles —
// check visually and keep the walkable space consistent" — that's backwards:
// LongTable's footprint (z -2.4..1.2) sits directly across the office's own
// central aisle, and blocking it there converged a straight W walk from the
// entry station after just 0.5m (verified via window.__vaultWalk), cutting
// most of the cubicle grid off from the spawn point entirely. That is
// exactly the "obviously intersects" case, and the fix the law asks for is
// to keep the walkable space consistent with the office layout — i.e. the
// penthouse-only pieces stay OUT of the collision world. They render fully
// (nothing here touches visuals), you just don't bump into them; the office
// cubicle grid is the one persistent walkable structure through both states.

// A spot light with a REAL aimed target, same fix as lightRig.js's own
// SpotWithTarget: SpotLight.target only updates its world matrix while it's
// part of the scene graph, so a bare `target-position` dash-prop silently
// freezes at the origin. Local copy rather than importing lightRig's
// internal (unexported) helper, since this bespoke room hand-assembles its
// own lights instead of going through LightRig's config path.
function AimedSpot({ pos, target, ...rest }) {
  const lightRef = useRef()
  const targetRef = useRef()
  useEffect(() => {
    if (lightRef.current && targetRef.current) lightRef.current.target = targetRef.current
  }, [])
  return (
    <>
      <spotLight ref={lightRef} position={pos} {...rest} />
      <object3D ref={targetRef} position={target} />
    </>
  )
}

const ROOM_ID = 'bespoke:stby'

function StbyColliders({ spawn }) {
  useEffect(() => {
    const cubicles = CUBICLES.flatMap(([x, z]) => cubicleRects(x, z))
    registerColliders(ROOM_ID, [...OFFICE_SHELL_RECTS, ...cubicles, SCORE_RECT])
    setBounds(ROOM_ID, { kind: 'rect', minX: -3.4, maxX: 3.4, minZ: -2.9, maxZ: 2.9 })
    if (import.meta.env.DEV && spawn) {
      const [sx, , sz] = spawn
      const probes = [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]
      const stuck = probes.every(([dx, dz]) => {
        const r = resolveStep(sx, sz, dx, dz, 0.28)
        return Math.hypot(r.x - sx, r.z - sz) < 0.02
      })
      if (stuck) {
        // eslint-disable-next-line no-console
        console.warn('[colliders] spawn point for "%s" looks boxed in by its own colliders', ROOM_ID)
      }
    }
    return () => clearOwner(ROOM_ID)
    // Deliberately NOT keyed on inPenthouse — one static registration for
    // the room's whole lifetime, per the hard law above.
  }, [spawn])
  return null
}

// The desk: a Bevel'd laminate top on a dark support frame, replacing the
// shared props.jsx Table (flat-colored, no material hook) so it can carry a
// standardMat laminate surface per P1 checklist item 2. `tint` is nudged per
// cubicle so no two desks in the grid share one literal material instance.
function Desk({ tint, seed }) {
  const topMat = standardMat({ kind: 'wood', tint, scale: 2.2, wear: 0.2, seed, roughness: 0.32, bumpScale: 0.006 })
  return (
    <group>
      <Bevel pos={[0, 0.7, 0.15]} w={0.9} h={0.05} d={0.5} radius={0.015} segments={2} mat={topMat} />
      {[[-0.39, -0.04], [0.39, -0.04], [-0.39, 0.34], [0.39, 0.34]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx, 0.34, sz]}>
          <boxGeometry args={[0.05, 0.68, 0.05]} />
          <meshStandardMaterial color="#2a2822" roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

// Monitor: a Bevel'd bezel body (was a naked plane before) fronted by a DIM
// gibberish-CRM screen — meshStandardMaterial with a low emissiveIntensity
// rather than the old toneMapped-false meshBasicMaterial, so it reads as an
// office monitor left on, not a light source (P1 checklist item 3).
function Monitor({ seed }) {
  const tex = useMemo(() => makeMonitorUITexture(seed), [seed])
  return (
    <group position={[0, 0.98, -0.42]}>
      <Bevel w={0.56} h={0.4} d={0.03} radius={0.015} segments={2} color="#1c1e22" roughness={0.55} metalness={0.15} />
      <mesh position={[0, 0, 0.017]}>
        <planeGeometry args={[0.5, 0.34]} />
        <meshStandardMaterial map={tex} color="#ffffff" roughness={0.7} emissive="#3a5648" emissiveIntensity={0.16} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Cubicle({ x, z, seed, onHeadsetPress }) {
  // Fabric partitions: a distinct tint per wall of the same cubicle (left /
  // right / back) so the three panels that actually meet at a corner never
  // share one flat material instance — the P0 toolkit's own adjacency rule.
  const leftMat = standardMat({ kind: 'fabric', tint: '#7c8792', scale: 1.1, wear: 0.3, seed: seed * 3 })
  const rightMat = standardMat({ kind: 'fabric', tint: '#727d88', scale: 1.3, wear: 0.35, seed: seed * 3 + 1 })
  const backMat = standardMat({ kind: 'fabric', tint: '#848d78', scale: 1.2, wear: 0.28, seed: seed * 3 + 2 })
  const deskTint = seed % 2 === 0 ? '#6a6252' : '#625a4a'
  return (
    <group position={[x, 0, z]}>
      {/* low partitions, three sides */}
      <mesh position={[-0.55, 0.55, 0]}>
        <boxGeometry args={[0.04, 1.1, 1]} />
        <primitive object={leftMat} attach="material" />
      </mesh>
      <mesh position={[0.55, 0.55, 0]}>
        <boxGeometry args={[0.04, 1.1, 1]} />
        <primitive object={rightMat} attach="material" />
      </mesh>
      <mesh position={[0, 0.55, -0.48]}>
        <boxGeometry args={[1.14, 1.1, 0.04]} />
        <primitive object={backMat} attach="material" />
      </mesh>
      <Desk tint={deskTint} seed={seed} />
      <Monitor seed={seed} />
      {/* headset prop: a thin arc + two small pads, propped on the desk —
          Wave T: pressable. Foley is handled by hand (a 3-ring phone
          pattern) rather than Touchable's own single-shot `foley`, so no
          foley prop here. */}
      <Touchable reach={4.5} onUse={onHeadsetPress} anchor={[0.28, 0.75, 0.1]}>
        <group position={[0.28, 0.75, 0.1]} rotation={[0, 0.4, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.09, 0.008, 6, 16, Math.PI]} />
            <meshStandardMaterial color="#1c1e22" roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0.09, -0.05, 0]}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshStandardMaterial color="#0c0d10" roughness={0.6} />
          </mesh>
          {/* invisible sensor, larger than the modeled headset — the arc +
              earpiece geometry alone is a tiny click target from a normal
              standing distance; this widens the hitbox without changing
              what's visible */}
          <mesh>
            <sphereGeometry args={[0.13, 8, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      </Touchable>
      <ChairRow pos={[0, 0, 0.55]} count={1} />
    </group>
  )
}

// Fluorescent strip fixture: a housing box + a bright emissive tube (the
// true light source per the bloom-discipline rule) — a matching pointLight
// is added separately in the room's own LightRig block below, positioned
// right under each fixture, cool with a slight green cast per the brief.
function FluorescentStrip({ x }) {
  return (
    <group position={[x, 2.35, -0.5]}>
      <mesh>
        <boxGeometry args={[0.18, 0.05, 3.24]} />
        <meshStandardMaterial color="#c8ccc4" roughness={0.6} metalness={0.15} />
      </mesh>
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[0.13, 0.035, 3.1]} />
        <meshStandardMaterial color="#eef8ea" emissive="#d8ffdc" emissiveIntensity={1.6} roughness={0.35} />
      </mesh>
    </group>
  )
}

const OFFICE_FLOOR_MAT = standardMat({ kind: 'carpet', tint: '#585c50', scale: 1.4, wear: 0.55, repeat: [4, 3.4] })
const OFFICE_CEIL_MAT = standardMat({ kind: 'plaster', tint: '#c6cad0', scale: 1, wear: 0.15, repeat: [3, 2.6] })
const OFFICE_BACKWALL_MAT = standardMat({ kind: 'plaster', tint: '#9a9c94', scale: 1.1, wear: 0.3, repeat: [3, 1.2] })
const OFFICE_FRONTWALL_MAT = standardMat({ kind: 'plaster', tint: '#8a8c82', scale: 0.9, wear: 0.4, repeat: [3, 1.2] })

function OfficeShell() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 6]} />
        <primitive object={OFFICE_FLOOR_MAT} attach="material" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 2.6, 0]}>
        <planeGeometry args={[7, 6]} />
        <primitive object={OFFICE_CEIL_MAT} attach="material" />
      </mesh>
      <mesh position={[0, 1.3, -2.9]}>
        <planeGeometry args={[7, 2.6]} />
        <primitive object={OFFICE_BACKWALL_MAT} attach="material" />
      </mesh>
      <mesh position={[0, 1.3, 2.9]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[7, 2.6]} />
        <primitive object={OFFICE_FRONTWALL_MAT} attach="material" />
      </mesh>
      {/* baseboards along both rendered walls — breaks the flat wall/floor
          seam under grazing light, P1 checklist item 1 */}
      <Trim pos={[0, 0.045, -2.87]} along="x" wallLength={7} color="#2a2c26" />
      <Trim pos={[0, 0.045, 2.87]} along="x" wallLength={7} color="#2a2c26" />
    </group>
  )
}

// `infoVisible` (Wave M/T's own "press i to hide the record" convention,
// same prop every other bespoke room already honors — BR2049's InfoPlinth,
// Sting's ParlorRecord, Baby Driver's own record) was never wired into this
// room before the P1 pass; the office's score plaque and the penthouse's
// scream sign now both fold under it, so the mood-shot check `i` promises
// actually works here too.
function OfficeScoreScreen({ film, visible = true }) {
  const tex = useMemo(() => makeOfficeScoreTexture(film.score, film.title), [film.slug, film.score, film.title])
  if (!visible) return null
  return (
    <group position={[-2.2, 0, -1.6]} rotation={[0, 0.35, 0]}>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.06, 1.8, 0.5]} />
        <meshStandardMaterial color="#3a3e30" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.35, 0.02]}>
        <planeGeometry args={[0.64, 0.42]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ----------------------------------------------------------- the penthouse */

const GOLD_COLUMN_MAT = standardMat({ kind: 'metal', tint: '#e8c060', scale: 1.6, wear: 0.15, roughness: 0.28, metalness: 0.75, emissive: '#e8c060', emissiveIntensity: 0.32 })
const TABLE_TOP_MAT = standardMat({ kind: 'wood', tint: '#3a2412', scale: 1.6, wear: 0.08, roughness: 0.2, seed: 71 })
const TABLE_LEG_MAT = standardMat({ kind: 'metal', tint: '#2a1c10', scale: 1.2, wear: 0.12, roughness: 0.4, metalness: 0.5, seed: 72 })

function GoldColumns() {
  const positions = [[-2.6, -2.2], [2.6, -2.2], [-2.6, 1.6], [2.6, 1.6]]
  return (
    <group>
      {positions.map(([x, z], i) => (
        <mesh key={i} position={[x, 1.4, z]}>
          <cylinderGeometry args={[0.16, 0.18, 2.8, 16]} />
          <primitive object={GOLD_COLUMN_MAT} attach="material" />
        </mesh>
      ))}
    </group>
  )
}

// The long table: bevelled top in a marble-esque low-roughness "wood" surface
// (materials.js has no literal marble kind — a warm-tinted wood/tile at low
// roughness reads as polished stone from typical viewing distance, per the
// spec's own note) rather than a flat-colored box, per P1 checklist item 4.
function LongTable() {
  return (
    <group position={[0, 0, -0.6]}>
      <Bevel pos={[0, 0.72, 0]} w={1.1} h={0.06} d={3.6} radius={0.02} segments={2} mat={TABLE_TOP_MAT} />
      {[-1.6, -0.5, 0.6, 1.6].map((z, i) => (
        <mesh key={i} position={[0, 0.36, z]}>
          <boxGeometry args={[0.9, 0.72, 0.06]} />
          <primitive object={TABLE_LEG_MAT} attach="material" />
        </mesh>
      ))}
    </group>
  )
}

// "Something fleshy and wrong" at the edges — organic pink-brown masses with
// a part-horse suggestion at silhouette level only: an elongated neck-ish
// capsule rising off a rounded haunch mass, kept dim at the room's far
// corners rather than lit and inspected up close. Never explicit; never a
// recognizable face.
function FleshMass({ pos, rot, scale = 1, seed }) {
  const tex = useMemo(() => makeFleshTexture(seed), [seed])
  return (
    <group position={pos} rotation={rot} scale={scale}>
      {/* haunch */}
      <mesh position={[0, 0.5, 0]} scale={[1.3, 0.9, 1.5]}>
        <sphereGeometry args={[0.55, 16, 12]} />
        <meshStandardMaterial map={tex} roughness={0.75} />
      </mesh>
      {/* elongated neck-suggestion, angled up and away */}
      <mesh position={[0.3, 1.15, -0.35]} rotation={[0.7, 0.2, 0.3]}>
        <capsuleGeometry args={[0.16, 0.75, 4, 8]} />
        <meshStandardMaterial map={tex} roughness={0.75} />
      </mesh>
      {/* a small rounded terminus, never a face — deliberately unresolved */}
      <mesh position={[0.55, 1.62, -0.7]} scale={[0.9, 0.7, 1]}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial map={tex} roughness={0.8} />
      </mesh>
    </group>
  )
}

// The scream is the verbatim take's OPENING line, per the brief ("YOURE
// FUCKING KIDDING", sized like the scream it was) — film.hot_take itself
// carries the full extended record (the whole "audibly yelled at the empty
// apartment..." debrief), so this pulls just the leading quoted segment
// rather than rendering that whole paragraph at scream size. Still verbatim:
// nothing here is reworded, only a prefix of the same string is shown.
function screamLine(hotTake) {
  const m = /^"([^"]+)"/.exec(hotTake || '')
  return m ? m[1] : (hotTake || '').slice(0, 40)
}

function Scream({ text, visible = true }) {
  const line = screamLine(text)
  const tex = useMemo(() => makeScreamTexture(line), [line])
  if (!visible) return null
  return (
    <mesh position={[0, 1.85, -2.85]}>
      <planeGeometry args={[5.2, 2.1]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

// Gold-lit excess, marble-ish surfaces: `tile` at a large cell scale + a
// warm dark tint + low roughness/moderate metalness fakes polished stone
// (materials.js has no literal marble generator — this is the spec's own
// suggested substitute), swapped in for the flat-colored planes so grazing
// light off the gold key actually paints texture across the floor.
const PENTHOUSE_FLOOR_MAT = standardMat({ kind: 'tile', tint: '#33200e', scale: 2.2, wear: 0.05, roughness: 0.18, metalness: 0.3, repeat: [3, 3] })
const PENTHOUSE_CEIL_MAT = standardMat({ kind: 'concrete', tint: '#1a1006', scale: 1.4, wear: 0.05, roughness: 0.45, repeat: [2.4, 2.1] })
const PENTHOUSE_WALL_MAT = standardMat({ kind: 'tile', tint: '#2c1c0c', scale: 2.6, wear: 0.08, roughness: 0.25, metalness: 0.22, repeat: [3.4, 1.3] })

function PenthouseShell() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 7]} />
        <primitive object={PENTHOUSE_FLOOR_MAT} attach="material" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3, 0]}>
        <planeGeometry args={[8, 7]} />
        <primitive object={PENTHOUSE_CEIL_MAT} attach="material" />
      </mesh>
      <mesh position={[0, 1.5, -3.4]}>
        <planeGeometry args={[8, 3]} />
        <primitive object={PENTHOUSE_WALL_MAT} attach="material" />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ doors */

// Bloodline doors (brief §6): the office's own back wall, clear of the score
// plinth and every cubicle — this room has no click-to-advance stations
// (the swerve is timed, not walked), so the door row mounts at the fixed
// entry station's own periphery.
const DOOR_MOUNT = { position: [2.4, 0, -1.9], rotationY: -0.3, spacing: 0.95, scale: 0.72 }

/* ------------------------------------------------------------------ room */

export default function Stby({ film, config, infoVisible = true, doors = [], onDoor }) {
  const { grade } = config
  const [inPenthouse, setInPenthouse] = useState(false)
  const inPenthouseRef = useRef(false)
  // Wave T: press a headset -> the hard-cut swerve fires within ~3s instead
  // of waiting out the full ~60s office timer. Reuses this exact same
  // scheduling path (scheduleOffice) rather than duplicating the cut logic —
  // the touch just cancels the current wait and reschedules a short one.
  const forceSwerveRef = useRef(null)

  useEffect(() => { inPenthouseRef.current = inPenthouse }, [inPenthouse])

  useEffect(() => {
    let live = true
    let officeTimer = null
    let penthouseTimer = null
    function scheduleOffice(wait) {
      officeTimer = setTimeout(() => {
        if (!live) return
        setInPenthouse(true)
        notifySwerve(true)
        penthouseTimer = setTimeout(() => {
          if (!live) return
          setInPenthouse(false)
          notifySwerve(false)
          scheduleOffice(OFFICE_MS)
        }, PENTHOUSE_MS)
      }, wait)
    }
    scheduleOffice(OFFICE_MS)
    forceSwerveRef.current = () => {
      if (!live || inPenthouseRef.current) return // already swerved — no-op
      clearTimeout(officeTimer)
      scheduleOffice(3000)
    }
    return () => {
      live = false
      forceSwerveRef.current = null
      clearTimeout(officeTimer)
      clearTimeout(penthouseTimer)
      notifySwerve(false)
    }
  }, [])

  // A quiet 3-ring phone pattern — answered by the swerve arriving early.
  const handleHeadsetPress = () => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info('[stby] headset pressed — forcing swerve within ~3s')
    }
    playOneShot('tick', { freq: 1100, gain: 0.05 })
    setTimeout(() => playOneShot('tick', { freq: 1100, gain: 0.05 }), 420)
    setTimeout(() => playOneShot('tick', { freq: 1100, gain: 0.05 }), 840)
    forceSwerveRef.current && forceSwerveRef.current()
  }

  // hard cut on the GRADE too: no lerp, an instant swap the moment the state
  // flips, matching "zero easing, no wash" for the visuals as much as the mix.
  // P1 grade triplet (checklist item 5): the penthouse gets its own
  // grain/vignette/bloomIntensity distinct from the office's — richer bloom
  // for "gold-lit excess", a tighter vignette for the party's crush, a touch
  // more grain than the clean office fluorescents.
  useEffect(() => {
    if (inPenthouse) {
      setGradeOverride({
        bg: '#160e04', fogColor: '#160e04', sat: 0.15, contrast: 0.08, key: '#ffb84a', fill: '#3a1c0c',
        grain: 0.06, vignette: 0.72, bloomIntensity: 0.42,
      })
    } else {
      clearGradeOverride()
    }
  }, [inPenthouse])
  useEffect(() => clearGradeOverride, [])

  useRoomAudio(startStbyAudio)

  return (
    <group>
      <StbyColliders spawn={config.camera?.pos} />
      {inPenthouse ? (
        <>
          <fogExp2 attach="fog" args={['#160e04', 0.03]} />
          <pointLight position={[0, 2.4, -0.5]} intensity={30} color="#ffb84a" distance={12} decay={2} />
          <pointLight position={[0, 1.2, 1.5]} intensity={10} color="#e8a840" distance={8} decay={2} />
          <ambientLight intensity={0.14} />

          <PenthouseShell />
          <GoldColumns />
          <LongTable />
          <FleshMass pos={[-3.1, 0, -2.6]} rot={[0, 0.6, 0]} scale={0.85} seed={1} />
          <FleshMass pos={[3.2, 0, -2.2]} rot={[0, -0.9, 0]} scale={0.7} seed={2} />
          <pointLight position={[-2.7, 1.3, -2]} intensity={5} color="#e8a840" distance={3} decay={2} />
          <pointLight position={[2.8, 1.1, -1.8]} intensity={4} color="#e8a840" distance={3} decay={2} />
          {/* two more fixture practicals at the far gold columns — reaches
              the room's far corners so no wall plane goes flat black there */}
          <pointLight position={[-2.6, 2.5, 1.5]} intensity={3.5} color="#ffcf7a" distance={4.2} decay={2} />
          <pointLight position={[2.6, 2.5, -2.2]} intensity={3.5} color="#ffcf7a" distance={4.2} decay={2} />
          <Scream text={film.hot_take} visible={infoVisible} />
        </>
      ) : (
        <>
          <fogExp2 attach="fog" args={[grade.fogColor || '#3a3c36', 0.05]} />
          {/* KEY: a wide, low-penumbra spot standing in for the overhead
              panel wash — cool with a slight green cast, per the brief's
              "fluorescent grade." PRACTICALS: a point light under each of
              the three fluorescent fixtures. BOUNCE: two low cool fills so
              the far wall corners still read something instead of black. */}
          <AimedSpot pos={[0, 2.45, -0.3]} target={[0, 0, -0.3]} intensity={6} color={grade.key || '#e6ffe0'} distance={9} angle={0.58} penumbra={0.15} decay={2} />
          {[-1.3, 0, 1.3].map((x) => (
            <pointLight key={x} position={[x, 2.15, -0.5]} intensity={4.5} color="#dfffe0" distance={4.4} decay={2} />
          ))}
          <pointLight position={[0, 0.7, 2.7]} intensity={3.5} color="#3a4a42" distance={6} decay={2} />
          <pointLight position={[0, 1.8, -2.75]} intensity={3} color="#2e3a34" distance={6} decay={2} />
          <ambientLight intensity={grade.ambient ?? 0.35} />
          <DustField pos={[0, 1.3, -0.4]} density={40} size={0.01} color="#c8d0c4" area={[6, 2, 5]} opacity={0.14} />

          <OfficeShell />
          {[-1.3, 0, 1.3].map((x) => <FluorescentStrip key={x} x={x} />)}
          {CUBICLES.map(([x, z], i) => (
            <Cubicle key={i} x={x} z={z} seed={i + 40} onHeadsetPress={handleHeadsetPress} />
          ))}
          {/* environmental-storytelling clutter — authored, not confetti:
              a coffee cup and crumpled scripts at one desk, a stray cable
              run off another, a box of old script binders parked by the
              score screen */}
          <CrumpledPaper pos={[-1.55, 0.76, -1.05]} rot={[0.3, 0.6, 0.1]} radius={0.045} seed={11} />
          <CrumpledPaper pos={[-1.42, 0.76, -0.95]} rot={[-0.2, 1.4, 0.3]} radius={0.04} seed={12} />
          <Cup pos={[-1.08, 0.76, -1.15]} />
          <WireRun points={[[1.72, 0.68, -1.02], [1.6, 0.3, -0.75], [1.42, 0.02, -0.45]]} sag={0.08} color="#141414" />
          <BoxPile pos={[-2.6, 0, -2.3]} count={3} color="#8a7a58" spread={0.4} />
          <OfficeScoreScreen film={film} visible={infoVisible} />
        </>
      )}

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
