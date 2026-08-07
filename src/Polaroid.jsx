import React, { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makeCardTexture } from './vaultTextures.js'

const CARD_W = 1.06         // world units (aspect matches 264x324)
const CARD_H = 1.3

// One hung Polaroid: a lit paper plane on the wall. Hover lifts + straightens
// it slightly and pushes it off the wall — the first bit of game-feel.
export default function Polaroid({ film, position, rotation = 0, onSelect, selected }) {
  const group = useRef()
  const [tex, setTex] = useState(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    let live = true
    makeCardTexture(film).then((t) => { if (live) setTex(t) })
    return () => { live = false; if (tex) tex.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film])

  useFrame((_, dt) => {
    if (!group.current) return
    const g = group.current
    const lift = hovered || selected ? 1 : 0
    g.position.z = THREE.MathUtils.damp(g.position.z, position[2] + lift * 0.14, 8, dt)
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, lift ? 0 : rotation, 8, dt)
    const s = THREE.MathUtils.damp(g.scale.x, lift ? 1.06 : 1, 8, dt)
    g.scale.setScalar(s)
  })

  return (
    <group
      ref={group}
      position={position}
      rotation={[0, 0, rotation]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
      onClick={(e) => { e.stopPropagation(); onSelect?.(film) }}
    >
      {/* subtle drop shadow slab behind the paper */}
      <mesh position={[0.02, -0.03, -0.01]}>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.22} />
      </mesh>
      {/* unlit face: the photo + handwriting read at true value regardless of
          the room's dramatic lamp light. toneMapped off = exact canvas colors. */}
      <mesh>
        <planeGeometry args={[CARD_W, CARD_H]} />
        {tex
          ? <meshBasicMaterial map={tex} toneMapped={false} />
          : <meshBasicMaterial color="#FFFEF8" toneMapped={false} />}
      </mesh>
    </group>
  )
}
