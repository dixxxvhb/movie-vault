import React, { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Slab, Fan } from '../../kit/architecture.jsx'
import { makePaintedTexture } from './basterdsTextures.js'
import { BOOTH_Y, rakeAt } from './zones.js'

// LE GAMAAR: the upper walls. Above the cases and the dado, the plaster used
// to run bare to the cornice. Now each bay between pilasters carries a tall
// recessed panel outlined in gold with a small fan at its head, and a frieze of
// deco chevrons runs under the cornice all the way round the house.

const WEST = -8.8, EAST = 8.0
const CORNICE_Y = 7.55
const FRIEZE = [6.98, 7.5]
const W_BAYS = [[-13.3, -14.14], [-14.66, -17.54], [-18.06, -20.94], [-21.46, -24.34], [-24.86, -27.74], [-28.26, -31.5]]
const E_BAYS = [[-14.66, -17.04], [-24.96, -27.74], [-28.26, -31.5]]

function paintFrieze(c) {
  const ctx = c.getContext('2d'), W = c.width, H = c.height
  ctx.fillStyle = '#3e0c0c'; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#c9a25a'; ctx.lineWidth = 5
  ctx.strokeRect(0, 6, W, H - 12)
  ctx.lineWidth = 4
  for (let x = 0; x < W; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, H - 18); ctx.lineTo(x + 32, 18); ctx.lineTo(x + 64, H - 18); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x + 16, H - 18); ctx.lineTo(x + 32, 44); ctx.lineTo(x + 48, H - 18); ctx.stroke()
  }
}

// A frieze strip in the plane x = `x` (facing ±x) or z = `z` (facing ±z).
function Frieze({ axis, at, a, b, facing, mat }) {
  const len = Math.abs(b - a), mid = (a + b) / 2, y = (FRIEZE[0] + FRIEZE[1]) / 2
  const pos = axis === 'x' ? [at, y, mid] : [mid, y, at]
  const ry = axis === 'x' ? (facing > 0 ? Math.PI / 2 : -Math.PI / 2) : (facing > 0 ? 0 : Math.PI)
  const m = useMemo(() => {
    const mm = mat.clone(); mm.map = mat.map.clone(); mm.map.needsUpdate = true
    mm.map.repeat.set(len / 0.5, 1); mm.emissiveMap = mm.map
    return mm
  }, [mat, len])
  useEffect(() => () => m.dispose(), [m])
  return (
    <mesh position={pos} rotation={[0, ry, 0]} material={m}>
      <planeGeometry args={[len, FRIEZE[1] - FRIEZE[0]]} />
    </mesh>
  )
}

// A tall recessed panel in a wall bay: a darker field, a gold outline, a fan.
function Panel({ x, facing, z0, z1, y0, y1, m }) {
  const inset = 0.28
  const za = Math.max(z0, z1) - inset, zb = Math.min(z0, z1) + inset
  if (za - zb < 0.6) return null
  const d = 0.02 * facing
  const t = 0.035
  const xf = x + facing * 0.012
  return (
    <group>
      <Slab x0={Math.min(x, xf)} x1={Math.max(x, xf)} y0={y0} y1={y1} z0={zb} z1={za} mat={m.field} />
      {[[y0, y0 + t], [y1 - t, y1]].map(([a, b]) => (
        <Slab key={a} x0={Math.min(x, x + d * 2)} x1={Math.max(x, x + d * 2)} y0={a} y1={b} z0={zb} z1={za} mat={m.gold} />
      ))}
      {[[zb, zb + t], [za - t, za]].map(([a, b]) => (
        <Slab key={a} x0={Math.min(x, x + d * 2)} x1={Math.max(x, x + d * 2)} y0={y0} y1={y1} z0={a} z1={b} mat={m.gold} />
      ))}
      <Fan pos={[x + facing * 0.03, y1 - 0.5, (za + zb) / 2]} ry={facing > 0 ? Math.PI / 2 : -Math.PI / 2} r={0.36} rays={9} mat={m.gold} />
    </group>
  )
}

export default function UpperWalls() {
  const m = useMemo(() => ({
    gold: new THREE.MeshStandardMaterial({ color: '#b08a42', metalness: 0.9, roughness: 0.3, emissive: '#7a5520', emissiveIntensity: 0.45 }),
    field: new THREE.MeshStandardMaterial({ color: '#5a3c26', roughness: 0.85 }),
  }), [])
  const frieze = useMemo(() => {
    const t = makePaintedTexture(512, 64, paintFrieze)
    t.wrapS = THREE.RepeatWrapping
    return new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.45, roughness: 0.6 })
  }, [])
  return (
    <group>
      {/* the frieze under the cornice: both side walls, the back wall over the balcony, the stair */}
      <Frieze axis="x" at={WEST + 0.015} a={-31.6} b={-13.2} facing={1} mat={frieze} />
      <Frieze axis="x" at={EAST - 0.015} a={-31.6} b={-13.2} facing={-1} mat={frieze} />
      <Frieze axis="z" at={-5.02} a={-10} b={9.8} facing={-1} mat={frieze} />
      <Frieze axis="x" at={-9.985} a={-13.2} b={-5} facing={1} mat={frieze} />
      <Frieze axis="x" at={9.785} a={-13.2} b={-5} facing={-1} mat={frieze} />

      {/* panels in every free bay, from above the cases to under the frieze */}
      {W_BAYS.map(([a, b]) => (
        <Panel key={'w' + a} x={WEST} facing={1} z0={a} z1={b} y0={rakeAt((a + b) / 2) + 4.05} y1={6.8} m={m} />
      ))}
      {E_BAYS.map(([a, b]) => (
        <Panel key={'e' + a} x={EAST} facing={-1} z0={a} z1={b} y0={rakeAt((a + b) / 2) + 1.45} y1={6.8} m={m} />
      ))}
      {/* the back wall over the balcony: two tall panels either side of the booth */}
      {[[-9.6, -4.9], [2.5, 9.4]].map(([a, b]) => (
        <group key={a} position={[0, 0, 0]}>
          <Slab x0={a + 0.3} x1={b - 0.3} y0={BOOTH_Y + 2.6} y1={6.8} z0={-5.02} z1={-5.0} mat={m.field} />
          <Slab x0={a + 0.3} x1={b - 0.3} y0={6.76} y1={6.8} z0={-5.04} z1={-5.0} mat={m.gold} />
          <Slab x0={a + 0.3} x1={b - 0.3} y0={BOOTH_Y + 2.6} y1={BOOTH_Y + 2.64} z0={-5.04} z1={-5.0} mat={m.gold} />
          <Fan pos={[(a + b) / 2, 6.2, -5.02]} ry={Math.PI} r={0.5} rays={11} mat={m.gold} />
        </group>
      ))}
    </group>
  )
}
