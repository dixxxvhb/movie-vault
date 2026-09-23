import React, { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import Touchable from '../../Touchable.jsx'
import RainField from '../../systems/RainField.jsx'
import { standardMat } from '../../materials.js'
import { makePaintedTexture, wrap, whenFonts, INK } from './basterdsTextures.js'
import {
  paintMarquee, paintNameSign, paintPoster, paintBuilding, paintCobbles, paintFacePoster,
} from './rueTextures.js'
import { useVaultData } from './data.js'
import { MORRIS, LADDER } from './zones.js'

// LE GAMAAR: the street. Plan §4.1. Built to the film's own facade (a curved
// corner drum, the round window, a painted poster, freestanding LE GAMAAR
// letters, a curved marquee of lit panels, light columns by glass doors),
// between two Haussmann fronts on wet cobbles, in the rain.

const BASE = import.meta.env.BASE_URL || '/'
const DRUM_Z = -3.0          // centre of the facade's curve, behind the wall line

function usePainted(w, h, paint, deps, opts = {}) {
  const tex = useMemo(() => {
    const t = makePaintedTexture(w, h, paint)
    if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...opts.repeat) }
    return t
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => () => tex.dispose(), [tex])
  return tex
}

// A curved strip of the drum: a cylinder segment facing the street.
function Curve({ r, y, h, span, map, emissive, emissiveIntensity = 0, color = '#ffffff', side = THREE.FrontSide, mat }) {
  const theta = span / r
  return (
    <mesh position={[0, y, DRUM_Z]}>
      <cylinderGeometry args={[r, r, h, 48, 1, true, -theta / 2, theta]} />
      {mat ? <primitive object={mat} attach="material" /> : (
        <meshStandardMaterial key={map ? 'm' : 'c'} map={map} color={color} side={side}
          emissive={emissive || '#000000'} emissiveMap={emissive ? map : null} emissiveIntensity={emissiveIntensity}
          roughness={0.7} transparent={!!map && !emissive ? false : false} />
      )}
    </mesh>
  )
}

function Marquee() {
  const [state, setState] = useState('premiere')
  const premiere = usePainted(2048, 256, (c) => paintMarquee(c, 'premiere'), [])
  const ladder = usePainted(2048, 256, (c) => paintMarquee(c, 'ladder'), [])
  const map = state === 'premiere' ? premiere : ladder
  const trim = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1a1512', metalness: 0.6, roughness: 0.4 }), [])
  return (
    <group>
      {/* the lit band: 8.2 m of cream panels, curving out over the pavement */}
      <mesh position={[0, 3.72, DRUM_Z]}>
        <cylinderGeometry args={[4.62, 4.62, 1.16, 64, 1, true, -8.2 / 4.62 / 2, 8.2 / 4.62]} />
        <meshStandardMaterial key={state} map={map} emissiveMap={map} emissive="#ffffff" emissiveIntensity={1.05} roughness={0.6} />
      </mesh>
      {/* top and bottom trim */}
      {[3.12, 4.32].map((y) => (
        <mesh key={y} position={[0, y, DRUM_Z]} material={trim}>
          <cylinderGeometry args={[4.66, 4.66, 0.1, 64, 1, true, -8.4 / 4.66 / 2, 8.4 / 4.66]} />
        </mesh>
      ))}
      {/* the canopy soffit, with its row of bulbs */}
      <mesh position={[0, 3.1, (DRUM_Z + 4.6) / 2 + 0.5]} rotation={[Math.PI / 2, 0, 0]} material={trim}>
        <planeGeometry args={[8.2, 2.2]} />
      </mesh>
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={i} position={[-3.6 + i * 0.6, 3.04, 1.05]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshStandardMaterial color="#fff2d0" emissive="#ffe6b0" emissiveIntensity={3} />
        </mesh>
      ))}

      {/* the ladder she was up when Zoller started talking. Touch it: the
          marquee goes back to that afternoon. */}
      <Touchable reach={2.6} foley="creak" anchor={[0, 1.2, 0]}
        onUse={() => setState((s) => (s === 'premiere' ? 'ladder' : 'premiere'))}>
        <group position={LADDER.pos} rotation={[-0.22, LADDER.ry, 0]}>
          {[-0.24, 0.24].map((x) => (
            <mesh key={x} position={[x, 1.6, 0]}>
              <boxGeometry args={[0.05, 3.3, 0.06]} />
              <meshStandardMaterial color="#5a4630" roughness={0.8} />
            </mesh>
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <mesh key={i} position={[0, 0.2 + i * 0.32, 0]}>
              <boxGeometry args={[0.48, 0.035, 0.04]} />
              <meshStandardMaterial color="#6b5438" roughness={0.8} />
            </mesh>
          ))}
        </group>
      </Touchable>
      {/* no card: the Arrival tells you nothing (docs/VAULT-TWO-SCENE-STANDARD.md). Touch the
          ladder and the marquee goes back to the afternoon Zoller first talked to her. */}
      {/* the crate of spare letters */}
      <mesh position={[LADDER.crate[0], 0.22, LADDER.crate[2]]}>
        <boxGeometry args={[0.7, 0.44, 0.5]} />
        <meshStandardMaterial color="#4a3826" roughness={0.9} />
      </mesh>
    </group>
  )
}

