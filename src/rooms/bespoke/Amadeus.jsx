import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { bed as Bed } from '../props.jsx'
import { useRoomAudio } from '../audio/engine.js'
import { start as startAmadeusAudio } from '../audio/recipes/amadeus.js'
import {
  makeInkTexture, makePageBaseTexture, makeInkScoreTexture, makeMarginTakeTexture,
} from './amadeusTextures.js'
import DoorRow from '../DoorRow.jsx'
import { registerColliders, setBounds, clearOwner, resolveStep } from '../colliders.js'
import Touchable from '../Touchable.jsx'
import { standardMat } from '../materials.js'
import { Bevel, Trim } from '../detail.jsx'

// P1 finishing pass (IMMERSION-V2-POLISH-SPEC.md): materials.js surfaces on
// every plane, heavy fabric drape with real folds, a real candle body under
// each flame (no floating lights), a bevelled writing desk, baseboard trim.
// The corner desk stays lightless on purpose (brief §5: "one desk in the
// corner the candlelight never reaches") — no fixture was added near it.
const wallMat = standardMat({ kind: 'plaster', tint: '#2c2014', wear: 0.45, roughness: 1, repeat: [2.2, 1.4] })
const wallMatB = standardMat({ kind: 'plaster', tint: '#241a10', wear: 0.55, roughness: 1, repeat: [1.6, 1.4] })
wallMat.side = THREE.DoubleSide
wallMatB.side = THREE.DoubleSide
const wallMatEntry = standardMat({ kind: 'plaster', tint: '#221808', wear: 0.5, roughness: 1, repeat: [2.2, 1.4] })
const floorMat = standardMat({ kind: 'wood', tint: '#1c1409', wear: 0.6, roughness: 0.85, repeat: [3, 3.3] })
const ceilingMat = standardMat({ kind: 'plaster', tint: '#160f08', wear: 0.6, roughness: 1, repeat: [2, 2.2] })
const drapeMat = standardMat({ kind: 'fabric', tint: '#4a1414', wear: 0.35, roughness: 0.95 })
const quiltMat = standardMat({ kind: 'fabric', tint: '#7a6a54', wear: 0.3, roughness: 0.9 })
const deskMat = standardMat({ kind: 'wood', tint: '#241a0e', wear: 0.4, roughness: 0.6 })
const chairMat = standardMat({ kind: 'wood', tint: '#221708', wear: 0.45, roughness: 0.65 })
const waxMat = new THREE.MeshStandardMaterial({ color: '#e8d8b0', roughness: 0.4 })
const holderMat = new THREE.MeshStandardMaterial({ color: '#8a6a30', roughness: 0.35, metalness: 0.55 })

// 9.3 — "the deathbed dictation." Candlelit bedchamber: bed, heavy drape
// planes, a chair pulled close, warm candle grade against one cold blue
// window. Generative ink writes our own invented notation across a page,
// then spreads onto the walls faster than any hand could, growing like
// frost. At long intervals a ripple crosses the room's own wall surfaces —
// the laugh as physics, never as sound. One desk in the corner the
// candlelight never reaches. Score as an ink flourish; hot take in a page
// margin.
const ROOM_W = 4.2
const ROOM_D = 4.6
const ROOM_H = 2.6

/* ------------------------------------------------------------- colliders */
// Wave M3: walls + bed/chair/desk all block (contract #3, Amadeus row).
function rotatedHalfExtentsRad(hx, hz, rotY) {
  const c = Math.abs(Math.cos(rotY)), s = Math.abs(Math.sin(rotY))
  return { hx: hx * c + hz * s, hz: hx * s + hz * c }
}
function rectXZ(cx, cz, hx, hz, top) {
  return { minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz, top }
}

