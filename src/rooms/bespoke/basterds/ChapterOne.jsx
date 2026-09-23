import React, { useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import Touchable from '../../Touchable.jsx'
import { standardMat } from '../../materials.js'
import { HATCH } from './zones.js'

// LE GAMAAR: chapter 1 under the floor, in the back crossing by the doors.

const white = new THREE.MeshStandardMaterial({ color: '#e9e2d2', roughness: 0.7 })
// the family under the floor reads as shadows against the lamplight
const hiddenMat = new THREE.MeshStandardMaterial({ color: '#140d08', roughness: 1 })

// ---------------------------------------------------------------- chapter 1
// A loose board in the crossing floor by the doors. Lift it: glass set into the floor,
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