// A small folded card, the room's plain-words voice.
function Building({ x0, x1, z, h, seed, facing = 0 }) {
  const w = Math.abs(x1 - x0)
  const tex = usePainted(1024, 1536, (c) => paintBuilding(c, seed), [seed])
  return (
    <mesh position={[(x0 + x1) / 2, h / 2, z]} rotation={[0, facing, 0]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial key="b" map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.18} roughness={0.95} />
    </mesh>
  )
}

function StreetLamp({ pos }) {
  return (
    <group position={pos}>
      <mesh position={[0, 2.1, 0]}><cylinderGeometry args={[0.05, 0.08, 4.2, 10]} /><meshStandardMaterial color="#141210" metalness={0.5} roughness={0.5} /></mesh>
      <mesh position={[0, 4.35, 0]}><boxGeometry args={[0.32, 0.46, 0.32]} /><meshStandardMaterial color="#fff0cf" emissive="#ffd99a" emissiveIntensity={2.4} /></mesh>
      <mesh position={[0, 4.64, 0]}><coneGeometry args={[0.28, 0.2, 4]} /><meshStandardMaterial color="#141210" /></mesh>
      <pointLight position={[0, 4.1, 0]} color="#ffcf8a" intensity={34} distance={16} decay={2} />
    </group>
  )
}

// A 1940s staff car, parked. Silhouette, not a model kit.
function StaffCar({ pos, ry }) {
  const paint = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2c2e26', roughness: 0.45, metalness: 0.35 }), [])
  const tyre = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0c0c0c', roughness: 0.9 }), [])
  return (
    <group position={pos} rotation={[0, ry, 0]}>
      <mesh position={[0, 0.62, 0]} material={paint}><boxGeometry args={[4.0, 0.62, 1.6]} /></mesh>
      <mesh position={[1.35, 0.78, 0]} material={paint}><boxGeometry args={[1.3, 0.3, 1.5]} /></mesh>
      <mesh position={[-0.35, 1.18, 0]} material={paint}><boxGeometry args={[1.5, 0.08, 1.55]} /></mesh>
      {[[-1.35, 0.8], [1.35, 0.8], [-1.35, -0.8], [1.35, -0.8]].map(([x, z]) => (
        <mesh key={x + ':' + z} position={[x, 0.36, z]} rotation={[Math.PI / 2, 0, 0]} material={tyre}>
          <cylinderGeometry args={[0.36, 0.36, 0.22, 16]} />
        </mesh>
      ))}
      {[-0.55, 0.55].map((z) => (
        <mesh key={z} position={[2.02, 0.72, z]}><circleGeometry args={[0.1, 12]} /><meshStandardMaterial color="#fff2d0" emissive="#ffe0a0" emissiveIntensity={0.6} /></mesh>
      ))}
    </group>
  )
}

