import React, { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import Touchable from '../../Touchable.jsx'
import { standardMat } from '../../materials.js'
import { TentCard } from './Rue.jsx'
import { makePaintedTexture, whenFonts, wrap } from './basterdsTextures.js'
import { HATCH, VITRINE, COUNTER } from './zones.js'
import { FRAGMENTS, HOUSE_NOTES } from './content.js'
import { houseLevel } from '../../houseLights.js'

// LE GAMAAR: the lobby's hidden pieces. Plan §4.2.

const white = new THREE.MeshStandardMaterial({ color: '#e9e2d2', roughness: 0.7 })
const figureMat = new THREE.MeshStandardMaterial({ color: '#c9b79a', roughness: 0.9 })
// the family under the floor reads as shadows against the lamplight
const hiddenMat = new THREE.MeshStandardMaterial({ color: '#140d08', roughness: 1 })

// Dixon's handwriting, near enough: his words on a torn scrap of paper.
export function Scrap({ text, pos, ry = 0, w = 1.4, rot = 0, size = 56 }) {
  const tex = useMemo(() => makePaintedTexture(1024, 360, async (c) => {
    await whenFonts()
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#f1e8d3'
    ctx.beginPath()
    ctx.moveTo(8, 14); ctx.lineTo(1012, 4); ctx.lineTo(1016, 340); ctx.lineTo(20, 352)
    for (let x = 20; x > 8; x -= 3) ctx.lineTo(x + (x % 2) * 5, 352 - (20 - x) * 20)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#1f1a26'
    ctx.font = `italic 400 ${size}px Georgia, serif`
    let y = 110
    for (const l of wrap(ctx, text, 940)) { ctx.fillText(l, 44, y); y += size * 1.25 }
  }), [text, size])
  return (
    <mesh position={pos} rotation={[0, ry, rot]}>
      <planeGeometry args={[w, w * 360 / 1024]} />
      <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.3} transparent alphaTest={0.2} roughness={0.9} />
    </mesh>
  )
}

