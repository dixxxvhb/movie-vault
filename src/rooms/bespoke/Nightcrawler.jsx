import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useRoomAudio } from '../audio/engine.js'
import { start as startNightcrawlerAudio } from '../audio/recipes/nightcrawler.js'
import {
  makeNightSkyTexture, makeCityGridTexture, makeBrushTexture,
  makeCaptionTexture, makeOverlookPolaroidFront, makeOverlookPolaroidBack,
} from './nightcrawlerTextures.js'
import DoorRow from '../DoorRow.jsx'

// 9.4 — "the overlook." A Mulholland-style turnout: guardrail, dry brush,
// LA laid out as a sodium-orange grid to the horizon, clean digital night
// grade. The room's one system is the camcorder: a viewfinder frame that
// travels with the camera and always reframes whatever you're looking at —
// corner brackets, a pulsing REC dot, rule-of-thirds guides — and, inside
// that frame only, a spotlight lifts the exposure on whatever it covers (the
// brief's own thesis: the world reads better-lit as footage than as
// reality). The hot take types itself into the frame's lower-third caption,
// looping; the Olympics-judging correction ("9.6!", corrected to 4.6 — the
// verbatim record, nothing else invented) sits on the back of the one
// polaroid prop propped against the guardrail.
const GROUND_W = 40
const GROUND_D = 40
const RAIL_Z = -1.4
const RAIL_H = 0.9

/* --------------------------------------------------------------- overlook */

function Overlook({ grade }) {
  const skyTex = useMemo(
    () => makeNightSkyTexture(grade.fill || '#0a0d14', '#0e1420', '#02040a'),
    [grade.fill]
  )
  const gridTex = useMemo(() => makeCityGridTexture(), [])
  return (
    <group>
      {/* the turnout itself — bare dirt/gravel right at your feet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1]}>
        <planeGeometry args={[6, 4]} />
        <meshStandardMaterial color="#1c1a16" roughness={0.98} />
      </mesh>
      {/* the sodium grid, running away from the rail toward the horizon —
          the ground itself drops below the rail line the way a hillside
          overlook actually falls away */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.6, -GROUND_D / 2 - 2]}>
        <planeGeometry args={[GROUND_W, GROUND_D]} />
        <meshBasicMaterial map={gridTex} toneMapped={false} />
      </mesh>
      <mesh position={[0, -2, -30]}>
        <sphereGeometry args={[70, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
        <meshBasicMaterial map={skyTex} side={THREE.BackSide} fog={false} />
      </mesh>
    </group>
  )
}

function GuardRail() {
  return (
    <group position={[0, 0, RAIL_Z]}>
      <mesh position={[0, RAIL_H, 0]}>
        <boxGeometry args={[5.2, 0.06, 0.06]} />
        <meshStandardMaterial color="#2a2c30" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, RAIL_H * 0.5, 0]}>
        <boxGeometry args={[5.2, 0.05, 0.05]} />
        <meshStandardMaterial color="#26282c" roughness={0.6} metalness={0.4} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[(i - 2.5) * 1.0, RAIL_H / 2, 0]}>
          <boxGeometry args={[0.05, RAIL_H, 0.05]} />
          <meshStandardMaterial color="#1c1e20" roughness={0.65} metalness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

