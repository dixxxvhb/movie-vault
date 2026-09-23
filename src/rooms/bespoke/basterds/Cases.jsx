import React, { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Slab } from '../../kit/architecture.jsx'
import { makePaintedTexture, paintLobbyCard } from './basterdsTextures.js'
import { useVaultData } from './data.js'
import { Scrap, HouseNote } from '../../kit/notes.jsx'
import { FRAGMENTS, HOUSE_NOTES } from './content.js'
import { rakeAt } from './zones.js'

// THE PLOT: five lit poster cases on the west wall, one per chapter, in story
// order from the back of the house to the stage, each between two pilasters.
// The lobby card is the case's poster; the chapter's object sits on a shelf
// under it in a glass cloche, so the story is told by a thing before a word.

const WEST = -8.8
export const CASE_BAYS = [-16.1, -19.5, -22.9, -26.3, -29.8]
const W = 1.44, H = 1.92

const gold = new THREE.MeshStandardMaterial({ color: '#b08a42', metalness: 0.9, roughness: 0.28 })
const back = new THREE.MeshStandardMaterial({ color: '#2a0909', roughness: 0.95 })
const glass = new THREE.MeshStandardMaterial({ color: '#d8e2dc', transparent: true, opacity: 0.07, roughness: 0.35, metalness: 0, depthWrite: false })
const white = new THREE.MeshStandardMaterial({ color: '#efe9dc', roughness: 0.4 })
const lightBar = new THREE.MeshStandardMaterial({ color: '#8a6a36', metalness: 0.8, roughness: 0.35, emissive: '#ffd9a0', emissiveIntensity: 1.6 })

// One object per chapter, small, on the shelf.
function ChapterObject({ n }) {
  if (n === 1) return (   // the glass of milk Landa drank
    <group><mesh position={[0, 0.09, 0]} material={white}><cylinderGeometry args={[0.04, 0.034, 0.17, 20]} /></mesh></group>
  )
  if (n === 2) return (   // the bat
    <mesh position={[0, 0.04, 0]} rotation={[0, 0.4, Math.PI / 2 - 0.05]}><cylinderGeometry args={[0.012, 0.03, 0.42, 12]} /><meshStandardMaterial color="#b98a52" roughness={0.55} /></mesh>
  )
  if (n === 3) return (   // strudel, and the cream he waited for
    <group>
      <mesh position={[0, 0.01, 0]}><cylinderGeometry args={[0.13, 0.12, 0.015, 28]} /><meshStandardMaterial color="#f4efe6" roughness={0.4} /></mesh>
      <mesh position={[-0.02, 0.04, 0]} rotation={[0, 0.4, 0]}><boxGeometry args={[0.13, 0.045, 0.055]} /><meshStandardMaterial color="#c08a4a" roughness={0.7} /></mesh>
      <mesh position={[0.05, 0.04, 0.045]}><sphereGeometry args={[0.03, 14, 10]} /><meshStandardMaterial color="#fbf7ee" roughness={0.5} /></mesh>
    </group>
  )
  if (n === 4) return (   // three glasses, ordered with the wrong three fingers
    <group>{[-0.09, 0, 0.09].map((x) => (
      <group key={x} position={[x, 0, 0]}>
        <mesh position={[0, 0.045, 0]}><cylinderGeometry args={[0.03, 0.026, 0.09, 16]} /><meshStandardMaterial color="#d8c89a" transparent opacity={0.35} roughness={0.05} /></mesh>
        <mesh position={[0, 0.025, 0]}><cylinderGeometry args={[0.026, 0.023, 0.04, 16]} /><meshStandardMaterial color="#a8621a" emissive="#5a2a08" emissiveIntensity={0.4} /></mesh>
      </group>
    ))}</group>
  )
  return (                // a can of nitrate, lid off, the film coiled inside
    <group>
      <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.16, 0.16, 0.05, 32]} /><meshStandardMaterial color="#6e6258" metalness={0.75} roughness={0.35} /></mesh>
      <mesh position={[0, 0.056, 0]}><cylinderGeometry args={[0.14, 0.14, 0.004, 32]} /><meshStandardMaterial color="#3a2a18" roughness={0.3} /></mesh>
      <mesh position={[0.2, 0.02, 0.05]} rotation={[0.1, 0, 0.3]}><cylinderGeometry args={[0.16, 0.16, 0.012, 32]} /><meshStandardMaterial color="#6e6258" metalness={0.75} roughness={0.35} /></mesh>
    </group>
  )
}