const WALL_T = 0.12
const AMADEUS_SHELL_RECTS = [
  { minX: -ROOM_W / 2 - WALL_T, maxX: -ROOM_W / 2, minZ: -ROOM_D / 2, maxZ: ROOM_D / 2 }, // left
  { minX: ROOM_W / 2, maxX: ROOM_W / 2 + WALL_T, minZ: -ROOM_D / 2, maxZ: ROOM_D / 2 },   // right
  { minX: -ROOM_W / 2, maxX: ROOM_W / 2, minZ: -ROOM_D / 2 - WALL_T, maxZ: -ROOM_D / 2 }, // far (window wall)
  { minX: -ROOM_W / 2, maxX: ROOM_W / 2, minZ: ROOM_D / 2, maxZ: ROOM_D / 2 + WALL_T },   // near (entry)
]

// Bed pos [-0.6,0,0.3] rot.y 0.12 — props.jsx's own FOOTPRINTS.bed half
// extents (0.65, 1).
const BED_EXT = rotatedHalfExtentsRad(0.65, 1, 0.12)
const BED_RECT = rectXZ(-0.6, 0.3, BED_EXT.hx, BED_EXT.hz, 0.7)

// PulledChair: group [0.15,0,0.55] rot.y -0.3 — seat 0.42x0.42 plus the back
// panel sticking out to local z=-0.19-0.03, giving a slightly deeper local
// footprint (hx 0.21, hz 0.24) than the bare seat alone.
const CHAIR_EXT = rotatedHalfExtentsRad(0.21, 0.24, -0.3)
const CHAIR_RECT = rectXZ(0.15, 0.55, CHAIR_EXT.hx, CHAIR_EXT.hz, 0.76)

// Desk-side table: pos [0.75,0,-1.3] rot.y -0.08, w=0.55 d=0.42.
const DESK_EXT = rotatedHalfExtentsRad(0.275, 0.21, -0.08)
const DESK_RECT = rectXZ(0.75, -1.3, DESK_EXT.hx, DESK_EXT.hz, 0.6)

// ShadowDesk: group [-1.55,0,1.75] rot.y 0.5, Table w=0.7 d=0.45 at local
// origin — world position is the group's own position.
const SHADOW_DESK_EXT = rotatedHalfExtentsRad(0.35, 0.225, 0.5)
const SHADOW_DESK_RECT = rectXZ(-1.55, 1.75, SHADOW_DESK_EXT.hx, SHADOW_DESK_EXT.hz, 0.62)

const ROOM_ID = 'bespoke:amadeus'

function AmadeusColliders({ spawn }) {
  useEffect(() => {
    registerColliders(ROOM_ID, [
      ...AMADEUS_SHELL_RECTS, BED_RECT, CHAIR_RECT, DESK_RECT, SHADOW_DESK_RECT,
    ])
    setBounds(ROOM_ID, {
      kind: 'rect',
      minX: -ROOM_W / 2 + 0.1, maxX: ROOM_W / 2 - 0.1,
      minZ: -ROOM_D / 2 + 0.1, maxZ: ROOM_D / 2 - 0.1,
    })
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
  }, [spawn])
  return null
}

/* -------------------------------------------------------------------- ink */

// Growth state lives on refs, not React state — every tick would otherwise
// re-render the whole room. `stage` textures are regenerated periodically
// (never every frame; a canvas redraw is not free) using a FIXED seed per
// surface, so more marks are always a superset of fewer marks — growth, not
// random re-scatter, same trick the caption typewriter elsewhere uses.
const PAGE_SEED = 71
const WALL_SEEDS = [812, 933]
const PAGE_MAX = 46
const WALL_MAX = 34
const GROW_SECONDS = 55        // how long until the page + both walls are full
const WALL_START_FRAC = 0.35   // walls don't start until the page is this full

// Wave T: touch acceleration. Each surface (page + 2 walls) gets its own
// "extra" accumulator that only advances while that surface's own boost
// window is open (4s), added on top of the shared base clock (tRef) that
// still gates when walls start per the brief's original pacing — so
// touching one surface visibly races IT ahead without disturbing the
// others' normal rate.
const BOOST_MULT = 4
const BOOST_MS = 4000

