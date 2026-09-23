import React, { useMemo } from 'react'
import * as THREE from 'three'
import { standardMat } from '../../materials.js'
import { BOOTH_Y, BOOTH, BAR_Y, APRON_Y, rakeAt, ROOM_DOORS } from './zones.js'

// LE GAMAAR: THE ROOM. One volume, the auditorium on premiere night
// (docs/films/inglourious-basterds.md). Stalls on the rake, the back crossing
// under the balcony front, the balcony and the booth with its round port, the
// stair up the north-west corner, the proscenium, the wings, and La Louisiane
// in the arch under the Box.
//
// Everything here is authored as architecture, not derived from footprints:
// the footprints (zones.js) only decide where you can stand.

export const CEIL_Y = 8.6
const T = 0.14        // wall thickness

// An axis-aligned slab from corner to corner.
function Slab({ x0, x1, y0, y1, z0, z1, mat }) {
  return (
    <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]} material={mat}>
      <boxGeometry args={[Math.max(0.001, x1 - x0), Math.max(0.001, y1 - y0), Math.max(0.001, z1 - z0)]} />
    </mesh>
  )
}

// A wall in the x/y plane at z, with one rectangular or round hole.
function HoledWall({ x0, x1, y0, y1, z, hole, mat, facing = 1 }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(x0, y0); s.lineTo(x1, y0); s.lineTo(x1, y1); s.lineTo(x0, y1); s.closePath()
    const h = new THREE.Path()
    if (hole.r) h.absarc(hole.x, hole.y, hole.r, 0, Math.PI * 2, true)
    else { h.moveTo(hole.x0, hole.y0); h.lineTo(hole.x0, hole.y1); h.lineTo(hole.x1, hole.y1); h.lineTo(hole.x1, hole.y0); h.closePath() }
    s.holes.push(h)
    const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 40 })
    g.translate(0, 0, -T / 2)
    return g
  }, [x0, x1, y0, y1, hole.r, hole.x, hole.y, hole.x0, hole.x1, hole.y0, hole.y1])
  return <mesh geometry={geo} position={[0, 0, z]} rotation={[0, facing < 0 ? Math.PI : 0, 0]} material={mat} />
}

