import React, { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { usePainted, wrap, fontsReady } from './paint.js'
import { houseLevel } from '../houseLights.js'

// THE KIT: the room's written surfaces (docs/VAULT-TWO-SCENE-STANDARD.md).
//   Scrap      his words, verbatim, on a torn scrap of paper ("His words" slot)
//   HouseNote  a pinned note that is only there with the house lights up
//              ("The record" slot); it fades with the switch
//   TentCard   a small folded card standing on a surface; the text budget is
//              twelve of these per Room, so use them only where an object can't speak

export function Scrap({ text, pos, ry = 0, w = 1.4, rot = 0, size = 56 }) {
  const tex = usePainted(1024, 360, async (c) => {
    await fontsReady([`italic 400 ${size}px Georgia`])
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
  }, [text, size])
  return (
    <mesh position={pos} rotation={[0, ry, rot]}>
      <planeGeometry args={[w, w * 360 / 1024]} />
      <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.3} transparent alphaTest={0.2} roughness={0.9} />
    </mesh>
  )
}

export function HouseNote({ text, pos, ry = 0, w = 0.5, rot = 0, label = 'HOUSE LIGHTS', labelFont = '600 26px "Josefin Sans"' }) {
  const tex = usePainted(768, 360, async (c) => {
    await fontsReady([labelFont, '400 36px Georgia'])
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#fbf6c8'; ctx.fillRect(0, 0, 768, 360)
    ctx.fillStyle = '#b3261e'; ctx.beginPath(); ctx.arc(384, 26, 12, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(179,38,30,0.8)'; ctx.font = labelFont
    ctx.fillText(label, 36, 80)
    ctx.fillStyle = '#1b1612'; ctx.font = '400 36px Georgia, serif'
    let y = 132
    for (const l of wrap(ctx, text, 690)) { ctx.fillText(l, 36, y); y += 46 }
  }, [text, label])
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

export function TentCard({ pos, ry = 0, text, w = 0.34, font = 'italic 400 30px "Bodoni Moda"', paper = '#efe4cf', ink = '#1b1612' }) {
  const tex = usePainted(512, 300, async (c) => {
    await fontsReady([font])
    const ctx = c.getContext('2d')
    ctx.fillStyle = paper; ctx.fillRect(0, 0, 512, 300)
    ctx.fillStyle = ink
    ctx.font = font
    let y = 58
    for (const l of wrap(ctx, text, 452)) { ctx.fillText(l, 30, y); y += 38 }
  }, [text])
  return (
    <group position={pos} rotation={[0, ry, 0]}>
      <mesh rotation={[-0.35, 0, 0]} position={[0, 0.1, 0]}>
        <planeGeometry args={[w, w * 300 / 512]} />
        <meshStandardMaterial key={text} map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
