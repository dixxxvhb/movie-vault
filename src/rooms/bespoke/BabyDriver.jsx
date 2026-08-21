import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { paperScatter as PaperScatter } from '../props.jsx'
import { makeHotTakeTexture, makeScoreTexture, makeMetaTexture } from '../infoTextures.js'
import { sheetOf } from '../../palette.js'
import { useRoomAudio } from '../audio/engine.js'
import { start as startBabyDriverAudio } from '../audio/recipes/baby-driver.js'
import { useBeat } from '../audio/clock.js'
import DoorRow from '../DoorRow.jsx'
import { registerColliders, setBounds, clearOwner, resolveStep } from '../colliders.js'
import Touchable from '../Touchable.jsx'
import { playOneShot } from '../audio/engine.js'
import { standardMat } from '../materials.js'
import { Bevel, Scuff, crumpledPaper } from '../detail.jsx'
import { makeWordTexture, makeCrosswalkBarTexture } from './babyDriverTextures.js'

// 8.4 — "the opening, on beat." The room that proves the audio system: a
// shared beat clock (audio/clock.js's useBeat, rAF math only) drives BOTH
// the ~110bpm groove in audio/recipes/baby-driver.js AND every bit of motion
// here, so muted visuals still read the tempo. Nothing in this room is
// interesting standing still — the brief's own thesis, staged literally.
const BPM = 110
const CAR_POS = [1.5, 0, -1.7]
const CAR_ROT = 0.08

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const decay = (frac, k = 3) => Math.pow(clamp01(1 - frac), k)

// Bloodline doors (brief §6): "the far end of the bank facade." The facade
// runs columns at x = -4.2/-1.4/1.4/4.2 (BankFacade below) — past the last
// one, toward the car's own far side, is clear wall with nothing on it.
// Baby Driver has no film_links today (its hot take is about verbs, not
// bloodlines), so this mount renders zero doors for now; it's here so a
// later link touching this slug has somewhere to go without another pass.
const DOOR_MOUNT = { position: [4.6, 0, -4.0], rotationY: 0, spacing: 0.9 }

/* ------------------------------------------------------------- colliders */
// Wave M3: contract #3 — "the car (vehicleMass) and bank facade block;
// bounds = the curbside area, no wandering into the far street void."
function rotatedHalfExtentsRad(hx, hz, rotY) {
  const c = Math.abs(Math.cos(rotY)), s = Math.abs(Math.sin(rotY))
  return { hx: hx * c + hz * s, hz: hx * s + hz * c }
}

// The car: CAR_POS/CAR_ROT, W=1.7 H=1.05 D=3.7 (Car's own local consts).
const CAR_EXT = rotatedHalfExtentsRad(0.85, 1.85, CAR_ROT)
const CAR_RECT = {
  minX: CAR_POS[0] - CAR_EXT.hx, maxX: CAR_POS[0] + CAR_EXT.hx,
  minZ: CAR_POS[2] - CAR_EXT.hz, maxZ: CAR_POS[2] + CAR_EXT.hz, top: 1.05,
}

// BankFacade's own wall box [10, 5.2, 0.3] at z=-4.3, widened on Z to also
// cover the four columns standing 0.2m proud of it at z=-4.1.
const FACADE_RECT = { minX: -5, maxX: 5, minZ: -4.65, maxZ: -3.95, top: 5.2 }

const ROOM_ID = 'bespoke:baby-driver'

