import React, { useMemo, useState } from 'react'
import * as THREE from 'three'
import { HAZY_CLOSER } from './archiveConfig.js'
import { wasDrag } from '../../pointer.js'

// The Dark Drawer's one shared room (brief §3, Wave C: "room exists
// UNDEVELOPED: near-black, fog, faint silhouettes ... No info surfaces ...
// Exit is the only interaction"). Every drawer slug renders this exact same
// component — there is no genre mapping and no per-film config, because a
// drawer entry carries no memory score to grade a family off of at all
// (archiveConfig.js's hazyConfigFor() is the one config, unconditionally).
// Deliberately bespoke rather than routed through GenericRoom: there is
// nothing here for the template engine's shell/prop kit to stage.
//
// "Walk toward but never resolve": one advance station (goToStation, the
// same seam Memento's corridor uses — see bespoke/Memento.jsx and
// FilmWorld.jsx/ArchiveWorld.jsx) brings the silhouettes closer, but their
// material opacity is capped well under 1 regardless of distance. Proximity
// changes how much fog sits between you and one; it never changes whether it
// resolves.
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

export default function Undeveloped({ film, goToStation }) {
  const figures = useMemo(() => makeFigures(seedOf(film?.slug) + 41), [film?.slug])
  const [advanced, setAdvanced] = useState(false)

  const advance = (e) => {
    e.stopPropagation()
    if (wasDrag()) return
    if (advanced || !goToStation) return
    setAdvanced(true)
    goToStation(HAZY_CLOSER, 'closer')
  }

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

      {/* the one interaction that isn't leaving: step forward, once. A bare
          hotspot, not a prop — nothing here is meant to be looked at
          directly, only walked toward without ever quite arriving. Facing
          the camera (no rotation — its default normal is +Z, and the camera
          sits further along +Z looking back toward -Z) rather than lying
          flat on the floor: a floor-flat plane is viewed edge-on from a
          standing eye height and is effectively unclickable. */}
      {!advanced && (
        <mesh position={[0, 1.3, -1]} onClick={advance}>
          <planeGeometry args={[3, 2.2]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}
