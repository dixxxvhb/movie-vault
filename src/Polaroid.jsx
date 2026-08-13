import React, { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makeCardTexture } from './vaultTextures.js'
import { wasDrag } from './CameraRig.jsx'

// Real Polaroid is 8.8 x 10.7cm. These run oversized so 33 of them stay
// readable from across a 4m room — a heightened space, not a museum replica.
export const CARD_W = 0.26
export const CARD_H = 0.32

// One hung Polaroid. The face carries its own emissive copy of the texture so
// it stays legible in shadow WITHOUT going fully unlit — fully unlit cards read
// as stickers pasted over the render (the M1 mistake).
export default function Polaroid({ film, position, rotation = 0, onSelect, selected }) {
  const group = useRef()
  const [tex, setTex] = useState(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    let live = true
    makeCardTexture(film).then((t) => { if (live) setTex(t) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film])

  useFrame((_, dt) => {
    if (!group.current) return
    const g = group.current
    const lift = hovered || selected ? 1 : 0
    g.position.z = THREE.MathUtils.damp(g.position.z, position[2] + lift * 0.035, 8, dt)
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, lift ? 0 : rotation, 8, dt)
    const s = THREE.MathUtils.damp(g.scale.x, lift ? 1.07 : 1, 8, dt)
    g.scale.setScalar(s)
  })

  return (
    <group
      ref={group}
      position={position}
      rotation={[0, 0, rotation]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
      onClick={(e) => { e.stopPropagation(); if (!wasDrag()) onSelect?.(film) }}
    >
      {/* contact shadow on the wallpaper */}
      <mesh position={[0.006, -0.008, -0.003]}>
        <planeGeometry args={[CARD_W * 1.02, CARD_H * 1.02]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.32} />
      </mesh>

      <mesh castShadow>
        <planeGeometry args={[CARD_W, CARD_H]} />
        {/* key flips when the texture lands so three rebuilds the material WITH
            the map compiled in — swapping map on a live material never enables
            USE_MAP. This was the "blank white cards" bug. */}
        {tex
          ? <meshStandardMaterial
              key="mapped"
              map={tex}
              emissiveMap={tex}
              emissive="#ffffff"
              emissiveIntensity={0.42}
              roughness={0.92}
              metalness={0}
            />
          : <meshStandardMaterial key="blank" color="#efe9dc" roughness={0.9} />}
      </mesh>

      {/* pushpin */}
      <mesh position={[0, CARD_H / 2 - 0.016, 0.006]}>
        <sphereGeometry args={[0.007, 10, 8]} />
        <meshStandardMaterial color="#b4403a" roughness={0.35} metalness={0.1} />
      </mesh>
    </group>
  )
}