function BabyDriverColliders({ spawn }) {
  useEffect(() => {
    registerColliders(ROOM_ID, [CAR_RECT, FACADE_RECT])
    // The curbside area only — the sidewalk/street plane runs to x=±8, far
    // wider than the staged scene; bounds keeps the walker on the block the
    // room is actually composed around, not out into the empty street.
    setBounds(ROOM_ID, { kind: 'rect', minX: -5.5, maxX: 5.5, minZ: -4.0, maxZ: 5.5 })
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

/* -------------------------------------------------------------- facade */

const facadeMat = standardMat({ kind: 'concrete', tint: '#e8dcc0', wear: 0.3, scale: 2.2, repeat: [5, 3] })
const columnMat = standardMat({ kind: 'concrete', tint: '#f0e6cc', wear: 0.2, scale: 1.4 })
const signBandMat = standardMat({ kind: 'flat', tint: '#3a3226', wear: 0.15 })
const sidewalkMat = standardMat({ kind: 'concrete', tint: '#c9c9c0', wear: 0.35, scale: 1.8, repeat: [6, 5] })
const streetMat = standardMat({ kind: 'asphalt', tint: '#a8a6a0', wear: 0.5, scale: 1.4, repeat: [7, 1] })

function BankFacade({ grade }) {
  // OUR OWN generic bank name — invented, never the film's own signage —
  // per the fidelity contract.
  const signTex = useMemo(() => makeWordTexture('ATLANTA TRUST', { w: 1400, h: 200, color: '#e8dcc0' }), [])

  const windows = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
    x: -3.6 + i * 1.44,
    y: 2.15,
  })), [])

  return (
    <group>
      <mesh position={[0, 2.6, -4.3]} receiveShadow>
        <boxGeometry args={[10, 5.2, 0.3]} />
        <primitive object={facadeMat} attach="material" />
      </mesh>
      {/* columns — a bank facade's own vocabulary, no signage, no badging.
          Beveled bodies + a capital/base ring so they read as architecture
          rather than extruded stock. */}
      {[-4.2, -1.4, 1.4, 4.2].map((x, i) => (
        <group key={i} position={[x, 0, -4.1]}>
          <Bevel pos={[0, 1.9, 0]} w={0.42} h={3.8} d={0.42} radius={0.025} mat={columnMat} castShadow />
          <mesh position={[0, 3.78, 0]}>
            <boxGeometry args={[0.52, 0.14, 0.52]} />
            <primitive object={columnMat} attach="material" />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.5, 0.12, 0.5]} />
            <primitive object={columnMat} attach="material" />
          </mesh>
        </group>
      ))}
      {windows.map((w, i) => (
        <group key={i} position={[w.x, w.y, -4.14]}>
          {/* window frame, set back so its near face clears the glass plane
              in front of it (QA fix: a 0.05-deep box centered at -0.01 was
              poking its near face out to +0.015 — IN FRONT of the glass at
              0 — and won the depth test outright, hiding the glass behind
              a flat dark frame every time) */}
          <mesh position={[0, 0, -0.04]}>
            <boxGeometry args={[1.0, 1.42, 0.05]} />
            <meshStandardMaterial color="#3a3226" roughness={0.7} />
          </mesh>
          {/* the glass itself: no environment map in this room (the
              fidelity contract's zero-imported-assets rule extends to
              reflection probes), so meshPhysicalMaterial transmission
              renders pure black with nothing to refract — a bright,
              glare-blown daylight pane with a hard specular kick reads as
              glass here instead, the same device the original stand-in
              used, just brighter and glossier. */}
          <mesh>
            <planeGeometry args={[0.88, 1.28]} />
            <meshBasicMaterial color="#bfe0ee" toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          {/* a muntin cross, generic storefront glazing */}
          <mesh position={[0, 0, 0.01]}>
            <boxGeometry args={[0.02, 1.28, 0.01]} />
            <meshStandardMaterial color="#3a3226" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <boxGeometry args={[0.88, 0.02, 0.01]} />
            <meshStandardMaterial color="#3a3226" roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* the sign band — our own generic lettering, cut-metal-on-stone feel */}
      <mesh position={[0, 3.62, -4.13]}>
        <boxGeometry args={[9.2, 0.62, 0.06]} />
        <primitive object={signBandMat} attach="material" />
      </mesh>
      <mesh position={[0, 3.62, -4.09]}>
        <planeGeometry args={[6.2, 0.4]} />
        <meshBasicMaterial map={signTex} transparent toneMapped={false} />
      </mesh>
      {/* the awning-height shadow line, sunny-grade Atlanta rather than a shop sign */}
      <mesh position={[0, 4.6, -4.14]}>
        <planeGeometry args={[9.6, 0.5]} />
        <meshStandardMaterial color="#c8b088" roughness={0.8} />
      </mesh>
      {/* weathering: a couple of authored scuffs low on the facade where
          foot traffic and delivery carts actually scrape stone */}
      <Scuff pos={[-3.0, 0.35, -4.13]} w={0.7} h={0.4} seed={41} opacity={0.5} />
      <Scuff pos={[2.6, 0.3, -4.13]} w={0.6} h={0.35} seed={57} opacity={0.4} />
    </group>
  )
}

