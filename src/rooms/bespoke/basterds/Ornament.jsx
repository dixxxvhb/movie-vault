import React, { useMemo } from 'react'
import * as THREE from 'three'
import { Slab, Curtain, Fan, Sconce, FloorBand, FloorRunner, useGlow } from '../../kit/architecture.jsx'
import { makePaintedTexture } from './basterdsTextures.js'
import { APRON_Y, BOOTH_Y, rakeAt } from './zones.js'
import { CEIL_Y } from './Hall.jsx'
import { Scrap } from './LobbyProps.jsx'
import { FRAGMENTS } from './content.js'

// LE GAMAAR: the picture palace. Hero frame 1 (docs/films/inglourious-basterds.md):
// from the doors, the screen inside a gold proscenium, velvet swagged back, the
// house glowing at its edges. 1930s Paris: stepped deco bands, a sunburst over
// the arch, lit organ-grille towers, fan sconces on the pilasters, a cove of
// light under the cornice, a rosette in the ceiling.

const ARCH = { x: 5.5, top: 3.2 }
const WEST = -8.8, EAST = 8.0
const PILASTERS_W = [-14.4, -17.8, -21.2, -24.6, -28.0]
const PILASTERS_E = [-14.4, -17.3, -24.7, -28.0]
const CORNICE_Y = 7.55

// A patterned carpet: oxblood with a small gold lattice.
function paintCarpet(c) {
  const ctx = c.getContext('2d'), W = c.width
  ctx.fillStyle = '#5c1714'; ctx.fillRect(0, 0, W, W)
  ctx.strokeStyle = 'rgba(196,150,70,0.45)'; ctx.lineWidth = 3
  for (let k = -W; k < W * 2; k += 64) {
    ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + W, W); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(k + W, 0); ctx.lineTo(k, W); ctx.stroke()
  }
  ctx.fillStyle = 'rgba(210,170,90,0.55)'
  for (let y = 0; y < W; y += 64) for (let x = 0; x < W; x += 64) { ctx.beginPath(); ctx.arc(x + 32, y, 5, 0, Math.PI * 2); ctx.fill() }
}