// Dry brush clumps flanking the turnout — thin emissive-free spiky quads,
// dark against the sky.
function DryBrush() {
  const tex = useMemo(() => makeBrushTexture(), [])
  const clumps = useMemo(() => ([
    { x: -2.3, z: -0.6, s: 0.9 }, { x: 2.4, z: -0.3, s: 1.1 },
    { x: -1.7, z: 0.9, s: 0.7 }, { x: 2.0, z: 1.1, s: 0.8 },
    { x: -2.7, z: 1.6, s: 0.6 },
  ]), [])
  return (
    <group>
      {clumps.map((c, i) => (
        <mesh key={i} position={[c.x, c.s * 0.5, c.z]} scale={c.s}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={tex} transparent color="#1c1a14" side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

/* -------------------------------------------------------------- polaroid */

// A small standing polaroid prop on the rail, angled so both faces are
// reachable by drag-look — front is the unresolved night smear every bespoke
// polaroid in this app uses, back is the Olympics correction.
function OverlookPolaroid() {
  const frontTex = useMemo(() => makeOverlookPolaroidFront(), [])
  const backTex = useMemo(() => makeOverlookPolaroidBack(), [])
  return (
    <group position={[1.7, RAIL_H + 0.16, RAIL_Z + 0.05]} rotation={[0, -0.5, 0]}>
      <mesh rotation={[0, 0, 0]}>
        <planeGeometry args={[0.22, 0.26]} />
        <meshBasicMaterial map={frontTex} toneMapped={false} side={THREE.FrontSide} />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.22, 0.26]} />
        <meshBasicMaterial map={backTex} toneMapped={false} side={THREE.FrontSide} />
      </mesh>
    </group>
  )
}

/* -------------------------------------------------------------- viewfinder */

const FRAME_W = 1.05
const FRAME_H = 0.62
const FRAME_DIST = 0.85

function ViewfinderFrame({ film }) {
  const groupRef = useRef()
  const spotRef = useRef()
  const targetRef = useRef()
  const dotRef = useRef()
  const capMeshRef = useRef()
  const revealRef = useRef(0)
  const [capTex, setCapTex] = useState(null)
  const lastLenRef = useRef(-1)
  const pauseRef = useRef(0)

  const text = film.hot_take || ''

  useEffect(() => {
    const t = makeCaptionTexture('', 0, film.score)
    setCapTex(t)
    return () => t.dispose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug])

  useEffect(() => {
    if (spotRef.current && targetRef.current) spotRef.current.target = targetRef.current
  }, [])

  const dir = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ camera, clock }, dt) => {
    if (!groupRef.current) return
    camera.getWorldDirection(dir)
    groupRef.current.position.copy(camera.position).add(dir.clone().multiplyScalar(FRAME_DIST))
    groupRef.current.quaternion.copy(camera.quaternion)

    if (spotRef.current) {
      spotRef.current.position.copy(camera.position)
    }
    if (targetRef.current) {
      targetRef.current.position.copy(camera.position).add(dir.clone().multiplyScalar(6))
    }

    // REC dot pulse
    if (dotRef.current) {
      const p = 0.55 + Math.sin(clock.elapsedTime * 5.2) * 0.45
      dotRef.current.material.emissiveIntensity = 1.2 + p * 1.4
    }

    // typewriter reveal, looping: type forward at a steady rate, hold, then
    // reset and start again
    const CPS = 14
    const HOLD = 2.2
    revealRef.current += dt * CPS
    const total = text.length
    if (revealRef.current >= total + HOLD * CPS) revealRef.current = 0
    const shown = Math.min(total, Math.floor(revealRef.current))
    if (shown !== lastLenRef.current) {
      lastLenRef.current = shown
      if (capTex) {
        const fresh = makeCaptionTexture(text, shown, film.score)
        if (capMeshRef.current) {
          capMeshRef.current.material.map.dispose()
          capMeshRef.current.material.map = fresh
          capMeshRef.current.material.needsUpdate = true
        }
      }
    } else if (shown < total && capMeshRef.current) {
      // cursor blink still needs occasional redraws even when char count
      // hasn't advanced this frame
      pauseRef.current += dt
      if (pauseRef.current > 0.2) {
        pauseRef.current = 0
        const fresh = makeCaptionTexture(text, shown, film.score)
        capMeshRef.current.material.map.dispose()
        capMeshRef.current.material.map = fresh
        capMeshRef.current.material.needsUpdate = true
      }
    }
  })

  return (
    <group>
      {/* the exposure-lift spotlight: aimed dead ahead, roughly matching the
          frame's own angular footprint, so only what the frame currently
          covers reads brighter — the room outside the frame stays at the
          base night grade */}
      <spotLight
        ref={spotRef}
        color="#fff2dc"
        intensity={38}
        angle={0.30}
        penumbra={0.55}
        distance={16}
        decay={1.6}
      />
      <object3D ref={targetRef} />

      <group ref={groupRef}>
        {/* corner brackets */}
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => (
          <group key={i} position={[sx * FRAME_W / 2, sy * FRAME_H / 2, 0]}>
            <mesh position={[-sx * 0.045, 0, 0]}>
              <boxGeometry args={[0.09, 0.012, 0.001]} />
              <meshBasicMaterial color="#ff8a2a" toneMapped={false} />
            </mesh>
            <mesh position={[0, -sy * 0.045, 0]}>
              <boxGeometry args={[0.012, 0.09, 0.001]} />
              <meshBasicMaterial color="#ff8a2a" toneMapped={false} />
            </mesh>
          </group>
        ))}
        {/* rule of thirds */}
        {[-1, 1].map((s, i) => (
          <mesh key={'v' + i} position={[s * FRAME_W / 6, 0, 0]}>
            <boxGeometry args={[0.004, FRAME_H * 0.94, 0.001]} />
            <meshBasicMaterial color="#ff8a2a" transparent opacity={0.35} toneMapped={false} />
          </mesh>
        ))}
        {[-1, 1].map((s, i) => (
          <mesh key={'h' + i} position={[0, s * FRAME_H / 6, 0]}>
            <boxGeometry args={[FRAME_W * 0.94, 0.004, 0.001]} />
            <meshBasicMaterial color="#ff8a2a" transparent opacity={0.35} toneMapped={false} />
          </mesh>
        ))}
        {/* REC dot, upper left */}
        <mesh ref={dotRef} position={[-FRAME_W / 2 + 0.09, FRAME_H / 2 - 0.07, 0]}>
          <circleGeometry args={[0.018, 16]} />
          <meshStandardMaterial color="#ff2020" emissive="#ff2020" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
        <mesh position={[-FRAME_W / 2 + 0.14, FRAME_H / 2 - 0.07, 0]}>
          <planeGeometry args={[0.09, 0.03]} />
          <meshBasicMaterial color="#ff2020" transparent opacity={0.85} toneMapped={false} />
        </mesh>

        {/* lower-third caption bar */}
        <mesh ref={capMeshRef} position={[0, -FRAME_H / 2 + 0.09, 0]}>
          <planeGeometry args={[FRAME_W * 0.98, FRAME_H * 0.34]} />
          {capTex
            ? <meshBasicMaterial map={capTex} transparent depthWrite={false} toneMapped={false} />
            : <meshBasicMaterial transparent opacity={0} />}
        </mesh>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ doors */

// Bloodline doors (brief §6): mounted along the guardrail's own run, clear of
// the polaroid prop and the entry camera's straight-ahead sightline.
const DOOR_MOUNT = { position: [-1.6, 0, RAIL_Z + 0.05], rotationY: 0, spacing: 0.95, scale: 0.7 }

/* ------------------------------------------------------------------ room */

export default function Nightcrawler({ film, config, doors = [], onDoor }) {
  const { grade } = config

  useRoomAudio(startNightcrawlerAudio)

  return (
    <group>
      <fogExp2 attach="fog" args={[grade.bg || '#050608', 0.02]} />
      <ambientLight intensity={grade.ambient ?? 0.1} />
      <pointLight position={[0, 2.4, 1.6]} intensity={(grade.keyIntensity ?? 1) * 8} color={grade.key || '#ff8a2a'} distance={10} decay={2} />

      <Overlook grade={grade} />
      <GuardRail />
      <DryBrush />
      <OverlookPolaroid />
      <ViewfinderFrame film={film} />

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