/* ------------------------------------------------------------------ sky */

// QA fix: this room had NO sky/backdrop of its own, so the visible far
// background was whatever App-level `<color>` the scene falls back to —
// this film's own dark card-front palette (bg:'#160D0D'), which is what was
// actually reading as "dim night-amber" rather than any single light being
// too weak. A proper bright daytime sky dome + sun disc (same device as
// Departed's, tuned warm-blue instead of golden-hour) fixes the backdrop
// directly instead of only cranking lights against a black horizon.
function DaySky() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 2; c.height = 512
    const ctx = c.getContext('2d')
    const g = ctx.createLinearGradient(0, 0, 0, 512)
    g.addColorStop(0, '#5fa8d8')
    g.addColorStop(0.55, '#bfe0ee')
    g.addColorStop(1, '#eef2e0')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 2, 512)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return (
    <group>
      <mesh position={[0, 0, -20]}>
        <sphereGeometry args={[60, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
        <meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} />
      </mesh>
      <mesh position={[-8, 7, -28]}>
        <circleGeometry args={[2.6, 24]} />
        <meshBasicMaterial color="#fff8e0" transparent opacity={0.95} fog={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ car */

// "build your own rounded-box car, zero badging" — per the spec, verbatim.
// Front faces -Z (toward the camera/facade axis this room is composed on).
function Car({ beatRef }) {
  const wiperL = useRef()
  const wiperR = useRef()
  const brakeL = useRef()
  const brakeR = useRef()

  const W = 1.7, H = 1.05, D = 3.7

  // Wave T: press the brake -> a flash lands ON the next downbeat, never
  // immediately. `armed` just marks intent; the actual flash + the
  // beat-quantized `thunk` only fire once beatRef itself crosses a fresh
  // bar-zero, read here in the room's own beat-driven useFrame rather than
  // on any wall-clock timer, so it can never land off-grid.
  const armedRef = useRef(false)
  const armedAtBarRef = useRef(-1)
  const flashUntilRef = useRef(0)
  const handleBrakePress = () => {
    armedRef.current = true
    armedAtBarRef.current = beatRef.current.bar
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info('[baby-driver] brake armed — flashing on the next downbeat')
    }
  }

  useFrame(() => {
    const b = beatRef.current
    const fracBar = clamp01((b.beat + b.phase) / 4)
    const wipeAmp = 0.62 * decay(fracBar, 3)
    if (wiperL.current) wiperL.current.rotation.z = wipeAmp
    if (wiperR.current) wiperR.current.rotation.z = -wipeAmp

    // downbeat = beat 0 of a bar strictly after the one the press landed
    // in — guards the "never immediately" rule even if the press itself
    // happens to land right on beat 0.
    if (armedRef.current && b.beat === 0 && b.bar > armedAtBarRef.current) {
      armedRef.current = false
      flashUntilRef.current = performance.now() + 260
      playOneShot('thunk')
    }

    const flashOn = performance.now() < flashUntilRef.current
    const brakeGlow = (flashOn ? 5 : 0) + 0.4 + 2.6 * decay(fracBar, 4)
    if (brakeL.current) brakeL.current.material.emissiveIntensity = brakeGlow
    if (brakeR.current) brakeR.current.material.emissiveIntensity = brakeGlow
  })

  return (
    <group position={CAR_POS} rotation={[0, CAR_ROT, 0]}>
      <RoundedBox args={[W, H * 0.55, D]} radius={0.09} smoothness={4} position={[0, H * 0.32, 0]}>
        <meshStandardMaterial color="#c81818" roughness={0.28} metalness={0.35} />
      </RoundedBox>
      <RoundedBox args={[W * 0.84, H * 0.42, D * 0.48]} radius={0.1} smoothness={4} position={[0, H * 0.62, -D * 0.06]}>
        <meshStandardMaterial color="#a01414" roughness={0.22} metalness={0.3} />
      </RoundedBox>
      {/* windshield — QA pass: mounted on the +Z end (facing this room's one
          camera station) rather than -Z, since the wipers are the more
          important beat-tell to have visible from the entry view and a
          RoundedBox is opaque — whichever end faces away from the camera is
          permanently occluded from a single fixed station. */}
      <mesh position={[0, H * 0.66, D * 0.28]} rotation={[0.35, 0, 0]}>
        <planeGeometry args={[W * 0.7, 0.42]} />
        <meshStandardMaterial color="#9fc0cc" transparent opacity={0.55} roughness={0.1} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      {/* wipers: pivoted at the windshield's base, sweeping in its own plane */}
      <group ref={wiperL} position={[-W * 0.22, H * 0.5, D * 0.16]} rotation={[0.35, 0, 0]}>
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[0.02, 0.32, 0.015]} />
          <meshStandardMaterial color="#111" roughness={0.5} />
        </mesh>
      </group>
      <group ref={wiperR} position={[W * 0.22, H * 0.5, D * 0.16]} rotation={[0.35, 0, 0]}>
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[0.02, 0.32, 0.015]} />
          <meshStandardMaterial color="#111" roughness={0.5} />
        </mesh>
      </group>
      {/* brake lights, rear = -Z (away from camera; the glow still blooms
          around the car's silhouette from back there) — Wave T: pressable,
          the rear of the vehicle mass */}
      <Touchable reach={9} noDip anchor={[0, H * 0.36, -D * 0.49]} onUse={handleBrakePress}>
        <mesh ref={brakeL} position={[-W * 0.4, H * 0.36, -D * 0.49]}>
          <boxGeometry args={[0.22, 0.14, 0.04]} />
          <meshStandardMaterial color="#3a0808" emissive="#ff2020" emissiveIntensity={0.4} roughness={0.4} />
        </mesh>
        <mesh ref={brakeR} position={[W * 0.4, H * 0.36, -D * 0.49]}>
          <boxGeometry args={[0.22, 0.14, 0.04]} />
          <meshStandardMaterial color="#3a0808" emissive="#ff2020" emissiveIntensity={0.4} roughness={0.4} />
        </mesh>
        {/* invisible sensor spanning the rear bumper — the two small brake
            boxes alone are a thin click target */}
        <mesh position={[0, H * 0.36, -D * 0.49]}>
          <boxGeometry args={[W, H * 0.7, 0.4]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </Touchable>
      {/* wheels, each in its own wheel well — a dark arch trim standing
          proud of the body just above the tire so the silhouette reads as
          "fender cut", not a wheel bolted to a flat slab */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <group key={i} position={[sx * W * 0.42, 0.14, sz * D * 0.36]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.16, 0.16, 0.15, 16]} />
            <meshStandardMaterial color="#111" roughness={0.8} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.185, 0.02, 6, 16, Math.PI]} />
            <meshStandardMaterial color="#1c0808" roughness={0.6} metalness={0.1} />
          </mesh>
        </group>
      ))}
      {/* panel gap seams — hood/cabin and cabin/trunk shut lines, thin dark
          strokes that read as real body panel breaks under a grazing sun */}
      <mesh position={[0, H * 0.58, D * 0.16]}>
        <boxGeometry args={[W * 0.86, 0.006, 0.006]} />
        <meshStandardMaterial color="#3a0808" roughness={0.5} />
      </mesh>
      <mesh position={[0, H * 0.58, -D * 0.18]}>
        <boxGeometry args={[W * 0.86, 0.006, 0.006]} />
        <meshStandardMaterial color="#3a0808" roughness={0.5} />
      </mesh>
      {/* brake-light housings — a beveled black frame the lamps sit inside,
          instead of the lamp plane floating directly on the bumper */}
      <RoundedBox args={[0.28, 0.2, 0.03]} radius={0.015} smoothness={2} position={[-W * 0.4, H * 0.36, -D * 0.495]}>
        <meshStandardMaterial color="#0c0c0c" roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[0.28, 0.2, 0.03]} radius={0.015} smoothness={2} position={[W * 0.4, H * 0.36, -D * 0.495]}>
        <meshStandardMaterial color="#0c0c0c" roughness={0.5} />
      </RoundedBox>
    </group>
  )
}