// THE BOX: an opera box on the east wall over the aisle, where Hitler and
// Goebbels sit. A velvet front that bulges into the house, gold rims, drapes
// tied back either side, a canopy with a fan on it, one lamp on the rail.
const BOX = { x: 6.25, z0: -24, z1: -19, y0: 2.95, y1: 3.95, top: 6.0 }
function OperaBox({ m, glow, lamp }) {
  const R = 9.1, sag = 0.35, cx = BOX.x - sag + R, zc = (BOX.z0 + BOX.z1) / 2
  const half = Math.asin((BOX.z1 - BOX.z0) / 2 / R)
  const arc = { thetaStart: -Math.PI / 2 - half, thetaLength: half * 2 }
  return (
    <group>
      <Slab x0={BOX.x - 0.3} x1={EAST} y0={BOX.y0 - 0.2} y1={BOX.y0} z0={BOX.z0} z1={BOX.z1} mat={m.velvetDark} />
      <mesh position={[cx, (BOX.y0 + BOX.y1) / 2, zc]} material={m.velvet}>
        <cylinderGeometry args={[R, R, BOX.y1 - BOX.y0, 32, 1, true, arc.thetaStart, arc.thetaLength]} />
      </mesh>
      {[BOX.y1, BOX.y0].map((y) => (
        <mesh key={y} position={[cx, y, zc]} rotation={[Math.PI / 2, 0, 0]} material={m.gold}>
          <torusGeometry args={[R, 0.05, 8, 64, arc.thetaLength]} />
        </mesh>
      ))}
      {/* the underside, a gold fan hanging under the bulge */}
      <Fan pos={[BOX.x - 0.36, BOX.y0 - 0.2, zc]} ry={-Math.PI / 2} r={0.9} rays={11} mat={m.gold} />
      {/* the canopy and its frame */}
      <Slab x0={BOX.x - 0.5} x1={EAST} y0={BOX.top} y1={BOX.top + 0.25} z0={BOX.z0 - 0.3} z1={BOX.z1 + 0.3} mat={m.cream} />
      <Slab x0={BOX.x - 0.55} x1={BOX.x - 0.45} y0={BOX.top} y1={BOX.top + 0.25} z0={BOX.z0 - 0.3} z1={BOX.z1 + 0.3} mat={m.gold} />
      <Fan pos={[BOX.x - 0.52, BOX.top + 0.25, zc]} ry={-Math.PI / 2} r={0.75} rays={11} mat={m.gold} glowMat={glow} />
      {[BOX.z0 - 0.2, BOX.z1 + 0.2].map((z) => (
        <Slab key={z} x0={BOX.x - 0.3} x1={BOX.x - 0.1} y0={BOX.y0 - 0.2} y1={BOX.top} z0={z - 0.12} z1={z + 0.12} mat={m.cream} />
      ))}
      {/* the drapes, tied back to either side (a local frame facing into the house) */}
      <group position={[BOX.x - 0.2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <Curtain x0={BOX.z0 - 0.1} x1={BOX.z0 + 0.9} y0={BOX.y1} y1={BOX.top} z={0} pleats={4} depth={0.06} tie={0.6} tieAt={0.45} side={-1} mat={m.velvet} />
        <Curtain x0={BOX.z1 - 0.9} x1={BOX.z1 + 0.1} y0={BOX.y1} y1={BOX.top} z={0} pleats={4} depth={0.06} tie={0.6} tieAt={0.45} side={1} mat={m.velvet} />
        <Curtain x0={BOX.z0 - 0.1} x1={BOX.z1 + 0.1} y0={BOX.top - 0.45} y1={BOX.top} z={0.05} pleats={12} depth={0.04} scallop={0.16} mat={m.velvet} />
      </group>
      <mesh position={[BOX.x - 0.28, BOX.y1 + 0.12, BOX.z1 - 0.4]} material={lamp}><sphereGeometry args={[0.07, 12, 10]} /></mesh>
    </group>
  )
}

export default function Ornament() {
  const m = useMemo(() => ({
    gold: new THREE.MeshStandardMaterial({ color: '#b08a42', metalness: 0.9, roughness: 0.28 }),
    cream: new THREE.MeshStandardMaterial({ color: '#cdb994', roughness: 0.7 }),
    velvet: new THREE.MeshStandardMaterial({ color: '#6a1414', roughness: 0.92, side: THREE.DoubleSide }),
    velvetDark: new THREE.MeshStandardMaterial({ color: '#3e0c0c', roughness: 0.95, side: THREE.DoubleSide }),
    black: new THREE.MeshStandardMaterial({ color: '#070606', roughness: 0.9 }),
    grille: new THREE.MeshStandardMaterial({ color: '#8a6e48', roughness: 0.6, metalness: 0.3 }),
  }), [])
  const glow = useGlow('#ffc070', 2.6)
  const cove = useGlow('#ffb35e', 3.2)
  const lamp = useGlow('#ffd9a0', 3.5)
  const carpet = useMemo(() => {
    const t = makePaintedTexture(256, 256, paintCarpet)
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1)
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 })
  }, [])

  const Z = -31.5
  return (
    <group>
      {/* --- the proscenium: three stepped bands, gold, cream, gold --------- */}
      {[[0, 0.18, m.gold, 0.14], [0.18, 0.55, m.cream, 0.1], [0.55, 0.72, m.gold, 0.2]].map(([a, b, mat, d], i) => (
        <group key={i}>
          <Slab x0={-ARCH.x - b} x1={-ARCH.x - a} y0={APRON_Y} y1={ARCH.top + b} z0={Z} z1={Z + d} mat={mat} />
          <Slab x0={ARCH.x + a} x1={ARCH.x + b} y0={APRON_Y} y1={ARCH.top + b} z0={Z} z1={Z + d} mat={mat} />
          <Slab x0={-ARCH.x - b} x1={ARCH.x + b} y0={ARCH.top + a} y1={ARCH.top + b} z0={Z} z1={Z + d} mat={mat} />
        </group>
      ))}
      {/* the sunburst over the arch */}
      <Fan pos={[0, ARCH.top + 0.74, Z + 0.06]} r={2.3} rays={17} mat={m.gold} glowMat={glow} />
      {/* his line, pinned to the arch beside the sunburst */}
      <Scrap text={'"' + FRAGMENTS.find((f) => f.where.includes('proscenium')).text + '"'} pos={[-4.15, ARCH.top + 1.15, Z + 0.24]} w={1.7} rot={0.04} size={60} />
      {/* the screen's black masking */}
      <Slab x0={-ARCH.x} x1={-5.0} y0={APRON_Y} y1={ARCH.top} z0={Z - 0.02} z1={Z} mat={m.black} />
      <Slab x0={5.0} x1={ARCH.x} y0={APRON_Y} y1={ARCH.top} z0={Z - 0.02} z1={Z} mat={m.black} />
      <Slab x0={-ARCH.x} x1={ARCH.x} y0={2.52} y1={ARCH.top} z0={Z - 0.02} z1={Z} mat={m.black} />
      <Slab x0={-ARCH.x} x1={ARCH.x} y0={APRON_Y} y1={-1.72} z0={Z - 0.02} z1={Z} mat={m.black} />

      {/* --- the curtains, tied back, and the valance with its gold fringe --- */}
      <Curtain x0={-ARCH.x} x1={-4.2} y0={APRON_Y} y1={ARCH.top} z={Z + 0.12} pleats={6} depth={0.08} tie={0.7} tieAt={0.42} side={-1} mat={m.velvet} />
      <Curtain x0={4.2} x1={ARCH.x} y0={APRON_Y} y1={ARCH.top} z={Z + 0.12} pleats={6} depth={0.08} tie={0.7} tieAt={0.42} side={1} mat={m.velvet} />
      <Curtain x0={-ARCH.x} x1={ARCH.x} y0={2.5} y1={ARCH.top} z={Z + 0.18} pleats={24} depth={0.05} scallop={0.22} mat={m.velvet} />
      <Slab x0={-ARCH.x} x1={ARCH.x} y0={2.46} y1={2.52} z0={Z + 0.16} z1={Z + 0.24} mat={m.gold} />
      {/* tie-back tassels */}
      {[-1, 1].map((s) => <mesh key={s} position={[s * (ARCH.x - 0.08), APRON_Y + 2.1, Z + 0.25]} material={m.gold}><sphereGeometry args={[0.07, 12, 10]} /></mesh>)}

      {/* --- the organ-grille towers either side of the arch, lit from inside */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Slab x0={s < 0 ? -8.0 : 6.4} x1={s < 0 ? -6.4 : 8.0} y0={0.4} y1={7.2} z0={Z} z1={Z + 0.1} mat={m.grille} />
          {[-0.5, 0, 0.5].map((dx) => (
            <Slab key={dx} x0={s * 7.2 + dx - 0.05} x1={s * 7.2 + dx + 0.05} y0={0.8} y1={6.8} z0={Z + 0.1} z1={Z + 0.13} mat={glow} />
          ))}
          <Fan pos={[s * 7.2, 7.2, Z + 0.12]} r={0.8} rays={9} mat={m.gold} />
        </group>
      ))}

      {/* --- the side walls: velvet dado, pilasters, sconces, the cornice cove */}
      {[[WEST + 0.01, 1, [[-31.6, -13.2]]], [EAST - 0.01, -1, [[-31.6, -24.5], [-17.5, -13.2]]]].map(([x, f, runs]) =>
        runs.map(([z0, z1]) => (
          <group key={x + ':' + z0}>
            <FloorBand x={x} z0={z0} z1={z1} h0={0} h1={1.15} floorY={rakeAt} mat={m.velvetDark} facing={f} />
            <FloorBand x={x + f * 0.02} z0={z0} z1={z1} h0={1.15} h1={1.22} floorY={rakeAt} mat={m.gold} facing={f} />
          </group>
        )))}
      {[[WEST, 1, PILASTERS_W], [EAST, -1, PILASTERS_E]].map(([x, f, zs]) => zs.map((z) => (
        <group key={x + ':' + z}>
          <Slab x0={f > 0 ? x : x - 0.12} x1={f > 0 ? x + 0.12 : x} y0={rakeAt(z)} y1={CORNICE_Y} z0={z - 0.26} z1={z + 0.26} mat={m.cream} />
          <Slab x0={f > 0 ? x : x - 0.18} x1={f > 0 ? x + 0.18 : x} y0={CORNICE_Y - 0.5} y1={CORNICE_Y - 0.36} z0={z - 0.32} z1={z + 0.32} mat={m.gold} />
          <Sconce pos={[x + f * 0.13, rakeAt(z) + 3.2, z]} ry={f > 0 ? Math.PI / 2 : -Math.PI / 2} scale={2.1} gold={m.gold} glow={glow} />
        </group>
      )))}
      {/* the cornice, and the cove light tucked on top of it */}
      {[[WEST, 1], [EAST, -1]].map(([x, f]) => (
        <group key={x}>
          <Slab x0={f > 0 ? x : x - 0.4} x1={f > 0 ? x + 0.4 : x} y0={CORNICE_Y} y1={CORNICE_Y + 0.22} z0={-31.6} z1={-11} mat={m.cream} />
          <Slab x0={f > 0 ? x + 0.05 : x - 0.35} x1={f > 0 ? x + 0.35 : x - 0.05} y0={CORNICE_Y + 0.22} y1={CORNICE_Y + 0.26} z0={-31.4} z1={-11.2} mat={cove} />
        </group>
      ))}

      <OperaBox m={m} glow={glow} lamp={lamp} />

      {/* --- the ceiling rosette over the stalls ---------------------------- */}
      <group position={[0, CEIL_Y - 0.02, -21.5]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={m.gold}><torusGeometry args={[3.4, 0.08, 8, 64]} /></mesh>
        <mesh material={cove}><torusGeometry args={[3.0, 0.05, 8, 64]} /></mesh>
        <mesh material={m.gold}><torusGeometry args={[2.2, 0.06, 8, 64]} /></mesh>
        <mesh material={m.gold}><torusGeometry args={[0.9, 0.06, 8, 48]} /></mesh>
        {Array.from({ length: 24 }, (_, k) => {
          const a = (k / 24) * Math.PI * 2
          return <mesh key={k} material={m.gold} position={[Math.cos(a) * 1.55, Math.sin(a) * 1.55, 0]} rotation={[0, 0, a]}><boxGeometry args={[1.3, 0.04, 0.04]} /></mesh>
        })}
      </group>

      {/* --- the balcony front: gold panel dividers, little lamps on the rail */}
      {Array.from({ length: 13 }, (_, k) => -8.4 + k * 1.5).filter((x) => x < -3.3 || x > 2.2).map((x) => (
        <group key={x}>
          <Slab x0={x - 0.03} x1={x + 0.03} y0={BOOTH_Y - 0.35} y1={BOOTH_Y + 0.95} z0={-11.18} z1={-11.12} mat={m.gold} />
          <mesh position={[x + 0.75, BOOTH_Y + 1.1, -11.03]} material={lamp}><sphereGeometry args={[0.045, 10, 8]} /></mesh>
        </group>
      ))}

      {/* --- carpet down the aisles ----------------------------------------- */}
      <FloorRunner x0={-0.95} x1={0.95} z0={-13.2} z1={-30} floorY={rakeAt} mat={carpet} />
      <FloorRunner x0={-8.6} x1={-6.8} z0={-13.2} z1={-30} floorY={rakeAt} mat={carpet} />
      <FloorRunner x0={6.8} x1={7.9} z0={-13.2} z1={-30} floorY={rakeAt} mat={carpet} />
    </group>
  )
}