function InkSurfaces({ boostApiRef }) {
  const pageBase = useMemo(() => makePageBaseTexture(), [])
  const pageMeshRef = useRef()
  const wallMeshRefs = [useRef(), useRef()]
  const lastCountsRef = useRef([-1, -1, -1])
  const tRef = useRef(0)
  const boostUntil = useRef([0, 0, 0]) // [page, wall0, wall1]
  const extra = useRef([0, 0, 0])

  useEffect(() => {
    boostApiRef.current = (which) => {
      boostUntil.current[which] = performance.now() + BOOST_MS
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info('[amadeus] ink boosted on surface %d', which)
      }
    }
    return () => { boostApiRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((_, dt) => {
    tRef.current += dt
    const now = performance.now()
    for (let i = 0; i < 3; i++) {
      if (now < boostUntil.current[i]) extra.current[i] += dt * (BOOST_MULT - 1)
    }
    const growth = Math.min(1, tRef.current / GROW_SECONDS)
    const pageGrowth = Math.min(1, (tRef.current + extra.current[0]) / GROW_SECONDS)

    const pageCount = Math.floor(pageGrowth * PAGE_MAX)
    if (pageCount !== lastCountsRef.current[0] && pageMeshRef.current) {
      lastCountsRef.current[0] = pageCount
      const tex = makeInkTexture(PAGE_SEED, pageCount, 480, 620, '#241a10', 0.35)
      const mat = pageMeshRef.current.material
      if (mat.map) mat.map.dispose()
      mat.map = tex
      mat.needsUpdate = true
    }

    wallMeshRefs.forEach((ref, i) => {
      const wallGrowth = Math.max(0, (growth - WALL_START_FRAC) / (1 - WALL_START_FRAC) + extra.current[i + 1] / GROW_SECONDS)
      const count = Math.floor(Math.min(1, wallGrowth) * WALL_MAX)
      if (count !== lastCountsRef.current[i + 1] && ref.current) {
        lastCountsRef.current[i + 1] = count
        const tex = makeInkTexture(WALL_SEEDS[i], count, 512, 640, '#e8dcc0', 0.22)
        const mat = ref.current.material
        if (mat.map) mat.map.dispose()
        mat.map = tex
        mat.needsUpdate = true
      }
    })
  })

  return (
    <group>
      {/* the page, propped on the desk-side table — pressable: ink races
          ahead on this surface alone for ~4s */}
      <Touchable reach={5} foley="paper" anchor={[0.75, 0.615, -1.3]} onUse={() => boostApiRef.current && boostApiRef.current(0)}>
        <mesh ref={pageMeshRef} position={[0.75, 0.615, -1.3]} rotation={[-Math.PI / 2, 0, -0.08]}>
          <planeGeometry args={[0.42, 0.55]} />
          <meshBasicMaterial map={pageBase} toneMapped={false} />
        </mesh>
      </Touchable>
      {/* two walls the ink spreads onto once the page is filling in — each
          independently pressable once it's grown enough to be worth
          touching */}
      <Touchable reach={5} foley="paper" anchor={[-ROOM_W / 2 + 0.01, 1.5, -0.4]} onUse={() => boostApiRef.current && boostApiRef.current(1)}>
        <mesh ref={wallMeshRefs[0]} position={[-ROOM_W / 2 + 0.01, 1.5, -0.4]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[ROOM_D * 0.7, 2]} />
          <meshBasicMaterial transparent opacity={0} toneMapped={false} />
        </mesh>
      </Touchable>
      <Touchable reach={5} foley="paper" anchor={[0.4, 1.5, -ROOM_D / 2 + 0.01]} onUse={() => boostApiRef.current && boostApiRef.current(2)}>
        <mesh ref={wallMeshRefs[1]} position={[0.4, 1.5, -ROOM_D / 2 + 0.01]}>
          <planeGeometry args={[ROOM_W * 0.7, 2]} />
          <meshBasicMaterial transparent opacity={0} toneMapped={false} />
        </mesh>
      </Touchable>
    </group>
  )
}

/* ---------------------------------------------------------------- ripple */

// The laugh, rendered as physics: a traveling bulge crossing a wall's own
// surface at long intervals, built by displacing a subdivided plane's
// vertices along its local Z rather than any shader — cheap at this vertex
// count, and it never touches audio (kit.js owns the room's actual sound).
function RippleWall({ pos, rot, w, h, mat }) {
  const geo = useMemo(() => new THREE.PlaneGeometry(w, h, 28, 1), [w, h])
  const baseZ = useMemo(() => {
    const arr = geo.attributes.position.array
    const out = new Float32Array(arr.length / 3)
    for (let i = 0; i < out.length; i++) out[i] = arr[i * 3 + 2]
    return out
  }, [geo])
  const stateRef = useRef({ active: false, start: 0 })
  const nextAtRef = useRef(8 + Math.random() * 6)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!stateRef.current.active && t > nextAtRef.current) {
      stateRef.current = { active: true, start: t }
    }
    const pos3 = geo.attributes.position
    if (stateRef.current.active) {
      const elapsed = t - stateRef.current.start
      const dur = 1.4
      const front = elapsed / dur
      for (let i = 0; i < pos3.count; i++) {
        const x = pos3.getX(i)
        const u = x / w + 0.5
        const d = u - front
        const bump = Math.exp(-d * d * 50) * 0.07
        pos3.setZ(i, baseZ[i] + bump)
      }
      pos3.needsUpdate = true
      if (elapsed > dur + 0.2) {
        stateRef.current = { active: false, start: 0 }
        nextAtRef.current = t + 24 + Math.random() * 10
        for (let i = 0; i < pos3.count; i++) pos3.setZ(i, baseZ[i])
        pos3.needsUpdate = true
      }
    }
  })

  return (
    <mesh geometry={geo} position={pos} rotation={rot}>
      <primitive object={mat} attach="material" />
    </mesh>
  )
}

