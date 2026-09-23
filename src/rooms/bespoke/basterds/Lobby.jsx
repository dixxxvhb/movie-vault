import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { standardMat } from '../../materials.js'
import { Bevel } from '../../detail.jsx'
import { makePaintedTexture, paintLobbyCard } from './basterdsTextures.js'
import LobbyProps, { HouseNote } from './LobbyProps.jsx'
import { HOUSE_NOTES } from './content.js'
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

// A picture-palace chandelier: three brass rings stepped down like a wedding
// cake, candle bulbs on each, glass drops under the lowest. It hangs where
// the lobby's one light already is, so it costs no light.
function Chandelier({ brass }) {
  const bulbs = useRef(), drops = useRef()
  const rings = [[0.95, 3.55, 16], [0.62, 3.35, 12], [0.32, 3.15, 8]]
  const pts = useMemo(() => rings.flatMap(([r, y, n]) =>
    Array.from({ length: n }, (_, k) => [Math.cos((k / n) * Math.PI * 2) * r, y + 0.1, Math.sin((k / n) * Math.PI * 2) * r])), []) // eslint-disable-line react-hooks/exhaustive-deps
  // drops hang in short strands from each ring, between the bulbs
  const dropPts = useMemo(() => rings.flatMap(([r, y, n]) => Array.from({ length: n * 2 }, (_, k) => {
    const a = ((Math.floor(k / 2) + 0.5) / n) * Math.PI * 2
    return [Math.cos(a) * r, y - 0.06 - (k % 2) * 0.06, Math.sin(a) * r]
  })), []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const m = new THREE.Matrix4()
    pts.forEach((p, i) => { m.makeTranslation(...p); bulbs.current.setMatrixAt(i, m) })
    dropPts.forEach((p, i) => { m.makeTranslation(...p); drops.current.setMatrixAt(i, m) })
    bulbs.current.instanceMatrix.needsUpdate = true
    drops.current.instanceMatrix.needsUpdate = true
  }, [pts, dropPts])
  return (
    <group position={[0, 0, -5]}>
      <mesh position={[0, 3.9, 0]} material={brass}><cylinderGeometry args={[0.012, 0.012, 0.6, 6]} /></mesh>
      <mesh position={[0, 3.2, 0]} material={brass}><cylinderGeometry args={[0.035, 0.07, 1.0, 12]} /></mesh>
      {rings.map(([r, y]) => (
        <mesh key={r} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={brass}><torusGeometry args={[r, 0.018, 8, 48]} /></mesh>
      ))}
      <instancedMesh ref={bulbs} args={[null, null, pts.length]} frustumCulled={false}>
        <sphereGeometry args={[0.03, 10, 8]} />
        <meshStandardMaterial color="#fff2d6" emissive="#ffcf8a" emissiveIntensity={2.6} />
      </instancedMesh>
      <instancedMesh ref={drops} args={[null, null, dropPts.length]} frustumCulled={false}>
        <octahedronGeometry args={[0.02, 0]} />
        <meshStandardMaterial color="#fff8ee" emissive="#ffd9a0" emissiveIntensity={0.6} metalness={0.3} roughness={0.05} />
      </instancedMesh>
    </group>
  )
}

// Deco pilasters between the cards: fluted, with a stepped brass capital.
const PILASTERS = [[-1, -1.3], [-1, -3.9], [-1, -6.5], [-1, -9.1], [1, -0.6], [1, -6.7], [1, -9.3]]
function Pilasters({ brass }) {
  const shaft = useMemo(() => standardMat({ kind: 'plaster', tint: '#c9b48e', wear: 0.2, seed: 'ib-pilaster' }), [])
  const flute = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8a7552', roughness: 0.8 }), [])
  return (
    <group>
      {PILASTERS.map(([s, z]) => (
        <group key={s + ':' + z} position={[s * 6.72, 0, z]} rotation={[0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
          <mesh position={[0, 2.1, 0.03]} material={shaft}><boxGeometry args={[0.38, 4.2, 0.08]} /></mesh>
          {[-0.1, 0, 0.1].map((x) => <mesh key={x} position={[x, 2.3, 0.072]} material={flute}><boxGeometry args={[0.03, 2.6, 0.01]} /></mesh>)}
          {[0, 1, 2].map((k) => <mesh key={k} position={[0, 3.72 + k * 0.1, 0.05 + k * 0.02]} material={brass}><boxGeometry args={[0.42 + k * 0.1, 0.08, 0.1 + k * 0.04]} /></mesh>)}
        </group>
      ))}
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
      {/* house lights up: what each chapter made up, pinned to its card */}
      {CARDS.map((c) => {
        const inward = c.ry > 0 ? 1 : -1
        return <HouseNote key={'h' + c.n} text={HOUSE_NOTES[c.n]} ry={c.ry} w={0.44} rot={0.05 * inward}
          pos={[c.pos[0] + inward * 0.09, c.pos[1] - 0.45, c.pos[2] - inward * 0.32]} />
      })}

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
      <Chandelier brass={brass} />
      <Pilasters brass={brass} />

      {/* the carpet runner, street door to the auditorium */}
      <mesh position={[-1.6, 0.006, -5.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, 9.4]} />
        <meshStandardMaterial color="#6e1a17" roughness={0.95} />
      </mesh>
    </group>
  )
}
