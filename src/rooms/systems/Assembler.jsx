import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// {period}: props fly in from below, lock, later un-build one wall and
// rebuild (the-sting). Wraps children; on a clock-driven cycle it lifts the
// whole group up from below into place, holds, then drops one arbitrary
// child (the "wall") back down and flies it back in.
export default function Assembler({ period = 80, children }) {
  const group = useRef()
  const wallIndex = useRef(0)
  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime % period
    // first 2.5s of each cycle: everything settles in from below
    const buildT = Math.min(1, t / 2.5)
    const ease = buildT * buildT * (3 - 2 * buildT)
    const kids = group.current.children
    kids.forEach((k, i) => {
      if (!k.userData.baseY) k.userData.baseY = k.position.y
      k.position.y = k.userData.baseY + (1 - ease) * -2.4
      k.visible = true
    })
    // mid-cycle: one wall un-builds and rebuilds
    const wallWindow = t > period * 0.5 && t < period * 0.5 + 6
    if (wallWindow && kids.length) {
      const idx = wallIndex.current % kids.length
      const local = (t - period * 0.5) / 6
      const drop = local < 0.5 ? local * 2 : (1 - local) * 2
      const k = kids[idx]
      if (k && k.userData.baseY !== undefined) k.position.y = k.userData.baseY - drop * 2.4
    }
  })
  return <group ref={group}>{children}</group>
}