/* --------------------------------------------------------------- chamber */

function Chamber({ grade }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <primitive object={floorMat} attach="material" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <primitive object={ceilingMat} attach="material" />
      </mesh>
      {/* the ripple-capable walls: left side + far wall */}
      <RippleWall pos={[-ROOM_W / 2, 1.5, -0.4]} rot={[0, Math.PI / 2, 0]} w={ROOM_D * 0.7} h={2} mat={wallMat} />
      <RippleWall pos={[0.4, 1.5, -ROOM_D / 2]} rot={[0, 0, 0]} w={ROOM_W * 0.7} h={2} mat={wallMatB} />
      {/* right wall, plain */}
      <mesh position={[ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <primitive object={wallMat} attach="material" />
      </mesh>
      {/* the cold window, far wall, blue counter-light source */}
      <mesh position={[1.55, 1.7, -ROOM_D / 2 + 0.015]}>
        <planeGeometry args={[0.7, 0.9]} />
        <meshStandardMaterial color="#3a5a72" emissive="#3a6a88" emissiveIntensity={0.35} roughness={0.3} />
      </mesh>
      {/* mullion cross sells the window as a built opening, not a decal */}
      <mesh position={[1.55, 1.7, -ROOM_D / 2 + 0.028]}>
        <boxGeometry args={[0.7, 0.05, 0.02]} />
        <meshStandardMaterial color="#100a05" roughness={0.7} />
      </mesh>
      <mesh position={[1.55, 1.7, -ROOM_D / 2 + 0.028]}>
        <boxGeometry args={[0.05, 0.9, 0.02]} />
        <meshStandardMaterial color="#100a05" roughness={0.7} />
      </mesh>
      {/* +Z wall behind entry camera */}
      <mesh position={[0, ROOM_H / 2, ROOM_D / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <primitive object={wallMatEntry} attach="material" />
      </mesh>
      {/* baseboard trim, perimeter */}
      <Trim pos={[0, 0.045, -ROOM_D / 2 + 0.001]} wallLength={ROOM_W} along="x" color="#0e0a05" />
      <Trim pos={[0, 0.045, ROOM_D / 2 - 0.001]} wallLength={ROOM_W} along="x" color="#0e0a05" />
      <Trim pos={[-ROOM_W / 2 + 0.001, 0.045, 0]} wallLength={ROOM_D} along="z" color="#0e0a05" />
      <Trim pos={[ROOM_W / 2 - 0.001, 0.045, 0]} wallLength={ROOM_D} along="z" color="#0e0a05" />
    </group>
  )
}

// Heavy drape: five narrower panels rather than two wide flat planes, each
// canted a few degrees off true so the run reads as folded fabric hanging in
// gathers instead of a single pressed sheet.
const DRAPE_X = [-1.55, -1.28, -0.98, -0.7, -0.42]
function DrapePanels() {
  return (
    <group>
      {DRAPE_X.map((x, i) => (
        <mesh key={i} position={[x, 1.5, -ROOM_D / 2 + 0.06 + (i % 2) * 0.025]} rotation={[0, (i % 2 ? 1 : -1) * 0.09, 0]}>
          <planeGeometry args={[0.3, 2.15]} />
          <primitive object={drapeMat} attach="material" />
        </mesh>
      ))}
    </group>
  )
}

// A chair pulled in close to the bed — the visitor's own seat, bevelled
// rather than sharp stock, matte wood surface with real grain.
function PulledChair() {
  return (
    <group position={[0.15, 0, 0.55]} rotation={[0, -0.3, 0]}>
      <Bevel pos={[0, 0.46, 0]} w={0.42} h={0.06} d={0.42} radius={0.015} mat={chairMat} />
      <Bevel pos={[0, 0.76, -0.19]} w={0.42} h={0.6} d={0.06} radius={0.015} mat={chairMat} />
      {[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.23, z]}>
          <boxGeometry args={[0.04, 0.46, 0.04]} />
          <meshStandardMaterial color="#1c140c" roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

// A bevelled writing desk with real wood-grain material — used for both the
// page desk and the corner shadow desk, in place of props.jsx's flat-colored
// generic table, per the brief's "matte ink-page surfaces" desk furniture.
function WoodDesk({ pos, rot, w = 0.55, d = 0.42, h = 0.6 }) {
  return (
    <group position={pos} rotation={rot}>
      <Bevel pos={[0, h - 0.03, 0]} w={w} h={0.06} d={d} radius={0.012} mat={deskMat} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (w / 2 - 0.05), (h - 0.06) / 2, sz * (d / 2 - 0.05)]}>
          <boxGeometry args={[0.045, h - 0.06, 0.045]} />
          <primitive object={deskMat} attach="material" />
        </mesh>
      ))}
    </group>
  )
}

