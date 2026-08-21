import React, { useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { HAZY_CLOSER, HAZY_ENTRY } from './archiveConfig.js'
import { setBounds, clearOwner } from '../colliders.js'

// The Dark Drawer's one shared room (brief §3, Wave C: "room exists
// UNDEVELOPED: near-black, fog, faint silhouettes ... No info surfaces ...
// Exit is the only interaction"). Every drawer slug renders this exact same
// component — there is no genre mapping and no per-film config, because a
// drawer entry carries no memory score to grade a family off of at all
// (archiveConfig.js's hazyConfigFor() is the one config, unconditionally).
// Deliberately bespoke rather than routed through GenericRoom: there is
// nothing here for the template engine's shell/prop kit to stage.
//
// "Walk toward but never resolve": free walk (Wave M3), circle bounds only
// and no prop colliders — the silhouettes are walked THROUGH, not around.
// Crossing a fixed depth (ADVANCE_TRIGGER_Z below, roughly 2m past spawn)
// fires the one advance (goToStation, the same seam Memento's corridor uses
// — see bespoke/Memento.jsx and FilmWorld.jsx/ArchiveWorld.jsx) that brings
// the silhouettes closer, but their material opacity is capped well under 1
// regardless of distance. Proximity changes how much fog sits between you
// and one; it never changes whether it resolves.
const W = 6, D = 10, H = 3

function seedOf(str) {
  let h = 0
  for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff
  return h || 1
}

function makeFigures(seed) {
  let s = seed >>> 0
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  const poses = ['stand', 'crouch', 'sit', 'stand', 'stand']
  return Array.from({ length: 5 }, (_, i) => ({
    x: (r() - 0.5) * (W * 0.72),
    z: -2.2 - r() * (D * 0.62),
    rot: r() * Math.PI * 2,
    pose: poses[i],
  }))
}

function Silhouette({ x, z, rot, pose }) {
  const poseY = pose === 'sit' ? 0.6 : pose === 'crouch' ? 0.48 : 0.9
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, poseY * 0.5, 0]}>
        <capsuleGeometry args={[0.19, poseY * 0.55, 4, 8]} />
        {/* opacity capped — the "never resolve" the brief calls for. Fog and
            proximity can only ever reveal THIS MUCH of the shape. */}
        <meshBasicMaterial color="#1a1a20" transparent opacity={0.34} depthWrite={false} />
      </mesh>
      <mesh position={[0, poseY + 0.13, 0]}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshBasicMaterial color="#1a1a20" transparent opacity={0.34} depthWrite={false} />
      </mesh>
    </group>
  )
}

// Wave M3: circle bounds only, no prop colliders — walking through the
// silhouettes is the design (brief §3: "faint silhouettes you can walk
// through but never resolve"), so nothing here should ever stop the
// walker. Sized to roughly fill the room's own W x D footprint without
// reaching past it; a hazy room this dim needs no tighter fit than that.
const BOUNDS_R = 4.2
const BOUNDS_CZ = -1

// The one-shot advance used to be a click hotspot a couple meters in front
// of the entry station; it's now a plain position trigger at the same
// rough depth — "roughly 2m forward of spawn" per the M3 spec — read off
// HAZY_ENTRY's own z rather than a second hardcoded number, so the two
// stay in lockstep if the entry station is ever re-authored.
const ADVANCE_TRIGGER_Z = HAZY_ENTRY.pos[2] - 2

export default function Undeveloped({ film, goToStation }) {
  const figures = useMemo(() => makeFigures(seedOf(film?.slug) + 41), [film?.slug])
  const [advanced, setAdvanced] = useState(false)

  useEffect(() => {
    const ownerId = 'room:' + (film?.slug ?? 'undeveloped')
    setBounds(ownerId, { kind: 'circle', cx: 0, cz: BOUNDS_CZ, r: BOUNDS_R })
    return () => clearOwner(ownerId)
  }, [film?.slug])

  useFrame(({ camera }) => {
    if (advanced || !goToStation) return
    if (camera.position.z <= ADVANCE_TRIGGER_Z) {
      setAdvanced(true)
      goToStation(HAZY_CLOSER, 'closer')
    }
  })

  return (
    <group>
      <fogExp2 attach="fog" args={['#08080a', 0.16]} />
      <pointLight position={[0, 2.2, 1]} intensity={5} color="#232329" distance={8} decay={2} />

      {/* floor + ceiling, both near-black — just enough surface for the fog
          to sit against. Nothing here is meant to be lit; the room is meant
          to be almost entirely absence. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#050506" roughness={1} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#030304" roughness={1} />
      </mesh>

      {figures.map((f, i) => <Silhouette key={i} {...f} />)}
    </group>
  )
}