function ChapterCase({ n, z, cast }) {
  const tex = useMemo(() => (cast ? makePaintedTexture(1024, 1365, (c) => paintLobbyCard(c, n, cast)) : null), [n, cast])
  useEffect(() => () => tex && tex.dispose(), [tex])
  const y = rakeAt(z) + 2.62
  const shelfY = rakeAt(z) + 1.32
  const fierce = n === 2 ? FRAGMENTS.find((f) => f.where.includes('vitrine')) : null
  return (
    // local frame: +z points into the house (world +x), local x runs toward the back (world -z... mirrored)
    <group position={[WEST, 0, z]} rotation={[0, Math.PI / 2, 0]}>
      {/* the case: velvet-backed box, gold frame proud of the wall, glass */}
      <Slab x0={-W / 2 - 0.06} x1={W / 2 + 0.06} y0={y - H / 2 - 0.06} y1={y + H / 2 + 0.06} z0={0} z1={0.1} mat={back} />
      {[[-1, 0], [1, 0]].map(([s]) => (
        <Slab key={s} x0={s * (W / 2) - (s < 0 ? 0.1 : 0)} x1={s * (W / 2) + (s > 0 ? 0.1 : 0)} y0={y - H / 2 - 0.1} y1={y + H / 2 + 0.1} z0={0} z1={0.18} mat={gold} />
      ))}
      {[-1, 1].map((s) => (
        <Slab key={'h' + s} x0={-W / 2 - 0.1} x1={W / 2 + 0.1} y0={s < 0 ? y - H / 2 - 0.1 : y + H / 2} y1={s < 0 ? y - H / 2 : y + H / 2 + 0.1} z0={0} z1={0.18} mat={gold} />
      ))}
      <mesh position={[0, y, 0.105]}>
        <planeGeometry args={[W, H]} />
        {tex
          ? <meshStandardMaterial key="painted" map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.5} roughness={0.85} />
          : <meshStandardMaterial key="blank" color="#e6dac3" roughness={0.9} />}
      </mesh>
      <mesh position={[0, y, 0.17]} material={glass}><planeGeometry args={[W, H]} /></mesh>
      {/* the picture light over it, glowing (no light of its own) */}
      <Slab x0={-0.5} x1={0.5} y0={y + H / 2 + 0.2} y1={y + H / 2 + 0.25} z0={0.18} z1={0.26} mat={lightBar} />
      <Slab x0={-0.02} x1={0.02} y0={y + H / 2 + 0.1} y1={y + H / 2 + 0.22} z0={0.05} z1={0.2} mat={gold} />
      {/* the shelf and its cloche, with the chapter's object */}
      <Slab x0={-0.34} x1={0.34} y0={shelfY - 0.03} y1={shelfY} z0={0} z1={0.4} mat={gold} />
      <Slab x0={-0.03} x1={0.03} y0={shelfY - 0.25} y1={shelfY - 0.03} z0={0} z1={0.3} mat={gold} />
      <group position={[0, shelfY, 0.22]}><ChapterObject n={n} /></group>
      <mesh position={[0, shelfY + 0.17, 0.22]} material={glass}><boxGeometry args={[0.6, 0.34, 0.34]} /></mesh>
      {/* the record, pinned to the case when the house lights come up */}
      <HouseNote text={HOUSE_NOTES[n]} pos={[W / 2 - 0.22, y - H / 2 + 0.22, 0.2]} w={0.5} rot={-0.05} />
      {fierce && <Scrap text={'"' + fierce.text + '"'} pos={[-W / 2 - 0.55, shelfY + 0.35, 0.02]} w={0.62} rot={0.05} size={52} />}
    </group>
  )
}

export default function Cases() {
  const data = useVaultData()
  const cast = data?.cast?.['inglourious-basterds'] || null
  return <group>{CASE_BAYS.map((z, i) => <ChapterCase key={i} n={i + 1} z={z} cast={cast} />)}</group>
}