// A folded quilt laid over the bed's own flat linen box: a subdivided plane
// with sine-wave Z displacement baked once into the geometry, so the heavy
// fabric material actually reads as fold ridges under grazing candlelight
// rather than a flat painted sheet.
function QuiltFold({ pos, rot }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1.18, 0.85, 14, 10)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i)
      const fold = Math.sin(x * 9) * 0.014 + Math.sin(y * 5 + x * 2) * 0.01
      p.setZ(i, fold)
    }
    g.computeVertexNormals()
    return g
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <mesh position={pos} rotation={[-Math.PI / 2, 0, rot[1]]} geometry={geo}>
      <primitive object={quiltMat} attach="material" />
    </mesh>
  )
}

// The lit-exclusion desk: a corner desk the candlelight never reaches — no
// light source is placed anywhere near it, and it sits far enough from both
// candle practicals (distance-decayed point lights) that it stays genuinely
// dim rather than merely dark-colored.
function ShadowDesk() {
  return (
    <group position={[-1.55, 0, 1.75]} rotation={[0, 0.5, 0]}>
      <WoodDesk pos={[0, 0, 0]} w={0.7} d={0.45} h={0.62} />
    </group>
  )
}

// A real candle: wax body + a small brass saucer holder under the flame, so
// the light source reads as an object rather than a bare glowing sphere
// (spec's "no floating props"). Only the flame tip carries emissive.
function CandleFlame({ pos }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.intensity = (0.85 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23.7) * 0.05) * 9
  })
  return (
    <group position={pos}>
      <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.055, 0.012, 16]} />
        <primitive object={holderMat} attach="material" />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.016, 0.018, 0.1, 10]} />
        <primitive object={waxMat} attach="material" />
      </mesh>
      <mesh position={[0, 0.105, 0]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial color="#ffcf8a" emissive="#ffcf8a" emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
      <pointLight ref={ref} position={[0, 0.1, 0]} color="#ffb060" intensity={8} distance={3.2} decay={2} />
    </group>
  )
}

