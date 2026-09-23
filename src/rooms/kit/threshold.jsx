import React, { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import Touchable from '../Touchable.jsx'

// THE KIT: the Threshold (docs/VAULT-TWO-SCENE-STANDARD.md §2). The Arrival
// and the Room share no floor; you go between them through a designed cut.
//
//   cutTo(go)     fades to black over ~0.4 s, calls go() while it's black (fly
//                 the rig there), then fades back up. Timers, not frames, so it
//                 still plays in a preview pane that isn't ticking.
//   DoubleDoors   a pair of doors that swing away from you when used; pass
//                 `open` to drive them and `onUse` to start the cut.
//
// Gotcha (pilot lesson 4): if walking into the doorway also triggers the cut,
// ignore that trigger for a moment after any rig flight, or a ?spot= flight
// that passes the doorway will trip it.

export function cutTo(go, { fadeIn = 380, hold = 830, fadeOut = 700 } = {}) {
  const el = document.createElement('div')
  el.style.cssText = `position:fixed;inset:0;z-index:1900;background:#000;opacity:0;transition:opacity ${fadeIn}ms ease;pointer-events:none`
  document.body.appendChild(el)
  requestAnimationFrame(() => { el.style.opacity = '1' })
  setTimeout(go, fadeIn + 40)
  setTimeout(() => { el.style.transition = `opacity ${fadeOut}ms ease`; el.style.opacity = '0' }, fadeIn + hold)
  setTimeout(() => el.remove(), fadeIn + hold + fadeOut + 100)
}

export function DoubleDoors({ pos, ry = 0, w = 2.2, h = 2.5, glass = true, open, onUse, mat, glow = '#ffb35e', brass = '#b89045' }) {
  const L = useRef(), R = useRef()
  const t = useRef(0)
  useFrame((_, dt) => {
    t.current = THREE.MathUtils.damp(t.current, open ? 1 : 0, 7, dt)
    if (L.current) L.current.rotation.y = t.current * 1.35
    if (R.current) R.current.rotation.y = -t.current * 1.35
  })
  const leaf = (sign) => (
    <group>
      <mesh position={[sign * w / 4, h / 2, 0]} material={mat}><boxGeometry args={[w / 2 - 0.02, h, 0.06]} /></mesh>
      {glass && (
        <mesh position={[sign * w / 4, h * 0.58, 0.035]}>
          <planeGeometry args={[w / 2 - 0.3, h * 0.55]} />
          <meshStandardMaterial color="#0d0907" emissive={glow} emissiveIntensity={0.35} roughness={0.08} metalness={0.6} />
        </mesh>
      )}
      <mesh position={[sign * 0.08, h * 0.48, 0.05]}><boxGeometry args={[0.03, 0.36, 0.03]} /><meshStandardMaterial color={brass} metalness={0.9} roughness={0.25} /></mesh>
    </group>
  )
  return (
    <group position={pos} rotation={[0, ry, 0]}>
      <Touchable reach={2.6} foley="creak" anchor={[0, 1.3, 0]} onUse={onUse}>
        {/* each leaf hinges on its outer edge */}
        <group position={[-w / 2, 0, 0]} ref={L}><group position={[w / 2, 0, 0]}>{leaf(-1)}</group></group>
        <group position={[w / 2, 0, 0]} ref={R}><group position={[-w / 2, 0, 0]}>{leaf(1)}</group></group>
      </Touchable>
    </group>
  )
}