// The Morris column: other films on his wall that share this cast. Each
// poster is a door to that film's room.
function MorrisColumn({ onDoor }) {
  const data = useVaultData()
  const posters = useMemo(() => {
    const faces = data?.faces?.['inglourious-basterds'] || []
    const cast = data?.cast?.['inglourious-basterds'] || []
    const out = []
    for (const p of faces) {
      const photo = cast.find((c) => c.id === p.id)?.photo
      for (const f of p.films) {
        out.push({ key: p.id + ':' + f.slug, actor: p.name, character: f.character, title: f.title,
          score: f.score, slug: f.slug, kind: f.kind,
          poster: BASE + 'posters/' + f.slug + '.jpg', photo: photo ? BASE + photo : null })
      }
    }
    return out.slice(0, 8)
  }, [data])
  const R = 0.72, H = 3.1
  const stone = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a4236', roughness: 0.7, metalness: 0.2 }), [])
  return (
    <group position={MORRIS.pos}>
      <mesh position={[0, H / 2, 0]}><cylinderGeometry args={[R - 0.02, R, H, 32]} /><meshStandardMaterial color="#d8ccb2" roughness={0.9} /></mesh>
      <mesh position={[0, H + 0.12, 0]} material={stone}><cylinderGeometry args={[R + 0.12, R + 0.05, 0.24, 32]} /></mesh>
      <mesh position={[0, H + 0.45, 0]} material={stone}><sphereGeometry args={[R * 0.8, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <mesh position={[0, 0.15, 0]} material={stone}><cylinderGeometry args={[R + 0.1, R + 0.14, 0.3, 32]} /></mesh>
      {posters.map((p, i) => (
        <FacePoster key={p.key} p={p} i={i} n={Math.max(posters.length, 6)} R={R} onDoor={onDoor} />
      ))}
    </group>
  )
}

function FacePoster({ p, i, n, R, onDoor }) {
  const tex = usePainted(512, 768, (c) => paintFacePoster(c, p), [p.key])
  const span = (Math.PI * 2) / n
  const theta = span * 0.86
  const start = i * span - theta / 2 + Math.PI   // first poster faces the street's far side, toward the spawn
  const mid = start + theta / 2
  return (
    <Touchable reach={2.4} foley="paper" anchor={[Math.sin(mid) * R, 1.7, Math.cos(mid) * R]}
      onUse={() => onDoor && onDoor({ id: 'faces|' + p.key, targetSlug: p.slug, kind: p.kind === 'archive' ? 'archive' : 'ledger', relation: 'familiar face' })}>
      <mesh position={[0, 1.72, 0]}>
        <cylinderGeometry args={[R + 0.005, R + 0.005, 1.5, 24, 1, true, start, theta]} />
        <meshStandardMaterial key="p" map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.28} roughness={0.85} />
      </mesh>
    </Touchable>
  )
}

export default function Rue({ onDoor }) {
  const cobbles = usePainted(1024, 1024, (c) => paintCobbles(c), [], { repeat: [7, 3] })
  const sign = usePainted(1024, 192, (c) => paintNameSign(c), [])
  const poster = usePainted(1024, 512, (c) => paintPoster(c), [])
  const drum = standardMat({ kind: 'plaster', tint: '#9a8f80', wear: 0.35, seed: 'ib-drum' })
  const base = standardMat({ kind: 'concrete', tint: '#4a4038', wear: 0.3, seed: 'ib-base' })
  const pavement = standardMat({ kind: 'concrete', tint: '#5c564e', wear: 0.4, seed: 'ib-pave', roughness: 0.55 })
  return (
    <group>
      {/* wet cobbles to the far kerb, pavement along the front */}
      <mesh position={[0, 0.002, 7]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[36, 14]} />
        <meshStandardMaterial key="c" map={cobbles} roughness={0.32} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.006, 1.2]} rotation={[-Math.PI / 2, 0, 0]} material={pavement}><planeGeometry args={[36, 2]} /></mesh>

      {/* the ground floor: stone base either side of the doors */}
      <mesh position={[-2.9, 1.55, 0.05]} material={base}><boxGeometry args={[3.0, 3.1, 0.2]} /></mesh>
      <mesh position={[2.9, 1.55, 0.05]} material={base}><boxGeometry args={[3.0, 3.1, 0.2]} /></mesh>
      <mesh position={[0, 3.75, 0.05]} material={base}><boxGeometry args={[8.8, 1.3, 0.2]} /></mesh>
      <mesh position={[0, 2.85, 0.05]} material={base}><boxGeometry args={[2.8, 0.5, 0.2]} /></mesh>
      {/* glass either side of the doors, lit from the lobby */}
      {[-2.5, 2.5].map((x) => (
        <group key={x} position={[x, 1.35, 0.17]}>
          <mesh>
            <planeGeometry args={[1.6, 2.2]} />
            <meshStandardMaterial color="#0d0907" emissive="#ffb35e" emissiveIntensity={0.1} roughness={0.08} metalness={0.7} />
          </mesh>
          {/* brass mullions: two lights across, three up */}
          {[-0.4, 0.4].map((mx) => (
            <mesh key={mx} position={[mx, 0, 0.01]}><boxGeometry args={[0.03, 2.2, 0.02]} /><meshStandardMaterial color="#6a5028" metalness={0.8} roughness={0.35} /></mesh>
          ))}
          {[-0.45, 0.35].map((my) => (
            <mesh key={my} position={[0, my, 0.01]}><boxGeometry args={[1.6, 0.03, 0.02]} /><meshStandardMaterial color="#6a5028" metalness={0.8} roughness={0.35} /></mesh>
          ))}
          {/* a one-sheet taped inside the glass */}
          <mesh position={[0, 0.05, -0.01]}><planeGeometry args={[0.52, 0.76]} /><meshStandardMaterial color="#6e1a14" emissive="#b8452c" emissiveIntensity={0.25} /></mesh>
        </group>
      ))}
      {/* the light columns: the tubes that frame the doors in the film */}
      {[-3.55, -1.55, 1.55, 3.55].map((x) => (
        <mesh key={x} position={[x, 1.6, 0.2]}>
          <boxGeometry args={[0.14, 2.8, 0.1]} />
          <meshStandardMaterial color="#fff6e0" emissive="#fff0cc" emissiveIntensity={2.2} />
        </mesh>
      ))}

      <Marquee />
      <pointLight position={[0, 2.7, 2.6]} color="#ffe2b0" intensity={26} distance={11} decay={2} />

      {/* the drum: the curved tower of the facade, above the marquee */}
      <Curve r={4.4} y={8.9} h={9} span={9.6} mat={drum} />
      {/* LE GAMAAR, freestanding letters on the marquee */}
      <mesh position={[0, 4.92, 1.62]}>
        <planeGeometry args={[5.2, 0.98]} />
        <meshStandardMaterial key="s" map={sign} emissiveMap={sign} emissive="#ffffff" emissiveIntensity={1.6} transparent alphaTest={0.3} />
      </mesh>
      {/* the painted premiere poster, bent to the drum */}
      <mesh position={[0, 6.95, DRUM_Z]}>
        <cylinderGeometry args={[4.43, 4.43, 2.1, 32, 1, true, -4.2 / 4.43 / 2, 4.2 / 4.43]} />
        <meshStandardMaterial key="pp" map={poster} emissiveMap={poster} emissive="#ffffff" emissiveIntensity={0.55} roughness={0.8} />
      </mesh>
      {/* the round window */}
      <group position={[0, 10.6, 1.42]}>
        <mesh><torusGeometry args={[0.78, 0.1, 12, 40]} /><meshStandardMaterial color="#2a2420" metalness={0.5} roughness={0.5} /></mesh>
        <mesh position={[0, 0, -0.03]}><circleGeometry args={[0.78, 40]} /><meshStandardMaterial color="#1a1410" emissive="#ffb060" emissiveIntensity={0.22} roughness={0.1} metalness={0.5} /></mesh>
      </group>

      {/* the neighbours, and the far side of the street */}
      <Building x0={-17} x1={-4.4} z={0.02} h={18} seed={3} />
      <Building x0={4.4} x1={17} z={0.02} h={18} seed={7} />
      <Building x0={-18} x1={18} z={13.5} h={17} seed={11} facing={Math.PI} />

      <StreetLamp pos={[5.9, 0, 3.4]} />
      <StaffCar pos={[-6.9, 0, 4.3]} ry={0.04} />
      <MorrisColumn onDoor={onDoor} />

      <group position={[0, 0, 6]}>
        <RainField density={520} wind={0.25} area={[22, 9, 12]} />
      </group>
    </group>
  )
}
