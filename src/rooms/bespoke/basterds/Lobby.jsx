import React, { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { standardMat } from '../../materials.js'
import { Bevel } from '../../detail.jsx'
import { makePaintedTexture, paintLobbyCard } from './basterdsTextures.js'
import LobbyProps from './LobbyProps.jsx'
import { HATCH } from './zones.js'

// LE GAMAAR: the lobby. Plan §4.2.
//
// The five chapter cards are the plot. Chapters 1 to 3 hang on the west wall
// front to back, 4 and 5 on the east wall by the way into the auditorium, so
// the lobby reads left, then right, in the order the film tells it.

const BASE = import.meta.env.BASE_URL || '/'
let dataPromise = null
// The room needs the film's cast (headshots, actor names). vault-data.json is
// already cached by the app, so this is a memory hit, not a second download.
export function useVaultData() {
  const [d, setD] = useState(null)
  useEffect(() => {
    if (!dataPromise) dataPromise = fetch(BASE + 'vault-data.json').then((r) => r.json()).catch(() => ({}))
    let live = true
    dataPromise.then((x) => { if (live) setD(x) })
    return () => { live = false }
  }, [])
  return d
}

export const CARD_W = 0.9
export const CARD_H = 1.2
const WALL_X = 6.8 - 0.07
export const CARDS = [
  { n: 1, pos: [-WALL_X, 1.75, -2.6], ry: Math.PI / 2 },
  { n: 2, pos: [-WALL_X, 1.75, -5.2], ry: Math.PI / 2 },
  { n: 3, pos: [-WALL_X, 1.75, -7.8], ry: Math.PI / 2 },
  { n: 4, pos: [WALL_X, 1.75, -5.4], ry: -Math.PI / 2 },
  { n: 5, pos: [WALL_X, 1.75, -8.0], ry: -Math.PI / 2 },
]

function LobbyCard({ n, pos, ry, cast }) {
  const tex = useMemo(() => {
    if (!cast) return null
    return makePaintedTexture(1024, 1365, (c) => paintLobbyCard(c, n, cast))
  }, [n, cast])
  useEffect(() => () => tex && tex.dispose(), [tex])
  const frame = standardMat({ kind: 'wood', tint: '#2a1a10', wear: 0.2, seed: 'ib-frame', roughness: 0.6 })
  return (
    <group position={pos} rotation={[0, ry, 0]}>
      {/* the frame: dark lacquered wood, bevelled, proud of the wall */}
      <Bevel w={CARD_W + 0.12} h={CARD_H + 0.12} d={0.05} pos={[0, 0, 0.025]} mat={frame} radius={0.012} />
      <mesh position={[0, 0, 0.052]}>
        <planeGeometry args={[CARD_W, CARD_H]} />
        {/* keyed: three compiles a material without USE_MAP and never
            recompiles when a map arrives later, so swap the whole material */}
        {tex
          ? <meshStandardMaterial key="painted" map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.32} roughness={0.85} />
          : <meshStandardMaterial key="blank" color="#e6dac3" roughness={0.9} />}
      </mesh>
      {/* the picture light: a brass bar that glows, not a lamp in the light budget */}
      <mesh position={[0, CARD_H / 2 + 0.14, 0.12]}>
        <boxGeometry args={[0.46, 0.035, 0.05]} />
        <meshStandardMaterial color="#8a6a36" metalness={0.8} roughness={0.35} emissive="#ffd9a0" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[0, CARD_H / 2 + 0.08, 0.075]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.04, 0.12, 0.02]} />
        <meshStandardMaterial color="#6a5028" metalness={0.8} roughness={0.4} />
      </mesh>
    </group>
  )
}

export default function Lobby() {
  const data = useVaultData()
  const cast = data?.cast?.['inglourious-basterds'] || null
  const wood = standardMat({ kind: 'wood', tint: '#3a2416', wear: 0.25, seed: 'ib-dado', roughness: 0.55 })
  const parquet = standardMat({ kind: 'wood', tint: '#5a3a24', wear: 0.35, seed: 'ib-parquet', roughness: 0.45, repeat: [6, 4] })
  const brass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9a7a40', metalness: 0.85, roughness: 0.3 }), [])
  return (
    <group>
      {CARDS.map((c) => <LobbyCard key={c.n} {...c} cast={cast} />)}

      {/* dado panelling, both long walls, with a brass cap rail */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 6.74, 0.55, -5.0]} material={wood}><boxGeometry args={[0.04, 1.1, 9.6]} /></mesh>
          <mesh position={[s * 6.72, 1.12, -5.0]} material={brass}><boxGeometry args={[0.03, 0.03, 9.6]} /></mesh>
        </group>
      ))}

      {/* the parquet, with the hatch cut out of it (chapter 1 is under the glass) */}
      {[
        [-6.8, HATCH.x0, -9.8, -0.2], [HATCH.x1, 6.8, -9.8, -0.2],
        [HATCH.x0, HATCH.x1, -9.8, HATCH.z0], [HATCH.x0, HATCH.x1, HATCH.z1, -0.2],
      ].map(([a, b, c, d]) => (
        <mesh key={a + ':' + c} position={[(a + b) / 2, 0, (c + d) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={parquet}>
          <planeGeometry args={[b - a, d - c]} />
        </mesh>
      ))}
      <LobbyProps />

      {/* the carpet runner, street door to the auditorium */}
      <mesh position={[-1.6, 0.006, -5.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, 9.4]} />
        <meshStandardMaterial color="#6e1a17" roughness={0.95} />
      </mesh>
    </group>
  )
}
