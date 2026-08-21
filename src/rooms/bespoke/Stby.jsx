import React, { useEffect, useMemo, useState } from 'react'
import { chairRow as ChairRow, table as Table } from '../props.jsx'
import { setGradeOverride, clearGradeOverride } from '../gradeBus.js'
import { useRoomAudio } from '../audio/engine.js'
import { start as startStbyAudio } from '../audio/recipes/stby.js'
import { notifySwerve } from './stbyBus.js'
import {
  makeOfficeScoreTexture, makeCubicleScreenTexture, makeScreamTexture, makeFleshTexture,
} from './stbyTextures.js'
import DoorRow from '../DoorRow.jsx'

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

function Cubicle({ x, z, seed }) {
  const tex = useMemo(() => makeCubicleScreenTexture(seed), [seed])
  return (
    <group position={[x, 0, z]}>
      {/* low partitions, three sides */}
      <mesh position={[-0.55, 0.55, 0]}>
        <boxGeometry args={[0.04, 1.1, 1]} />
        <meshStandardMaterial color="#8a9098" roughness={0.85} />
      </mesh>
      <mesh position={[0.55, 0.55, 0]}>
        <boxGeometry args={[0.04, 1.1, 1]} />
        <meshStandardMaterial color="#8a9098" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.55, -0.48]}>
        <boxGeometry args={[1.14, 1.1, 0.04]} />
        <meshStandardMaterial color="#8a9098" roughness={0.85} />
      </mesh>
      <Table pos={[0, 0, 0.15]} w={0.9} d={0.5} h={0.72} color="#5a5648" />
      {/* the cubicle screen */}
      <mesh position={[0, 0.98, -0.42]}>
        <planeGeometry args={[0.5, 0.34]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* headset prop: a thin arc + two small pads, propped on the desk */}
      <group position={[0.28, 0.75, 0.1]} rotation={[0, 0.4, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.09, 0.008, 6, 16, Math.PI]} />
          <meshStandardMaterial color="#1c1e22" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0.09, -0.05, 0]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial color="#0c0d10" roughness={0.6} />
        </mesh>
      </group>
      <ChairRow pos={[0, 0, 0.55]} count={1} />
    </group>
  )
}

function FluorescentStrip({ x }) {
  return (
    <mesh position={[x, 2.35, -0.5]}>
      <boxGeometry args={[0.14, 0.06, 3.2]} />
      <meshStandardMaterial color="#eef4ff" emissive="#dfe8ff" emissiveIntensity={1.4} roughness={0.4} />
    </mesh>
  )
}

function OfficeShell() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 6]} />
        <meshStandardMaterial color="#5a5c54" roughness={0.9} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 2.6, 0]}>
        <planeGeometry args={[7, 6]} />
        <meshStandardMaterial color="#c8ccd0" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.3, -2.9]}>
        <planeGeometry args={[7, 2.6]} />
        <meshStandardMaterial color="#9a9c94" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.3, 2.9]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[7, 2.6]} />
        <meshStandardMaterial color="#9a9c94" roughness={0.9} />
      </mesh>
    </group>
  )
}

function OfficeScoreScreen({ film }) {
  const tex = useMemo(() => makeOfficeScoreTexture(film.score, film.title), [film.slug, film.score, film.title])
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

function GoldColumns() {
  const positions = [[-2.6, -2.2], [2.6, -2.2], [-2.6, 1.6], [2.6, 1.6]]
  return (
    <group>
      {positions.map(([x, z], i) => (
        <mesh key={i} position={[x, 1.4, z]}>
          <cylinderGeometry args={[0.16, 0.18, 2.8, 16]} />
          <meshStandardMaterial color="#e8c060" emissive="#e8c060" emissiveIntensity={0.5} roughness={0.3} metalness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

function LongTable() {
  return (
    <group position={[0, 0, -0.6]}>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[1.1, 0.06, 3.6]} />
        <meshStandardMaterial color="#2a1c10" roughness={0.25} metalness={0.4} />
      </mesh>
      {[-1.6, -0.5, 0.6, 1.6].map((z, i) => (
        <mesh key={i} position={[0, 0.36, z]}>
          <boxGeometry args={[0.9, 0.72, 0.06]} />
          <meshStandardMaterial color="#1c140c" roughness={0.4} />
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

function Scream({ text }) {
  const line = screamLine(text)
  const tex = useMemo(() => makeScreamTexture(line), [line])
  return (
    <mesh position={[0, 1.85, -2.85]}>
      <planeGeometry args={[5.2, 2.1]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

function PenthouseShell() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 7]} />
        <meshStandardMaterial color="#1c1408" roughness={0.35} metalness={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3, 0]}>
        <planeGeometry args={[8, 7]} />
        <meshStandardMaterial color="#120c06" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.5, -3.4]}>
        <planeGeometry args={[8, 3]} />
        <meshStandardMaterial color="#140e08" roughness={0.5} />
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

export default function Stby({ film, config, doors = [], onDoor }) {
  const { grade } = config
  const [inPenthouse, setInPenthouse] = useState(false)

  useEffect(() => {
    let live = true
    const timers = []
    function scheduleSwerve(wait) {
      timers.push(setTimeout(() => {
        if (!live) return
        setInPenthouse(true)
        notifySwerve(true)
        timers.push(setTimeout(() => {
          if (!live) return
          setInPenthouse(false)
          notifySwerve(false)
          scheduleSwerve(OFFICE_MS)
        }, PENTHOUSE_MS))
      }, wait))
    }
    scheduleSwerve(OFFICE_MS)
    return () => { live = false; timers.forEach(clearTimeout); notifySwerve(false) }
  }, [])

  // hard cut on the GRADE too: no lerp, an instant swap the moment the state
  // flips, matching "zero easing, no wash" for the visuals as much as the mix.
  useEffect(() => {
    if (inPenthouse) {
      setGradeOverride({ bg: '#160e04', fogColor: '#160e04', sat: 0.15, contrast: 0.08, key: '#ffb84a', fill: '#3a1c0c' })
    } else {
      clearGradeOverride()
    }
  }, [inPenthouse])
  useEffect(() => clearGradeOverride, [])

  useRoomAudio(startStbyAudio)

  return (
    <group>
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
          <Scream text={film.hot_take} />
        </>
      ) : (
        <>
          <fogExp2 attach="fog" args={[grade.fogColor || '#3a3c36', 0.05]} />
          <pointLight position={[0, 2.4, 0]} intensity={(grade.keyIntensity ?? 1) * 10} color={grade.key || '#dfe8ff'} distance={9} decay={2} />
          <ambientLight intensity={grade.ambient ?? 0.35} />

          <OfficeShell />
          {[-1.3, 0, 1.3].map((x) => <FluorescentStrip key={x} x={x} />)}
          {CUBICLES.map(([x, z], i) => (
            <Cubicle key={i} x={x} z={z} seed={i + 40} />
          ))}
          <OfficeScoreScreen film={film} />
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
