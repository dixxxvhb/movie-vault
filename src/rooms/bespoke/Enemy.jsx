import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { gaze } from '../../CameraRig.jsx'
import { makeHotTakeTexture, makeMetaTexture } from '../infoTextures.js'
import { sheetOf } from '../../palette.js'
import { setGradeOverride, clearGradeOverride } from '../gradeBus.js'
import { useRoomAudio } from '../audio/engine.js'
import { start as startEnemyAudio } from '../audio/recipes/enemy.js'
import Duplicates from '../systems/Duplicates.jsx'
import { makeBlindsGoboTexture, makeChalkTexture, makeMarkedScoreTexture } from './enemyTextures.js'
import DoorRow from '../DoorRow.jsx'
import { wasDrag } from '../../pointer.js'
import { registerColliders, setBounds, clearOwner } from '../colliders.js'
import { footprint } from '../props.jsx'
import Touchable from '../Touchable.jsx'
import { standardMat } from '../materials.js'
import { Bevel, Trim, FrameOn } from '../detail.jsx'
import { FogLayers } from '../atmosphere.jsx'
import LightRig from '../lightRig.js'

// ENEMY (2013) · 9.6 · "the apartment, doubled." Brief
// (VAULT-IMMERSION-BRIEF-v2.md §5): the Toronto apartment, venetian-blind
// light stripes, yellow-sepia haze pushed hard, every object twinned inches
// apart (one copy slightly wrong), spider-leg shadows that scale near
// corners and vanish under direct look, a skyline suggestion of something
// enormous never resolving, the score appearing twice (one lying by a
// decimal, truth on approach), and his own crack of the case in chalk.
//
// Geometry in meters. A single sparse room, ROOM_W x ROOM_D x ROOM_H, one
// window wall (+X) letting the blind-stripe light in, one chalk wall (-Z).
const ROOM_W = 4.2
const ROOM_D = 4.2
const ROOM_H = 2.5

const ENTRY_STATION = { pos: [0, 1.5, 1.8], look: [0, 1.4, -1.8], fov: 46 }
const LYING_STATION = { pos: [-1.1, 1.5, -0.7], look: [-1.55, 1.55, -ROOM_D / 2 + 0.05], fov: 40 }
const STATIONS = { entry: ENTRY_STATION, lying: LYING_STATION }

const CHALK_TEXT =
  'He invented the innocent. cute shy history teacher he dreams of being instead of the monster he sees himself as. ugh so good.'

/* ------------------------------------------------------- twin furniture */
// Wave T: "touching the wrong twin of any pair -> it snaps to match its
// partner for 3s, then drifts wrong again." Every piece of furniture used
// to render through the generic <Duplicates> wrapper (a static offset
// group, both copies identical geometry, no per-copy state) — that still
// covers the twinned camera-shadow blob below, but the FURNITURE now
// renders each twin through its own TwinFurniture instead, since a snap
// needs somewhere to hold "am I currently wrong / snapping / true / drifting
// back" per pair. The "wrong" offset math is copied straight from
// Duplicates.jsx (offset, offset*0.4*w, offset*0.6 / rotY offset*0.5*w) so
// the twin sits exactly where <Duplicates offset={0.11} wrongness="high">
// used to put it — this is a drop-in replacement, not a new look.
const ZERO_V = new THREE.Vector3(0, 0, 0)
const V3 = (v) => (Array.isArray(v) ? v : [0, 0, 0])

