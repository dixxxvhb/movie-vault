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

/* -------------------------------------------------------------- facade */

function BankFacade({ grade }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 512
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#c8b898'
    ctx.fillRect(0, 0, 512, 512)
    let s = 331
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    ctx.globalAlpha = 0.05
    for (let i = 0; i < 2200; i++) {
      ctx.fillStyle = r() > 0.5 ? '#fff' : '#000'
      ctx.fillRect(r() * 512, r() * 512, 1.6, 1.6)
    }
    ctx.globalAlpha = 1
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])

  const windows = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
    x: -3.6 + i * 1.44,
    y: 2.4,
  })), [])

  return (
    <group>
      <mesh position={[0, 2.6, -4.3]}>
        <boxGeometry args={[10, 5.2, 0.3]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
      {/* columns — a bank facade's own vocabulary, no signage, no badging */}
      {[-4.2, -1.4, 1.4, 4.2].map((x, i) => (
        <mesh key={i} position={[x, 1.9, -4.1]}>
          <boxGeometry args={[0.42, 3.8, 0.42]} />
          <meshStandardMaterial color="#d8cca8" roughness={0.7} />
        </mesh>
      ))}
      {windows.map((w, i) => (
        <mesh key={i} position={[w.x, w.y, -4.14]}>
          <planeGeometry args={[0.9, 1.3]} />
          <meshStandardMaterial color="#20242a" emissive={grade.key || '#f0c860'} emissiveIntensity={0.06} roughness={0.2} metalness={0.2} />
        </mesh>
      ))}
      {/* the awning-height shadow line, sunny-grade Atlanta rather than a shop sign */}
      <mesh position={[0, 4.6, -4.14]}>
        <planeGeometry args={[9.6, 0.5]} />
        <meshStandardMaterial color="#8a7a5a" roughness={0.85} />
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

  useFrame(() => {
    const b = beatRef.current
    const fracBar = clamp01((b.beat + b.phase) / 4)
    const wipeAmp = 0.62 * decay(fracBar, 3)
    if (wiperL.current) wiperL.current.rotation.z = wipeAmp
    if (wiperR.current) wiperR.current.rotation.z = -wipeAmp

    const brakeGlow = 0.4 + 2.6 * decay(fracBar, 4)
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
          around the car's silhouette from back there) */}
      <mesh ref={brakeL} position={[-W * 0.4, H * 0.36, -D * 0.49]}>
        <boxGeometry args={[0.22, 0.14, 0.04]} />
        <meshStandardMaterial color="#3a0808" emissive="#ff2020" emissiveIntensity={0.4} roughness={0.4} />
      </mesh>
      <mesh ref={brakeR} position={[W * 0.4, H * 0.36, -D * 0.49]}>
        <boxGeometry args={[0.22, 0.14, 0.04]} />
        <meshStandardMaterial color="#3a0808" emissive="#ff2020" emissiveIntensity={0.4} roughness={0.4} />
      </mesh>
      {/* wheels */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * W * 0.42, 0.14, sz * D * 0.36]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.16, 0.16, 0.15, 16]} />
          <meshStandardMaterial color="#111" roughness={0.8} />
        </mesh>
      ))}
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
      <mesh position={[-2.6, 2.1, -4.1]} rotation={[0, 0.15, 0]}>
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
      <mesh position={[-2.6, 1.55, -4.08]} rotation={[0, 0.15, 0]}>
        <planeGeometry args={[1.2, 0.3]} />
        {metaTex
          ? <meshBasicMaterial key="mapped" map={metaTex} transparent depthWrite={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" transparent opacity={0} />}
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ room */

export default function BabyDriver({ film, config, infoVisible = true }) {
  const { grade } = config
  const beatRef = useBeat(BPM)

  useRoomAudio(startBabyDriverAudio)

  return (
    <group>
      <fogExp2 attach="fog" args={[grade.fogColor || '#e8d8b0', 0.02]} />
      <pointLight position={[0, 3, 1]} intensity={(grade.keyIntensity ?? 1.4) * 18} color={grade.key || '#f0c860'} distance={16} decay={2} />
      <pointLight position={[0, 1.4, 3]} intensity={6} color={grade.fill || '#5a7a8a'} distance={10} decay={2} />

      {/* ground: sidewalk + street, sunny concrete */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 12]} />
        <meshStandardMaterial color="#8c8c86" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 2.2]} />
        <meshStandardMaterial color="#68656a" roughness={0.85} />
      </mesh>

      <BankFacade grade={grade} />
      <Car beatRef={beatRef} />
      <PaperScatter pos={[-1, 0, 0.4]} rot={[Math.PI / 2, 0, 0]} count={16} area={[2.4, 1.6]} color="#e8e0c8" />

      <Pedestrian beatRef={beatRef} laneZ={0.9} offset={0} color="#181410" />
      <Pedestrian beatRef={beatRef} laneZ={1.4} offset={0.5} color="#201a14" />

      <SyncBursts beatRef={beatRef} />

      <BabyDriverRecord film={film} beatRef={beatRef} infoVisible={infoVisible} />
    </group>
  )
}