/* ------------------------------------------------------------ score/take */

function InkScorePlaque({ score }) {
  const tex = useMemo(() => makeInkScoreTexture(score), [score])
  return (
    <mesh position={[0.75, 1.55, -ROOM_D / 2 + 0.02]}>
      <planeGeometry args={[0.5, 0.5]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

function MarginTake({ film }) {
  const tex = useMemo(() => makeMarginTakeTexture(film.hot_take), [film.slug, film.hot_take])
  // propped against the page, angled into its own "margin" rather than
  // centered — small, per the brief.
  return (
    <mesh position={[1.1, 0.66, -1.15]} rotation={[-Math.PI / 2, 0, -0.08]}>
      <planeGeometry args={[0.3, 0.55]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ doors */

// Bloodline doors (brief §6): the wall beside the window, clear of the
// drapes, the desk, and the entry sightline toward the bed.
const DOOR_MOUNT = { position: [ROOM_W / 2 - 0.05, 0.8, 0.6], rotationY: -Math.PI / 2, spacing: 0.9, scale: 0.72 }

/* ------------------------------------------------------------------ room */

export default function Amadeus({ film, config, doors = [], onDoor }) {
  const { grade } = config
  const boostApiRef = useRef(null)

  useRoomAudio(startAmadeusAudio)

  return (
    <group>
      <AmadeusColliders spawn={config.camera?.pos} />
      <fogExp2 attach="fog" args={[grade.bg || '#180f08', 0.05]} />
      <ambientLight intensity={grade.ambient ?? 0.08} />
      <pointLight position={[1.55, 2, -ROOM_D / 2 + 0.3]} intensity={4} color="#3a6a88" distance={3} decay={2} />
      {/* bounce fills: without these the right wall and far ceiling plane
          fall to pure black rather than merely dark — the doctrine's "corners
          die to black, whole planes do not" */}
      <pointLight position={[ROOM_W / 2 - 0.5, 1.3, 0.4]} intensity={0.9} color="#5a3a1c" distance={3.4} decay={2} />
      <pointLight position={[0.2, 0.5, 0.9]} intensity={0.6} color="#4a2c14" distance={3} decay={2} />

      <Chamber grade={grade} />
      <DrapePanels />
      <Bed pos={[-0.6, 0, 0.3]} rot={[0, 0.12, 0]} color="#6a5a48" frame="#2c2014" />
      <QuiltFold pos={[-0.6, 0.505, 0.5]} rot={[0, 0.12, 0]} />
      <PulledChair />
      <WoodDesk pos={[0.75, 0, -1.3]} rot={[0, -0.08, 0]} w={0.55} d={0.42} h={0.6} />
      <ShadowDesk />
      <CandleFlame pos={[0.75, 0.62, -1.05]} />
      <CandleFlame pos={[-0.75, 0.72, 0.15]} />

      <InkSurfaces boostApiRef={boostApiRef} />
      <InkScorePlaque score={film.score} />
      <MarginTake film={film} />

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