function TwinFurniture({ offset = 0.11, wrongness = 'high', reach = 2.0, foley = 'tick', children }) {
  const w = wrongness === 'high' ? 1 : wrongness === 'subtle' ? 0.35 : Number(wrongness) || 0.35
  const wrongPos = useMemo(() => new THREE.Vector3(offset, offset * 0.4 * w, offset * 0.6), [offset, w])
  const wrongRotY = offset * 0.5 * w

  const group = useRef(null)
  const [mode, setMode] = useState('wrong') // wrong -> snapping -> snapped -> drifting -> wrong
  const modeRef = useRef('wrong')
  const t0 = useRef(0)

  const setModeBoth = (m) => { modeRef.current = m; setMode(m) }

  const handleUse = useCallback(() => {
    if (modeRef.current !== 'wrong') return
    t0.current = performance.now()
    setModeBoth('snapping')
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info('[enemy] twin snap fired, offset=%s', offset)
    }
  }, [offset])

  useFrame(() => {
    const g = group.current
    if (!g) return
    const now = performance.now()
    const elapsed = now - t0.current
    if (modeRef.current === 'snapping') {
      const t = Math.min(1, elapsed / 200)
      g.position.lerpVectors(wrongPos, ZERO_V, t)
      g.rotation.y = THREE.MathUtils.lerp(wrongRotY, 0, t)
      if (t >= 1) { t0.current = now; setModeBoth('snapped') }
    } else if (modeRef.current === 'snapped') {
      if (elapsed >= 3000) { t0.current = now; setModeBoth('drifting') }
    } else if (modeRef.current === 'drifting') {
      const t = Math.min(1, elapsed / 2000)
      g.position.lerpVectors(ZERO_V, wrongPos, t)
      g.rotation.y = THREE.MathUtils.lerp(0, wrongRotY, t)
      if (t >= 1) setModeBoth('wrong')
    }
  })

  return (
    <Touchable onUse={handleUse} reach={reach} foley={foley} disabled={mode !== 'wrong'} anchor={[wrongPos.x, wrongPos.y, wrongPos.z]}>
      <group ref={group} position={[wrongPos.x, wrongPos.y, wrongPos.z]} rotation={[0, wrongRotY, 0]}>
        {children}
      </group>
    </Touchable>
  )
}

/* -------------------------------------------------------------- furniture */

// Finishing pass (P1): the room used to render its furniture through the
// shared props.jsx table/chairRow/bed helpers (flat meshStandardMaterial
// colors, naked boxGeometry). Hand-authored replacements below use Bevel
// (chamfered bodies, spec #2) + standardMat (spec #1) instead — and since
// this room's whole thesis is "twinned, one copy slightly wrong," the
// `wrong` flag doesn't just reposition the twin (TwinFurniture already does
// that), it also gives the wrong twin its OWN slightly-off material: a
// grubbier tint, higher wear, its own seed. The twin doesn't just sit in
// the wrong place, it's a slightly wrong OBJECT — the film's own idea,
// carried into the material layer.
function EnemyTable({ pos, rot, w = 1, d = 0.6, wrong = false }) {
  const h = 0.75
  const topMat = useMemo(() => standardMat({
    kind: 'wood', tint: wrong ? '#332510' : '#4a3626', scale: wrong ? 1.6 : 1.4,
    wear: wrong ? 0.58 : 0.32, seed: wrong ? 611 : 610, roughness: 1,
  }), [wrong])
  const legMat = useMemo(() => standardMat({
    kind: 'wood', tint: wrong ? '#231a0b' : '#2e2214', scale: wrong ? 1.3 : 1.1,
    wear: wrong ? 0.62 : 0.38, seed: wrong ? 621 : 620, roughness: 1,
  }), [wrong])
  return (
    <group position={V3(pos)} rotation={V3(rot)}>
      <Bevel pos={[0, h - 0.04, 0]} w={w} h={0.08} d={d} radius={0.008} mat={topMat} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <Bevel key={i} pos={[sx * (w / 2 - 0.08), (h - 0.08) / 2, sz * (d / 2 - 0.08)]} w={0.07} h={h - 0.08} d={0.07} radius={0.008} mat={legMat} />
      ))}
    </group>
  )
}