/* ---------------------------------------------------------- pedestrians */

// Cross on phrase boundaries: one full crossing every 8 bars (32 beats),
// matching the audio recipe's own 8-bar stab phrase.
const PHRASE_BEATS = 32

function Pedestrian({ beatRef, laneZ, offset, color }) {
  const ref = useRef()
  useFrame(() => {
    const b = beatRef.current
    const globalBeat = b.bar * 4 + b.beat + b.phase
    const phraseFrac = ((globalBeat / PHRASE_BEATS) + offset) % 1
    const x = -4 + 8 * phraseFrac
    if (ref.current) ref.current.position.set(x, 0, laneZ)
  })
  return (
    <group ref={ref}>
      <mesh position={[0, 0.45, 0]} scale={[1, 1, 1]}>
        <capsuleGeometry args={[0.14, 0.5, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------ particles */

// Bursts on syncopation: the same beat 1.5 / 3.5 "and" offsets the audio
// recipe's stabs land on (recipes/baby-driver.js's STAB_PATTERN timing).
function SyncBursts({ beatRef }) {
  const ref = useRef()
  const count = 18
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const seeds = useMemo(() => Array.from({ length: count }, () => ({
    a: Math.random() * Math.PI * 2,
    r: 0.4 + Math.random() * 0.5,
    y: 0.2 + Math.random() * 0.6,
  })), [])

  useFrame(() => {
    if (!ref.current) return
    const b = beatRef.current
    const pos = b.beat + b.phase
    const d1 = Math.abs(pos - 1.5)
    const d2 = Math.abs(pos - 3.5)
    const burst = Math.exp(-Math.min(d1, d2) * 11)
    const scale = 0.02 + burst * 0.09
    seeds.forEach((s, i) => {
      dummy.position.set(
        CAR_POS[0] + Math.cos(s.a) * s.r * (1 + burst * 0.6),
        s.y,
        CAR_POS[2] + Math.sin(s.a) * s.r * (1 + burst * 0.6) - 1.4
      )
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.material.opacity = 0.15 + burst * 0.75
  })

  return (
    <instancedMesh ref={ref} args={[null, null, count]} key={count}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#fff3c8" transparent opacity={0.2} toneMapped={false} />
    </instancedMesh>
  )
}

/* -------------------------------------------------------------- record */

function BabyDriverRecord({ film, beatRef, infoVisible }) {
  const palette = sheetOf(film.palette)
  const [hotTakeTex, setHotTakeTex] = useState(null)
  const [scoreTex, setScoreTex] = useState(null)
  const [metaTex, setMetaTex] = useState(null)
  const scoreGroup = useRef()

  useEffect(() => {
    let live = true
    const t = makeHotTakeTexture(film, palette)
    if (live) setHotTakeTex(t)
    return () => { live = false; t.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug])

  useEffect(() => {
    let live = true
    const t = makeScoreTexture(film, palette)
    if (live) setScoreTex(t)
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

  // "the score numeral pulses at kick drum" — kick lands on every beat in
  // recipes/baby-driver.js's groove (kit.js's beatKit), so this reads phase
  // directly rather than only beat 0, and pulses every beat in turn.
  useFrame(() => {
    if (!scoreGroup.current) return
    const b = beatRef.current
    const s = 1 + 0.22 * decay(b.phase, 3)
    scoreGroup.current.scale.setScalar(s)
  })

  if (!infoVisible) return null

  return (
    <group>
      {/* QA fix: these used to sit at z=-4.1/-4.08, a few cm in front of the
          bank facade's front face (z=-4.15) — fine face-on, but rotated 0.15
          rad on Y that near-coplanar gap put the FAR edge of each plane
          (half-width 0.65 -> a ~0.10 depth swing) physically behind the
          wall's front face. The facade won that depth test for the embedded
          slice, so a chunk of the verbatim hot take ("nouns. Big") rendered
          as simply gone — not a wrap/fit bug (infoTextures.js's own wrap
          draws the complete string every time; confirmed by re-rendering
          makeHotTakeTexture in isolation), a geometry-clipping bug local to
          this room's placement. Pulled both well clear of the wall and
          dropped the rotation so no viewing angle can reintroduce it. */}
      <mesh position={[-2.6, 2.1, -3.5]}>
        <planeGeometry args={[1.3, 0.82]} />
        {hotTakeTex
          ? <meshBasicMaterial key="mapped" map={hotTakeTex} toneMapped={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" color={palette.paper} toneMapped={false} />}
      </mesh>
      <group ref={scoreGroup} position={[2.3, 1.9, -2.6]}>
        <mesh>
          <planeGeometry args={[0.5, 0.5]} />
          {scoreTex
            ? <meshBasicMaterial key="mapped" map={scoreTex} transparent depthWrite={false} side={THREE.DoubleSide} />
            : <meshBasicMaterial key="blank" transparent opacity={0} />}
        </mesh>
      </group>
      <mesh position={[-2.6, 1.55, -3.5]}>
        <planeGeometry args={[1.2, 0.3]} />
        {metaTex
          ? <meshBasicMaterial key="mapped" map={metaTex} transparent depthWrite={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" transparent opacity={0} />}
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ room */

export default function BabyDriver({ film, config, infoVisible = true, doors = [], onDoor }) {
  const { grade } = config
  const beatRef = useBeat(BPM)
  const crosswalkTex = useMemo(() => makeCrosswalkBarTexture(19), [])

  useRoomAudio(startBabyDriverAudio)

  return (
    <group>
      <BabyDriverColliders spawn={config.camera?.pos} />
      {/* QA fix: grade.fogColor now carries a light sky-blue override from
          configs.js (was falling through to this component's own '#e8d8b0'
          fallback only when unset — but the film's dark card-front bg WAS
          set as fogColor by default, near-black, which is most of why this
          room read as dusk rather than the brief's sunny daylight). Density
          dropped too: outdoor daylight haze should barely tint the facade
          14m back, not fog it out like an interior. */}
      <fogExp2 attach="fog" args={[grade.fogColor || '#cfe8f2', 0.007]} />
      {/* FilmWorld already supplies an ambientLight from config.grade.ambient
          (configs.js's own baby-driver entry raises that to 0.55 for this
          fix) — no second hardcoded ambient here, same convention every
          other room follows. */}
      <pointLight position={[-6, 8, 2]} intensity={(grade.keyIntensity ?? 1.9) * 30} color={grade.key || '#ffe6b0'} distance={26} decay={1.8} />
      <pointLight position={[0, 1.4, 3]} intensity={10} color={grade.fill || '#bcdce8'} distance={12} decay={2} />

      <DaySky />

      {/* ground: sidewalk + street. materials.js concrete/asphalt surfaces
          instead of flat colors — the roughnessMap variance is what sells
          "sun-baked pavement" under this room's hard daylight key. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 12]} />
        <primitive object={sidewalkMat} attach="material" />
      </mesh>
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 2.2]} />
        <primitive object={streetMat} attach="material" />
      </mesh>
      {/* curb: a raised strip along both edges of the street */}
      <mesh position={[0, 0.05, -1.1]}>
        <boxGeometry args={[16, 0.1, 0.08]} />
        <meshStandardMaterial color="#d4d0c4" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.05, 1.1]}>
        <boxGeometry args={[16, 0.1, 0.08]} />
        <meshStandardMaterial color="#d4d0c4" roughness={0.75} />
      </mesh>
      {/* crosswalk, worn paint bars — clear of the car/facade action, off
          to the far side of the block */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-5.6 + i * 0.34, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.22, 2.0]} />
          <meshBasicMaterial map={crosswalkTex} transparent opacity={0.85} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}

      <BankFacade grade={grade} />
      <Car beatRef={beatRef} />
      <PaperScatter pos={[-1, 0, 0.4]} rot={[Math.PI / 2, 0, 0]} count={16} area={[2.4, 1.6]} color="#e8e0c8" />
      {/* street clutter: a couple of authored crumpled scraps near the
          curb, distinct from the loose paperScatter drift by the car */}
      {crumpledPaper({ pos: [-3.4, 0.03, 1.35], scale: 0.7, color: '#e8e0c8', seed: 71 })}
      {crumpledPaper({ pos: [3.9, 0.03, -1.3], scale: 0.55, color: '#d8ccae', seed: 83 })}

      <Pedestrian beatRef={beatRef} laneZ={0.9} offset={0} color="#181410" />
      <Pedestrian beatRef={beatRef} laneZ={1.4} offset={0.5} color="#201a14" />

      <SyncBursts beatRef={beatRef} />

      <BabyDriverRecord film={film} beatRef={beatRef} infoVisible={infoVisible} />

      <DoorRow
        doors={doors}
        position={DOOR_MOUNT.position}
        rotationY={DOOR_MOUNT.rotationY}
        spacing={DOOR_MOUNT.spacing}
        grade={grade}
        onDoor={onDoor}
      />
    </group>
  )
}