// A pinned note that is only there with the house lights up: the record
// against the film. Fades with the switch, so it arrives with the work lights.
export function HouseNote({ text, pos, ry = 0, w = 0.5, rot = 0 }) {
  const tex = useMemo(() => makePaintedTexture(768, 360, async (c) => {
    await whenFonts()
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#fbf6c8'; ctx.fillRect(0, 0, 768, 360)
    ctx.fillStyle = '#b3261e'; ctx.beginPath(); ctx.arc(384, 26, 12, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(179,38,30,0.8)'; ctx.font = '600 26px "Josefin Sans"'
    ctx.fillText('HOUSE LIGHTS', 36, 80)
    ctx.fillStyle = '#1b1612'; ctx.font = '400 36px Georgia, serif'
    let y = 132
    for (const l of wrap(ctx, text, 690)) { ctx.fillText(l, 36, y); y += 46 }
  }), [text])
  const mat = useRef()
  const mesh = useRef()
  useFrame(() => {
    const t = houseLevel()
    if (mat.current) mat.current.opacity = t
    if (mesh.current) mesh.current.visible = t > 0.01
  })
  return (
    <mesh ref={mesh} position={pos} rotation={[0, ry, rot]} visible={false}>
      <planeGeometry args={[w, w * 360 / 768]} />
      <meshStandardMaterial ref={mat} map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.35} transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

// ---------------------------------------------------------------- chapter 1
// A loose board in front of the first card. Lift it: glass set into the floor,
// and under the glass, the LaPadite kitchen at 1:6 from above, with the
// Dreyfus family hidden in the crawlspace under its floorboards.
export function Floorboard() {
  const [open, setOpen] = useState(false)
  const board = useRef()
  const t = useRef(0)
  useFrame((_, dt) => {
    t.current = THREE.MathUtils.damp(t.current, open ? 1 : 0, 6, dt)
    if (board.current) board.current.rotation.z = t.current * 1.9
  })
  const { x0, x1, z0, z1 } = HATCH
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0
  const plank = standardMat({ kind: 'wood', tint: '#4a2e1c', wear: 0.3, seed: 'ib-board' })
  const kitchenFloor = standardMat({ kind: 'wood', tint: '#6a4a30', wear: 0.5, seed: 'ib-kfloor' })
  const stone = standardMat({ kind: 'concrete', tint: '#3a332c', wear: 0.5, seed: 'ib-pit' })
  return (
    <group>
      {/* the pit */}
      {/* the crawlspace floor glows faintly, lamplight through the boards, so the family reads as shapes */}
      <mesh position={[cx, -0.9, cz]}><boxGeometry args={[w, 0.02, d]} /><meshStandardMaterial color="#3a2a1a" emissive="#d9904a" emissiveIntensity={0.35} roughness={0.9} /></mesh>
      {[[cx, -0.45, z0, w, 0.9, 0.02], [cx, -0.45, z1, w, 0.9, 0.02], [x0, -0.45, cz, 0.02, 0.9, d], [x1, -0.45, cz, 0.02, 0.9, d]].map(([x, y, z, a, b, c], i) => (
        <mesh key={i} position={[x, y, z]} material={stone}><boxGeometry args={[a, b, c]} /></mesh>
      ))}
      {/* the kitchen, cut away over half the pit so the crawlspace shows */}
      <mesh position={[cx + w * 0.3, -0.42, cz]} material={kitchenFloor}><boxGeometry args={[w * 0.4, 0.03, d - 0.04]} /></mesh>
      <mesh position={[cx + w * 0.3, -0.3, cz]} material={plank}><boxGeometry args={[0.28, 0.02, 0.18]} /></mesh>
      {[[-0.1, 0], [0.1, 0]].map(([dx], i) => (
        <mesh key={i} position={[cx + w * 0.3 + dx * 1.6, -0.36, cz + (i ? 0.13 : -0.13)]} material={plank}><boxGeometry args={[0.07, 0.1, 0.07]} /></mesh>
      ))}
      {/* the glass of milk and the pipe on the table */}
      <mesh position={[cx + w * 0.26, -0.275, cz + 0.03]} material={white}><cylinderGeometry args={[0.012, 0.01, 0.035, 12]} /></mesh>
      <mesh position={[cx + w * 0.36, -0.285, cz - 0.04]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.006, 0.012, 0.05, 8]} /><meshStandardMaterial color="#c8a86a" roughness={0.6} /></mesh>
      {/* the family, lying still under the boards */}
      {[-0.22, -0.07, 0.08, 0.2].map((dz, i) => (
        <group key={i} position={[cx - w * 0.12 - (i % 2) * 0.14, -0.86, cz + dz * 0.9]} rotation={[0, Math.PI / 2 + 0.15 * (i - 1.5), 0]} scale={1.5}>
          <mesh material={hiddenMat} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.022, i === 3 ? 0.07 : 0.1, 4, 8]} /></mesh>
          <mesh material={hiddenMat} position={[-(i === 3 ? 0.07 : 0.085), 0, 0]}><sphereGeometry args={[0.02, 10, 8]} /></mesh>
        </group>
      ))}
      {/* the glass you stand on */}
      <mesh position={[cx, -0.004, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#a8b8b0" transparent opacity={0.16} roughness={0.05} metalness={0.3} />
      </mesh>
      {/* the loose board, hinged on its wall side */}
      <Touchable reach={2.2} foley="creak" anchor={[cx, 0.05, cz]} onUse={() => setOpen((o) => !o)}>
        <group position={[x0, 0.018, cz]}>
          <group ref={board}>
            <mesh position={[w / 2, 0, 0]} material={plank}><boxGeometry args={[w, 0.035, d]} /></mesh>
          </group>
        </group>
      </Touchable>
    </group>
  )
}

// ---------------------------------------------------------------- chapter 2
// A glass case under the second card: the ravine, the tunnel, the bat.
function Vitrine() {
  const [lit, setLit] = useState(false)
  const glow = useRef()
  useFrame((_, dt) => {
    if (glow.current) glow.current.emissiveIntensity = THREE.MathUtils.damp(glow.current.emissiveIntensity, lit ? 2.4 : 0.05, 4, dt)
  })
  const { x, z, w, d, h } = VITRINE
  const wood = standardMat({ kind: 'wood', tint: '#2a1a10', wear: 0.2, seed: 'ib-vit', roughness: 0.5 })
  const rock = standardMat({ kind: 'concrete', tint: '#4c4a3e', wear: 0.6, seed: 'ib-rock' })
  const fierce = FRAGMENTS.find((f) => f.where.includes('vitrine'))
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2 - 0.1, 0]} material={wood}><boxGeometry args={[w, h - 0.2, d]} /></mesh>
      <Touchable reach={2.2} foley="thunk" anchor={[0, h, 0]} onUse={() => setLit((v) => !v)}>
        <group position={[0, h - 0.1, 0]}>
          {/* the ravine floor and its back wall with the tunnel mouth */}
          <mesh position={[0, 0.01, 0]} material={rock}><boxGeometry args={[w - 0.04, 0.02, d - 0.04]} /></mesh>
          <mesh position={[-w / 2 + 0.06, 0.16, 0]} material={rock}><boxGeometry args={[0.06, 0.3, d - 0.06]} /></mesh>
          <mesh position={[-w / 2 + 0.095, 0.12, 0]} rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[0.1, 20, 0, Math.PI]} />
            <meshStandardMaterial ref={glow} color="#0a0806" emissive="#ffb060" emissiveIntensity={0.05} />
          </mesh>
          {/* the bat, leaning on a rock at the tunnel mouth */}
          <mesh position={[-w / 2 + 0.16, 0.1, 0.12]} rotation={[0.25, 0, 0.35]}><cylinderGeometry args={[0.006, 0.013, 0.2, 10]} /><meshStandardMaterial color="#b98a52" roughness={0.6} /></mesh>
          {/* Rachtman, seated, facing the dark */}
          <group position={[0.02, 0.05, -0.04]}>
            <mesh material={figureMat}><capsuleGeometry args={[0.02, 0.05, 4, 8]} /></mesh>
            <mesh material={figureMat} position={[0, 0.06, 0]}><sphereGeometry args={[0.018, 10, 8]} /></mesh>
          </group>
          {/* the others on the ridge */}
          {[0.1, 0.16, 0.22].map((dz, i) => (
            <group key={i} position={[0.12 + i * 0.03, 0.06, dz - 0.3]}>
              <mesh material={figureMat}><capsuleGeometry args={[0.017, 0.06, 4, 8]} /></mesh>
            </group>
          ))}
          {/* the glass hood */}
          <mesh position={[0, 0.18, 0]}>
            <boxGeometry args={[w, 0.36, d]} />
            <meshStandardMaterial color="#c8d6d0" transparent opacity={0.12} roughness={0.05} metalness={0.2} depthWrite={false} />
          </mesh>
        </group>
      </Touchable>
      {fierce && <Scrap text={'"' + fierce.text + '"'} pos={[w / 2 + 0.005, h - 0.28, 0]} ry={Math.PI / 2} w={0.56} size={52} />}
      <TentCard pos={[w / 2 + 0.2, 0.9, 0.28]} ry={Math.PI / 2 - 0.25} w={0.28}
        text={lit
          ? 'Chapter 2. A German sergeant will not talk. From the tunnel: a bat on stone, then Donowitz.'
          : 'The ravine. Touch the case.'} />
    </group>
  )
}