function EnemyChairRow({ pos, rot, count = 2, spacing = 0.6, wrong = false }) {
  const items = useMemo(() => Array.from({ length: count }, (_, i) => i - (count - 1) / 2), [count])
  const seatMat = useMemo(() => standardMat({
    kind: 'wood', tint: wrong ? '#1f170c' : '#2c2216', scale: wrong ? 1.4 : 1.2,
    wear: wrong ? 0.6 : 0.36, seed: wrong ? 631 : 630, roughness: 1,
  }), [wrong])
  const legMat = useMemo(() => standardMat({
    kind: 'metal', tint: wrong ? '#131519' : '#1c1e22', scale: 1,
    wear: wrong ? 0.6 : 0.32, seed: wrong ? 641 : 640, roughness: 0.7, metalness: 0.45,
  }), [wrong])
  const seatH = 0.46
  return (
    <group position={V3(pos)} rotation={V3(rot)}>
      {items.map((i) => (
        <group key={i} position={[i * spacing, 0, 0]}>
          <Bevel pos={[0, seatH, 0]} w={0.44} h={0.06} d={0.44} radius={0.006} mat={seatMat} />
          <Bevel pos={[0, seatH + 0.3, -0.2]} w={0.44} h={0.6} d={0.06} radius={0.006} mat={seatMat} />
          <Bevel pos={[0, seatH / 2, 0]} w={0.04} h={seatH} d={0.04} radius={0.003} mat={legMat} />
        </group>
      ))}
    </group>
  )
}

function EnemyBed({ pos, rot, wrong = false }) {
  const frameMat = useMemo(() => standardMat({
    kind: 'wood', tint: wrong ? '#231c13' : '#3a3226', scale: wrong ? 1.5 : 1.3,
    wear: wrong ? 0.56 : 0.3, seed: wrong ? 651 : 650, roughness: 1,
  }), [wrong])
  const mattressMat = useMemo(() => standardMat({
    kind: 'fabric', tint: wrong ? '#615a4c' : '#8a8072', scale: wrong ? 1.8 : 1.6,
    wear: wrong ? 0.52 : 0.26, seed: wrong ? 661 : 660, roughness: 1,
  }), [wrong])
  const pillowMat = useMemo(() => standardMat({
    kind: 'fabric', tint: wrong ? '#c0b79f' : '#e8e0d0', scale: wrong ? 2.0 : 1.8,
    wear: wrong ? 0.46 : 0.2, seed: wrong ? 671 : 670, roughness: 1,
  }), [wrong])
  return (
    <group position={V3(pos)} rotation={V3(rot)}>
      <Bevel pos={[0, 0.24, 0]} w={1.3} h={0.28} d={2} radius={0.02} mat={frameMat} />
      <Bevel pos={[0, 0.42, 0]} w={1.24} h={0.16} d={1.94} radius={0.012} mat={mattressMat} />
      <Bevel pos={[0, 0.56, -0.85]} w={1.24} h={0.22} d={0.3} radius={0.02} mat={pillowMat} />
      <Bevel pos={[0, 0.66, 0.95]} w={1.3} h={0.7} d={0.06} radius={0.006} mat={frameMat} />
    </group>
  )
}

/* ------------------------------------------------------------------ shell */

