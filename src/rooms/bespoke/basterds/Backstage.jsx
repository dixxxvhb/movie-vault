import React, { useMemo } from 'react'
import * as THREE from 'three'
import { Slab } from '../../kit/architecture.jsx'
import { APRON_Y } from './zones.js'

// LE GAMAAR: behind the screen, dressed as a stage house instead of a box.
// A fly rail up the east wall with its ropes coming down to a pin rail,
// sandbags hanging as counterweights, the frame the screen is laced to, a cage
// on the work light. The nitrate, Marcel and the cigarette are Theatre's.

const Y = APRON_Y
const TOP = Y + 5.5

export default function Backstage() {
  const m = useMemo(() => ({
    iron: new THREE.MeshStandardMaterial({ color: '#2a2622', metalness: 0.7, roughness: 0.45 }),
    wood: new THREE.MeshStandardMaterial({ color: '#4a3422', roughness: 0.8 }),
    rope: new THREE.MeshStandardMaterial({ color: '#b8a27a', roughness: 0.95 }),
    canvas: new THREE.MeshStandardMaterial({ color: '#8a8272', roughness: 0.95 }),
    sand: new THREE.MeshStandardMaterial({ color: '#6e6250', roughness: 1 }),
  }), [])
  const ropes = [5.2, 5.5, 5.8, 6.1, 6.4, 6.7, 7.0, 7.3]
  return (
    <group>
      {/* the screen's frame: a timber stretcher the canvas is laced to */}
      {[-5.05, 5.05].map((x) => <Slab key={x} x0={x - 0.06} x1={x + 0.06} y0={Y} y1={Y + 4.8} z0={-31.66} z1={-31.54} mat={m.wood} />)}
      {[Y + 0.4, Y + 4.72].map((y) => <Slab key={y} x0={-5.1} x1={5.1} y0={y - 0.06} y1={y + 0.06} z0={-31.66} z1={-31.54} mat={m.wood} />)}
      {[-2.5, 0, 2.5].map((x) => <Slab key={x} x0={x - 0.04} x1={x + 0.04} y0={Y} y1={Y + 0.4} z0={-31.64} z1={-31.56} mat={m.wood} />)}

      {/* the fly rail: a gallery high on the east wall, ropes down to the pin rail */}
      <Slab x0={4.8} x1={7.9} y0={TOP - 1.1} y1={TOP - 1.0} z0={-34.6} z1={-33.7} mat={m.wood} />
      <Slab x0={4.8} x1={7.9} y0={TOP - 1.0} y1={TOP - 0.94} z0={-33.74} z1={-33.7} mat={m.iron} />
      <Slab x0={4.8} x1={7.9} y0={Y + 1.05} y1={Y + 1.15} z0={-34.5} z1={-34.35} mat={m.iron} />
      {ropes.map((x, k) => (
        <group key={x}>
          <mesh position={[x, Y + (TOP - Y) / 2 + 0.55, -34.42]} material={m.rope}><cylinderGeometry args={[0.012, 0.012, TOP - Y - 1.1, 5]} /></mesh>
          {/* a belaying pin through the rail */}
          <mesh position={[x, Y + 1.1, -34.42]} rotation={[Math.PI / 2, 0, 0]} material={m.wood}><cylinderGeometry args={[0.018, 0.022, 0.3, 8]} /></mesh>
          {/* every other line carries a sandbag */}
          {k % 2 === 0 && (
            <group position={[x, Y + 2.2 + (k % 3) * 0.6, -34.3]}>
              <mesh material={m.sand} scale={[1, 1.3, 0.8]}><sphereGeometry args={[0.16, 10, 8]} /></mesh>
              <mesh position={[0, 0.25, 0]} material={m.rope}><cylinderGeometry args={[0.01, 0.01, 0.3, 5]} /></mesh>
            </group>
          )}
        </group>
      ))}
      {/* a batten flown out, hanging level over the stage */}
      <Slab x0={-6.8} x1={6.8} y0={TOP - 0.55} y1={TOP - 0.48} z0={-33.1} z1={-33.02} mat={m.iron} />
      {[-5, 0, 5].map((x) => <mesh key={x} position={[x, TOP - 0.25, -33.06]} material={m.rope}><cylinderGeometry args={[0.008, 0.008, 0.5, 5]} /></mesh>)}
      {/* the cage round the work light */}
      <mesh position={[1.0, Y + 2.4, -32.9]}><sphereGeometry args={[0.1, 8, 6]} /><meshStandardMaterial color="#2a2622" wireframe /></mesh>
    </group>
  )
}