// ---------------------------------------------------------------- the counter
// Two things Landa ordered, one per chapter.
function Concession() {
  const { x, z0, z1, h } = COUNTER
  const wood = standardMat({ kind: 'wood', tint: '#3a2416', wear: 0.2, seed: 'ib-counter', roughness: 0.5 })
  const d = z1 - z0
  return (
    <group>
      <mesh position={[x, h / 2, (z0 + z1) / 2]} material={wood}><boxGeometry args={[0.8, h, d]} /></mesh>
      <mesh position={[x, h + 0.015, (z0 + z1) / 2]}><boxGeometry args={[0.86, 0.03, d + 0.06]} /><meshStandardMaterial color="#8a6a36" metalness={0.8} roughness={0.35} /></mesh>
      {/* a glass of milk */}
      <mesh position={[x - 0.1, h + 0.09, z0 + 0.45]} material={white}><cylinderGeometry args={[0.035, 0.03, 0.14, 20]} /></mesh>
      <TentCard pos={[x - 0.22, h + 0.03, z0 + 0.18]} ry={-Math.PI / 2} w={0.26}
        text="Chapter 1. Landa asks the farmer for a glass of milk, then drinks it all." />
      {/* strudel, with the cream, on a plate */}
      <group position={[x - 0.1, h + 0.03, z1 - 0.35]}>
        <mesh><cylinderGeometry args={[0.12, 0.11, 0.015, 28]} /><meshStandardMaterial color="#f4efe6" roughness={0.4} /></mesh>
        <mesh position={[0, 0.03, 0]} rotation={[0, 0.4, 0]}><boxGeometry args={[0.12, 0.04, 0.05]} /><meshStandardMaterial color="#c08a4a" roughness={0.7} /></mesh>
        <mesh position={[0.05, 0.03, 0.04]}><sphereGeometry args={[0.028, 14, 10]} /><meshStandardMaterial color="#fbf7ee" roughness={0.5} /></mesh>
      </group>
      <TentCard pos={[x - 0.22, h + 0.03, z1 - 0.62]} ry={-Math.PI / 2} w={0.26}
        text="Chapter 3. Landa orders her the strudel, and waits for the cream. She knows exactly who he is." />
    </group>
  )
}

export default function LobbyProps() {
  const interwoven = FRAGMENTS.find((f) => f.where.includes('lobby'))
  return (
    <group>
      <Floorboard />
      <Vitrine />
      <Concession />
      {/* his line, on the back wall over the way in to the auditorium */}
      {interwoven && <Scrap text={'"' + interwoven.text + '"'} pos={[1.4, 2.7, -9.72]} w={2.1} rot={-0.03} size={64} />}
    </group>
  )
}