// Finishing pass (P1): flat canvas-swatch walls replaced with
// materials.js standardMat plaster/wood — and per the toolkit rule ("no two
// adjacent surfaces share identical params"), every wall plane below gets
// its OWN seed/scale/wear rather than one shared texture instance, so a
// grazing light shows genuinely different plaster blotching wall to wall
// instead of one map tiled four times.
function RoomShell({ grade }) {
  const wallTint = grade.fill || '#3a3020'
  const backWallMat = useMemo(() => standardMat({ kind: 'plaster', tint: wallTint, scale: 1.25, wear: 0.34, seed: 501, roughness: 1 }), [wallTint])
  const doorWallMat = useMemo(() => standardMat({ kind: 'plaster', tint: wallTint, scale: 1.05, wear: 0.4, seed: 502, roughness: 1 }), [wallTint])
  const sideWallMat = useMemo(() => standardMat({ kind: 'plaster', tint: wallTint, scale: 1.4, wear: 0.3, seed: 503, roughness: 1 }), [wallTint])
  const windowWallMat = useMemo(() => standardMat({ kind: 'plaster', tint: wallTint, scale: 1.15, wear: 0.46, seed: 504, roughness: 1 }), [wallTint])
  const ceilMat = useMemo(() => standardMat({ kind: 'plaster', tint: '#241d10', scale: 1.7, wear: 0.24, seed: 505, roughness: 1 }), [])
  const floorMat = useMemo(() => standardMat({ kind: 'wood', tint: '#2e2313', scale: 1.7, wear: 0.48, repeat: [3, 3], seed: 510, roughness: 1 }), [])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={false}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <primitive object={floorMat} attach="material" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <primitive object={ceilMat} attach="material" />
      </mesh>
      <mesh position={[0, ROOM_H / 2, -ROOM_D / 2]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <primitive object={backWallMat} attach="material" />
      </mesh>
      <mesh position={[0, ROOM_H / 2, ROOM_D / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <primitive object={doorWallMat} attach="material" />
      </mesh>
      <mesh position={[-ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <primitive object={sideWallMat} attach="material" />
      </mesh>
      {/* +X window wall, mostly glazing */}
      <mesh position={[ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <primitive object={windowWallMat} attach="material" />
      </mesh>
      <mesh position={[ROOM_W / 2 - 0.01, ROOM_H * 0.55, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D * 0.72, ROOM_H * 0.5]} />
        <meshBasicMaterial color={grade.key || '#c9a24a'} transparent opacity={0.32} />
      </mesh>

      {/* Trim: baseboard run around all four walls (the +Z/door wall splits
          around the doorway gap, same geometry as its own collider rects). */}
      <Trim pos={[ROOM_W / 2 - 0.014, 0.045, 0]} along="z" wallLength={ROOM_D} color="#1c150a" />
      <Trim pos={[-ROOM_W / 2 + 0.014, 0.045, 0]} along="z" wallLength={ROOM_D} color="#1c150a" />
      <Trim pos={[0, 0.045, -ROOM_D / 2 + 0.014]} along="x" wallLength={ROOM_W} color="#1c150a" />
      <Trim pos={[-1.45, 0.045, ROOM_D / 2 - 0.014]} along="x" wallLength={1.3} color="#1c150a" />
      <Trim pos={[1.45, 0.045, ROOM_D / 2 - 0.014]} along="x" wallLength={1.3} color="#1c150a" />

      {/* FrameOn: the -X wall is otherwise bare plaster (the far wall from
          entry, past the twin furniture) — one panel-moulding rectangle to
          break the flat plane, per the P1 checklist. */}
      <FrameOn pos={[-ROOM_W / 2 + 0.012, 1.35, -1.2]} rot={[0, Math.PI / 2, 0]} w={0.7} h={1.0} color="#1c150a" />
      <FrameOn pos={[-ROOM_W / 2 + 0.012, 1.35, 1.1]} rot={[0, Math.PI / 2, 0]} w={0.7} h={1.0} color="#1c150a" />
    </group>
  )
}

/* --------------------------------------------------------- blind stripes */

// The gobo stripe pattern, cast two ways: a semi-transparent plane just
// inside the window (the light itself, cut into bars) and a matching decal
// on the floor beneath it (where those bars actually land). Both read the
// SAME texture so the stripes agree with each other.
function BlindLight() {
  const tex = useMemo(() => makeBlindsGoboTexture(), [])
  return (
    <group>
      <mesh position={[ROOM_W / 2 - 0.05, ROOM_H * 0.55, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D * 0.72, ROOM_H * 0.5]} />
        <meshBasicMaterial map={tex} color="#0a0704" transparent opacity={0.55} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, -Math.PI / 2]} position={[0.6, 0.006, 0]}>
        <planeGeometry args={[2.6, 3.0]} />
        <meshBasicMaterial map={tex} color="#0a0704" transparent opacity={0.4} depthWrite={false} />
      </mesh>
    </group>
  )
}

// BlindSlats: the P1 checklist's venetian-blind stripes as ACTUAL geometry
// rather than another flat gobo plane — three.js 0.161 (this project's pin)
// has no SpotLight.map/gobo support (that landed later in three), so the
// cheapest option that still reads as real blinds in a peek is the literal
// one the spec calls out: thin tilted bars physically between the room and
// the window glow, instanced since count > 8 (spec #6).
function BlindSlats() {
  const count = 11
  const winY = ROOM_H * 0.55
  const winH = ROOM_H * 0.5
  const winW = ROOM_D * 0.72
  const bandH = winH / count
  const slatH = bandH * 0.44
  const thickness = 0.016
  const mat = useMemo(() => standardMat({
    kind: 'metal', tint: '#110d07', scale: 1, wear: 0.55, seed: 700, roughness: 0.75, metalness: 0.3,
  }), [])
  const ref = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => {
    if (!ref.current) return
    for (let i = 0; i < count; i++) {
      const y = winY - winH / 2 + bandH * (i + 0.5)
      dummy.position.set(ROOM_W / 2 - 0.13, y, 0)
      dummy.rotation.set(0, 0, 0.3)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  }, [dummy, bandH, winY, winH])
  return (
    <instancedMesh ref={ref} args={[null, null, count]} key={count}>
      <boxGeometry args={[thickness, slatH, winW]} />
      <primitive object={mat} attach="material" />
    </instancedMesh>
  )
}

/* ------------------------------------------------------ spider shadows */

// Small local canvas-texture cache — RoomShell's walls moved to
// materials.js's own cache, but the spider-leg decal below is a bespoke
// shape (not a surface kind), so it keeps its own tiny cache.
const texCache = new Map()
function flatTexture(key, draw) {
  if (texCache.has(key)) return texCache.get(key)
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  draw(c.getContext('2d'), S)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  texCache.set(key, tex)
  return tex
}

// Spider-leg shadow: a canvas-drawn radiating shape in the ceiling corner,
// visible only in your peripheral vision and gone the instant you look
// straight at it — same gaze-angle math as systems/PeripheralFigure.jsx
// (kept local rather than importing that component, since this renders a
// flat shadow shape, not an abstractFigure).
function spiderTexture() {
  return flatTexture('spider', (ctx, S) => {
    ctx.clearRect(0, 0, S, S)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    const legs = 7
    for (let i = 0; i < legs; i++) {
      const a = (i / legs) * Math.PI * 0.9 + 0.1
      ctx.globalAlpha = 0.5 + (i % 3) * 0.1
      ctx.beginPath()
      ctx.moveTo(S * 0.15, S * 0.15)
      const midx = S * 0.15 + Math.cos(a) * S * 0.35
      const midy = S * 0.15 + Math.sin(a) * S * 0.35
      ctx.quadraticCurveTo(midx, midy, S * 0.15 + Math.cos(a) * S * 0.6, S * 0.15 + Math.sin(a) * S * 0.6)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  })
}

function SpiderShadow({ pos, cornerYaw }) {
  const ref = useRef()
  const tex = useMemo(() => spiderTexture(), [])
  useFrame(() => {
    if (!ref.current) return
    let d = Math.abs(gaze.yaw - cornerYaw)
    while (d > Math.PI) d = Math.abs(d - Math.PI * 2)
    const edge = 0.3, full = 1.0
    const s = Math.min(1, Math.max(0, (d - edge) / (full - edge)))
    // smoothstep, then INVERTED for "vanish under direct gaze": looking
    // straight at the corner (d≈0) drives s to 0, so opacity should be 0
    // there and rise as you look away — s already does exactly that.
    const smooth = s * s * (3 - 2 * s)
    ref.current.material.opacity = smooth * 0.6
  })
  return (
    <mesh ref={ref} position={pos} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.2, 2.2]} />
      <meshBasicMaterial map={tex} color="#000000" transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

/* ------------------------------------------------------------- skyline */

function Skyline() {
  const boxes = useMemo(() => Array.from({ length: 10 }, (_, i) => ({
    x: (i - 4.5) * 0.5,
    h: 0.6 + (i % 4) * 0.4,
  })), [])
  return (
    <group position={[ROOM_W / 2 + 3, 0, 0]}>
      {boxes.map((b, i) => (
        <mesh key={i} position={[0.2, b.h / 2 + 1.4, b.x]}>
          <boxGeometry args={[0.6, b.h, 0.4]} />
          <meshStandardMaterial color="#26241a" roughness={0.95} transparent opacity={0.55} />
        </mesh>
      ))}
      {/* the fog-faint suggestion, never resolving: two vast, very low
          opacity "legs" straddling the skyline, deliberately underdefined */}
      <mesh position={[1.4, 3.6, -0.6]}>
        <cylinderGeometry args={[0.14, 0.22, 7, 8]} />
        <meshBasicMaterial color="#0c0a06" transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[1.4, 3.6, 0.9]}>
        <cylinderGeometry args={[0.14, 0.22, 7, 8]} />
        <meshBasicMaterial color="#0c0a06" transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  )
}

/* --------------------------------------------------------------- score */

// Two numerals, on opposite walls: the "true" 9.6 by the door (opacity
// steady) and the "lying" 9.5 (position below, LYING_STATION's own wall)
// which flickers to correct itself once — irreversible, only ever
// triggered from its own click station.
function ScoreDuo({ film, corrected }) {
  const trueLabel = (film.score ?? 9.6).toFixed(1)
  const lieLabel = (Math.round((film.score - 0.1) * 10) / 10).toFixed(1)
  const lieRef = useRef()
  const flickerUntil = useRef(0)

  useEffect(() => {
    if (corrected) flickerUntil.current = performance.now() / 1000 + 0.7
  }, [corrected])

  useFrame(({ clock }) => {
    if (!lieRef.current) return
    const t = clock.elapsedTime
    if (corrected && t < flickerUntil.current) {
      // rapid on/off — the flicker itself
      lieRef.current.material.opacity = Math.floor(t * 22) % 2 === 0 ? 1 : 0.15
    } else if (corrected) {
      lieRef.current.material.opacity = 1
    }
  })

  return (
    <group>
      <mesh position={[ROOM_W / 2 - 0.012, 1.7, 1.2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshBasicMaterial
          map={useMemo(() => makeMarkedScoreTexture(trueLabel, '#c9a24a'), [trueLabel])}
          transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={lieRef} position={[-ROOM_W / 2 + 0.012, 1.6, -0.7]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshBasicMaterial
          map={useMemo(
            () => makeMarkedScoreTexture(corrected ? trueLabel : lieLabel, '#c9a24a'),
            [corrected, trueLabel, lieLabel]
          )}
          transparent opacity={1} depthWrite={false} toneMapped={false} side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

/* --------------------------------------------------------------- chalk */

function ChalkCrack() {
  const tex = useMemo(() => makeChalkTexture(CHALK_TEXT, '— Dixon, in debrief'), [])
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <mesh position={[0.9, 1.45, -ROOM_D / 2 + 0.012]}>
      <planeGeometry args={[1.9, 0.95]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
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
    <group position={[1.3, 0, 1.3]} rotation={[0, -0.35, 0]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.06, 1.1, 0.06]} />
        <meshStandardMaterial color="#241e12" roughness={0.9} />
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

/* -------------------------------------------------------------- colliders */

// Walls at ±ROOM_W/2, ±ROOM_D/2; the +Z (south) wall carries the door gap
// DoorRow sits in. Furniture is twinned by Duplicates below — BOTH copies
// (the authored one and its slightly-wrong twin) must block, per the room
// law ("twinned furniture colliders (both twins block)").
const WALL_T = 0.15
function shellRects() {
  const hw = ROOM_W / 2, hd = ROOM_D / 2
  const gapHalf = 0.8
  return [
    { minX: -hw, maxX: hw, minZ: -hd - WALL_T, maxZ: -hd }, // -Z wall
    { minX: hw, maxX: hw + WALL_T, minZ: -hd, maxZ: hd },   // +X window wall
    { minX: -hw - WALL_T, maxX: -hw, minZ: -hd, maxZ: hd }, // -X wall
    { minX: -hw, maxX: -gapHalf, minZ: hd, maxZ: hd + WALL_T }, // +Z wall, left of door
    { minX: gapHalf, maxX: hw, minZ: hd, maxZ: hd + WALL_T },   // +Z wall, right of door
  ]
}

const FURNITURE = [
  { type: 'table', pos: [-0.4, 0, -0.4], w: 1, d: 0.6 },
  { type: 'chairRow', pos: [-0.4, 0, -0.1], count: 2, spacing: 0.6 },
  { type: 'bed', pos: [1.3, 0, -1.0], rot: [0, -0.2, 0] },
]

// Duplicates(offset=0.11, wrongness='high') shifts the twin by exactly this
// XZ delta (see Duplicates.jsx: [offset, offset*0.4*w, offset*0.6] with
// w=1 for 'high') — mirrored here so the twin's footprint lands where the
// twin actually renders, not where the original does.
const TWIN_DX = 0.11
const TWIN_DZ = 0.11 * 0.6

function shiftRect(r, dx, dz) {
  return { minX: r.minX + dx, maxX: r.maxX + dx, minZ: r.minZ + dz, maxZ: r.maxZ + dz, top: r.top }
}

function furnitureRects() {
  const base = FURNITURE.flatMap((p) => footprint(p))
  const twin = base.map((r) => shiftRect(r, TWIN_DX, TWIN_DZ))
  return [...base, ...twin]
}

/* ------------------------------------------------------------------ room */

const DOOR_MOUNT = { position: [0, 0, ROOM_D / 2 - 0.05], rotationY: Math.PI, spacing: 0.95, scale: 0.8 }
const OWNER_ID = 'bespoke:enemy'
// how close (metres, XZ) the walker has to get to the "lying" score before
// approaching it corrects it — matches the old click-trigger's radius of
// intent (you had to be standing at the station to click it).
const CORRECT_RADIUS = 0.9

export default function Enemy({ film, config, doors = [], goToStation, onDoor }) {
  const { grade } = config
  const [stationKey, setStationKey] = useState('entry')
  const [corrected, setCorrected] = useState(false)

  const stepTo = (key) => {
    setStationKey(key)
    goToStation?.(STATIONS[key], key)
  }

  useEffect(() => {
    // "the city yellow-sepia haze grade pushed hard" (brief §5) — pushed a
    // notch past darkknight's baseline (0.12/0.06), but NOT further: an
    // earlier pass at 0.22/0.12 clipped every close-lit surface to solid
    // white once Bloom's mipmap blur piled on top (QA peek caught it, see
    // enemy-debug1..14.png) — contrast this high only reads correctly on
    // large, already-dim wall planes, not on furniture sitting close to a
    // practical/bounce light.
    setGradeOverride({ sat: grade.sat ?? 0.16, contrast: grade.contrast ?? 0.08, hue: 0.02 })
    return clearGradeOverride
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    registerColliders(OWNER_ID, [
      ...shellRects(),
      ...furnitureRects(),
      { minX: 1.2, maxX: 1.4, minZ: 1.2, maxZ: 1.4 }, // info plinth
    ])
    setBounds(OWNER_ID, {
      kind: 'rect',
      minX: -ROOM_W / 2 + 0.1,
      maxX: ROOM_W / 2 - 0.1,
      minZ: -ROOM_D / 2 + 0.1,
      maxZ: ROOM_D / 2 - 0.1,
    })
    return () => clearOwner(OWNER_ID)
  }, [])

  // "the score appearing twice ... truth on approach" — re-keyed to walker
  // position (was a click-only trigger): walking up to the lying numeral
  // corrects it, one-way, same as before.
  useFrame(({ camera }) => {
    if (corrected) return
    const dx = camera.position.x - LYING_STATION.pos[0]
    const dz = camera.position.z - LYING_STATION.pos[2]
    if (dx * dx + dz * dz < CORRECT_RADIUS * CORRECT_RADIUS) setCorrected(true)
  })

  useRoomAudio(startEnemyAudio)

  const furniture = (
    <>
      <EnemyTable pos={[-0.4, 0, -0.4]} w={1} d={0.6} />
      <EnemyChairRow pos={[-0.4, 0, -0.1]} count={2} spacing={0.6} />
      <EnemyBed pos={[1.3, 0, -1.0]} rot={[0, -0.2, 0]} />
    </>
  )

  // Layered lighting per the P0 doctrine (spec #3): the window is the
  // room's one motivated source, so the KEY sits just inside it, warm and
  // reaching across the floor toward the door. A small lamp practical
  // stands in for the apartment's own reading light near the chalk corner,
  // and two low bounce fills (a warm floor kick near entry, a cooler dim
  // one off the far -X wall) keep the corners from reading as pure void
  // without flattening the room. Ambient stays low (spec #3's "darks stay
  // dark" — moody rooms cap at 0.12).
  // NOTE: LightRig's own SCALE table (spec #3's "author a small number, the
  // rig multiplies it up") applies a bigger key multiplier (22x) than the
  // old bare pointLight this replaced was hand-tuned against (14x) — first
  // pass here left grade.keyIntensity's default at the OLD scale (1.5) and
  // the result blew every surface's specular to pure white (QA peek caught
  // it, see enemy-debug1.png). Rebalanced against the same target
  // irradiance the old single light produced at the furniture.
  const roomLights = useMemo(() => ({
    key: {
      pos: [1.55, 1.85, 0], color: grade.key || '#c9a24a',
      intensity: grade.keyIntensity ?? 0.55, distance: 9, decay: 2,
    },
    practicals: [
      { pos: [-1.7, 1.05, -1.75], color: '#caa062', intensity: 0.22, distance: 3.2, decay: 2 },
    ],
    bounce: [
      { pos: [-1.5, 0.5, 1.35], color: '#5a4a34', intensity: 0.3, distance: 5.5, decay: 2 },
      { pos: [-1.9, 1.9, -0.3], color: '#2a2820', intensity: 0.2, distance: 4.5, decay: 2 },
    ],
  }), [grade.key, grade.keyIntensity])

  return (
    <group>
      <fogExp2 attach="fog" args={[grade.fill || '#3a3020', 0.062]} />
      <LightRig lights={roomLights} />
      <ambientLight intensity={grade.ambient ?? 0.12} color={grade.fill || '#3a3020'} />

      <RoomShell grade={grade} />
      <BlindLight />
      <BlindSlats />
      <FogLayers pos={[0, 0.03, 0]} size={[ROOM_W * 0.95, ROOM_D * 0.95]} color="rgba(180,150,90,0.5)" opacity={0.16} speed={0.015} />
      <Skyline />

      {/* every object twinned, the second copy slightly wrong. Wave T: the
          wrong twin of each pair is individually touchable now — touch it
          and it snaps to match its true partner for 3s, then drifts wrong
          again — so each of the three furniture groups gets its own
          TwinFurniture instead of sharing one static <Duplicates> offset.
          The wrong twin also carries its own slightly-off material (see
          EnemyTable/EnemyChairRow/EnemyBed's `wrong` flag) — the doubling
          reads in the surfaces themselves, not just the offset. */}
      {furniture}
      <TwinFurniture offset={0.11} wrongness="high" foley="tick">
        <EnemyTable pos={[-0.4, 0, -0.4]} w={1} d={0.6} wrong />
      </TwinFurniture>
      <TwinFurniture offset={0.11} wrongness="high" foley="tick">
        <EnemyChairRow pos={[-0.4, 0, -0.1]} count={2} spacing={0.6} wrong />
      </TwinFurniture>
      <TwinFurniture offset={0.11} wrongness="high" foley="tick">
        <EnemyBed pos={[1.3, 0, -1.0]} rot={[0, -0.2, 0]} wrong />
      </TwinFurniture>

      {/* "your camera casts two shadows": a soft dark floor blob at the
          entry standpoint, twinned by the same Duplicates offset as the
          furniture — your own presence in the room is doubled too */}
      <Duplicates offset={0.09} wrongness="high">
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 1.7]}>
          <circleGeometry args={[0.32, 20]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      </Duplicates>

      <SpiderShadow pos={[ROOM_W / 2 - 0.9, ROOM_H - 0.02, -ROOM_D / 2 + 0.9]} cornerYaw={Math.atan2(-(ROOM_W / 2 - 0.9), -(-ROOM_D / 2 + 0.9))} />

      <ScoreDuo film={film} corrected={corrected} />
      <ChalkCrack />
      <InfoPlinth film={film} />

      {Object.entries(STATIONS).map(([key, st]) => (
        <mesh
          key={key}
          position={[st.pos[0], 0.012, st.pos[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e) => { e.stopPropagation(); if (wasDrag()) return; stepTo(key) }}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'auto' }}
        >
          <ringGeometry args={[0.18, 0.24, 20]} />
          <meshBasicMaterial color="#c9a24a" transparent opacity={stationKey === key ? 0.55 : 0.2} depthWrite={false} />
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