export default function Hall() {
  const m = useMemo(() => ({
    plaster: standardMat({ kind: 'plaster', tint: '#8c6d4c', wear: 0.35, seed: 'ib-hall-plaster' }),
    upper: standardMat({ kind: 'plaster', tint: '#6e4f36', wear: 0.3, seed: 'ib-hall-upper' }),
    velvet: new THREE.MeshStandardMaterial({ color: '#5a1413', roughness: 0.95 }),
    gold: new THREE.MeshStandardMaterial({ color: '#a5823e', metalness: 0.85, roughness: 0.32 }),
    lacquer: new THREE.MeshStandardMaterial({ color: '#1a1210', roughness: 0.35, metalness: 0.2 }),
    ceil: standardMat({ kind: 'plaster', tint: '#3c2c20', wear: 0.2, seed: 'ib-hall-ceil' }),
    wood: standardMat({ kind: 'wood', tint: '#3a2416', wear: 0.3, seed: 'ib-hall-wood', roughness: 0.5 }),
    stage: standardMat({ kind: 'wood', tint: '#2a1a10', wear: 0.4, seed: 'ib-hall-stage' }),
  }), [])

  const B = BOOTH, BY = BOOTH_Y
  const barTop = BAR_Y + 2.5
  return (
    <group>
      {/* --- the outer shell -------------------------------------------- */}
      {/* west wall of the stalls (the chapter cases hang here) */}
      <Slab x0={-8.8 - T} x1={-8.8} y0={APRON_Y} y1={CEIL_Y} z0={-31.6} z1={-13.2} mat={m.plaster} />
      {/* west wall of the stair */}
      <Slab x0={-10 - T} x1={-10} y0={-0.1} y1={CEIL_Y} z0={-13.2} z1={-5} mat={m.plaster} />
      {/* the back wall, behind the balcony */}
      <Slab x0={-10} x1={9.8} y0={-0.1} y1={CEIL_Y} z0={-5} z1={-5 + T} mat={m.upper} />
      {/* east walls: crossing and balcony, the corner, the stalls with the arch to the bar */}
      <Slab x0={9.8} x1={9.8 + T} y0={-0.1} y1={CEIL_Y} z0={-13.2} z1={-5} mat={m.plaster} />
      <Slab x0={8} x1={9.8} y0={-0.1} y1={CEIL_Y} z0={-13.2 - T} z1={-13.2} mat={m.plaster} />
      <Slab x0={8} x1={8 + T} y0={APRON_Y} y1={CEIL_Y} z0={-31.6} z1={-24.5} mat={m.plaster} />
      <Slab x0={8} x1={8 + T} y0={APRON_Y} y1={CEIL_Y} z0={-17.5} z1={-13.2} mat={m.plaster} />
      <Slab x0={8} x1={8 + T} y0={barTop} y1={CEIL_Y} z0={-24.5} z1={-17.5} mat={m.plaster} />
      <Slab x0={8} x1={8 + T} y0={APRON_Y} y1={BAR_Y} z0={-24.5} z1={-17.5} mat={m.plaster} />
      {/* the ceiling over the whole house */}
      <Slab x0={-10} x1={9.8} y0={CEIL_Y} y1={CEIL_Y + 0.1} z0={-31.6} z1={-5} mat={m.ceil} />

      {/* --- the back: the wall under the balcony, the doors, the balcony -- */}
      <Slab x0={-8.8} x1={ROOM_DOORS.x - ROOM_DOORS.w / 2} y0={-0.05} y1={BY - 0.25} z0={-11.0} z1={-11.0 + T} mat={m.plaster} />
      <Slab x0={ROOM_DOORS.x + ROOM_DOORS.w / 2} x1={9.8} y0={-0.05} y1={BY - 0.25} z0={-11.0} z1={-11.0 + T} mat={m.plaster} />
      <Slab x0={ROOM_DOORS.x - ROOM_DOORS.w / 2} x1={ROOM_DOORS.x + ROOM_DOORS.w / 2} y0={2.5} y1={BY - 0.25} z0={-11.0} z1={-11.0 + T} mat={m.plaster} />
      <Slab x0={-8.8} x1={9.8} y0={BY - 0.25} y1={BY} z0={-11.0} z1={-5} mat={m.upper} />
      {/* the balcony front: velvet panel, gold cap rail */}
      <Slab x0={-8.8} x1={9.8} y0={BY - 0.35} y1={BY + 0.95} z0={-11.12} z1={-10.94} mat={m.velvet} />
      <Slab x0={-8.8} x1={9.8} y0={BY + 0.95} y1={BY + 1.03} z0={-11.16} z1={-10.9} mat={m.gold} />
      <Slab x0={-8.8} x1={9.8} y0={BY - 0.42} y1={BY - 0.35} z0={-11.16} z1={-10.9} mat={m.gold} />

      {/* --- the stair up the north-west corner -------------------------- */}
      {Array.from({ length: 18 }, (_, k) => {
        const z = -12.4 + (k + 1) * (6.2 / 18)
        const y = (k + 1) * (BY / 18)
        return <Slab key={k} x0={-10} x1={-8.8} y0={-0.1} y1={y} z0={z - 6.2 / 18} z1={z} mat={m.wood} />
      })}
      <Slab x0={-8.84} x1={-8.76} y0={0} y1={BY + 1.0} z0={-12.3} z1={-6.4} mat={m.lacquer} />

      {/* --- the booth, in the balcony, with the round port ---------------- */}
      <HoledWall x0={B.minX} x1={B.maxX} y0={BY} y1={BY + 2.6} z={B.minZ}
        hole={{ r: 0.72, x: -0.3, y: BY + 1.45 }} mat={m.lacquer} />
      <Slab x0={B.minX - T} x1={B.minX} y0={BY} y1={BY + 2.6} z0={B.minZ} z1={B.maxZ} mat={m.lacquer} />
      <Slab x0={B.maxX} x1={B.maxX + T} y0={BY} y1={BY + 2.6} z0={B.minZ} z1={-6.9} mat={m.lacquer} />
      <Slab x0={B.maxX} x1={B.maxX + T} y0={BY + 2.35} y1={BY + 2.6} z0={-6.9} z1={B.maxZ} mat={m.lacquer} />
      <Slab x0={B.minX - T} x1={B.maxX + T} y0={BY + 2.6} y1={BY + 2.7} z0={B.minZ} z1={B.maxZ} mat={m.lacquer} />
      {/* the port's brass ring */}
      <mesh position={[-0.3, BY + 1.45, B.minZ - T / 2 - 0.01]} material={m.gold}><torusGeometry args={[0.74, 0.05, 12, 48]} /></mesh>

      {/* --- the proscenium, the stage, the wings -------------------------- */}
      {/* the arch: piers either side (each with a wing door), and the header */}
      {[[-8.8, -8.0], [-7.1, -5.5], [5.5, 7.0], [7.9, 8.1]].map(([a, b]) => (
        <Slab key={a} x0={a} x1={b} y0={APRON_Y} y1={3.2} z0={-31.73} z1={-31.6} mat={m.upper} />
      ))}
      {[[-8.0, -7.1], [7.0, 7.9]].map(([a, b]) => (
        <Slab key={a} x0={a} x1={b} y0={APRON_Y + 2.2} y1={3.2} z0={-31.73} z1={-31.6} mat={m.upper} />
      ))}
      <Slab x0={-8.8} x1={8.1} y0={3.2} y1={CEIL_Y} z0={-31.73} z1={-31.6} mat={m.upper} />
      <Slab x0={-8.8} x1={8} y0={APRON_Y - 0.4} y1={APRON_Y} z0={-31.6} z1={-29.9} mat={m.stage} />
      {/* behind the screen: its own dark box */}
      <Slab x0={-8.1} x1={8.0} y0={APRON_Y} y1={APRON_Y + 5.5} z0={-34.6 - T} z1={-34.6} mat={m.plaster} />
      <Slab x0={-8.1 - T} x1={-8.1} y0={APRON_Y} y1={APRON_Y + 5.5} z0={-34.6} z1={-31.66} mat={m.plaster} />
      <Slab x0={7.9} x1={7.9 + T} y0={APRON_Y} y1={APRON_Y + 5.5} z0={-34.6} z1={-31.66} mat={m.plaster} />
      <Slab x0={-8.1} x1={8.0} y0={APRON_Y + 5.5} y1={APRON_Y + 5.6} z0={-34.6} z1={-31.66} mat={m.ceil} />

      {/* --- La Louisiane: the arch under the Box -------------------------- */}
      <Slab x0={15} x1={15 + T} y0={BAR_Y} y1={barTop} z0={-26} z1={-16} mat={m.upper} />
      <Slab x0={8} x1={15} y0={BAR_Y} y1={barTop} z0={-26 - T} z1={-26} mat={m.upper} />
      <Slab x0={8} x1={15} y0={BAR_Y} y1={barTop} z0={-16} z1={-16 + T} mat={m.upper} />
      <Slab x0={8} x1={15} y0={BAR_Y} y1={BAR_Y + 0.02} z0={-26} z1={-16} mat={m.wood} />
      <Slab x0={8} x1={15} y0={barTop} y1={barTop + 0.08} z0={-26} z1={-16} mat={m.ceil} />
      {/* a low rail across the arch, with the way in at the middle */}
      <Slab x0={7.96} x1={8.08} y0={BAR_Y} y1={BAR_Y + 0.95} z0={-24.5} z1={-21.6} mat={m.lacquer} />
      <Slab x0={7.96} x1={8.08} y0={BAR_Y} y1={BAR_Y + 0.95} z0={-20.4} z1={-17.5} mat={m.lacquer} />
      <Slab x0={7.9} x1={8.14} y0={BAR_Y + 0.95} y1={BAR_Y + 1.0} z0={-24.5} z1={-17.5} mat={m.gold} />
      <Slab x0={7.9} x1={8.2} y0={barTop - 0.12} y1={barTop} z0={-24.6} z1={-17.4} mat={m.gold} />
    </group>
  )
}

// the rake height at a z, for anything that sits on the stalls floor
export { rakeAt }
