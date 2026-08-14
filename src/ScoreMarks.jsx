import React, { useMemo } from 'react'
import * as THREE from 'three'

// The axis, drawn on the wall in pencil.
//
// Height only means something if you can see what height means. These are the
// marks somebody made on the wallpaper to measure against — the same gesture as
// notching a doorframe to track a kid growing. Without them, score-as-height is
// a private joke between the layout function and nobody.

function numeralTexture(n, { size = 74, color = 'rgba(226,214,186,0.62)', w = 128 } = {}) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = 128
  const x = c.getContext('2d')
  x.clearRect(0, 0, w, 128)
  x.fillStyle = color
  x.font = `600 ${size}px 'Caveat', 'Segoe Script', cursive`
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.fillText(String(n), w / 2, 66)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

export default function ScoreMarks({ scoreToY, avg, from = 6, to = 10, width = 3.5, z, inner = 1.02 }) {
  // The average, drawn once. This is the line that turns the wall into a
  // judgement: everything above it beat his own bar, everything below missed.
  const avgMark = useMemo(() => {
    if (!avg) return null
    return {
      y: scoreToY(avg),
      tex: numeralTexture('avg ' + Number(avg).toFixed(2), {
        size: 42, w: 320, color: 'rgba(196,124,96,0.85)',
      }),
    }
  }, [avg, scoreToY])

  const marks = useMemo(() => {
    const out = []
    for (let s = from; s <= to; s++) out.push({ s, y: scoreToY(s), tex: numeralTexture(s) })
    return out
  }, [from, to, scoreToY])

  return (
    <group>
      {marks.map(({ s, y, tex }) => (
        <group key={s}>
          {/* the rule itself: faint, hand-drawn weight, full 10 slightly bolder */}
          <mesh position={[0, y, z]}>
            <planeGeometry args={[width, s === 10 ? 0.0045 : 0.0028]} />
            <meshBasicMaterial
              color="#e2d6ba"
              transparent
              opacity={s === 10 ? 0.20 : 0.11}
              depthWrite={false}
            />
          </mesh>
          {/* The numeral, at both ends so it reads from anywhere in the room —
              and again just outside the hang, because on a phone the wall's
              edges are off-frame and those outer pair were the only place the
              axis was labelled. The inner pair costs nothing on a desktop
              (they sit in empty wallpaper beside the beeswarm) and is the
              difference between a legible chart and a pile of photos on a
              narrow screen. */}
          {[-1, 1].map((side) => (
            <group key={side}>
              <mesh position={[side * (width / 2 + 0.085), y, z]}>
                <planeGeometry args={[0.11, 0.11]} />
                <meshBasicMaterial map={tex} transparent depthWrite={false} />
              </mesh>
              <mesh position={[side * inner, y, z]}>
                <planeGeometry args={[0.085, 0.085]} />
                <meshBasicMaterial map={tex} transparent opacity={0.5} depthWrite={false} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {avgMark && (
        <group>
          <mesh position={[0, avgMark.y, z]}>
            <planeGeometry args={[width, 0.0022]} />
            <meshBasicMaterial color="#c47c60" transparent opacity={0.34} depthWrite={false} />
          </mesh>
          <mesh position={[-(width / 2) + 0.30, avgMark.y + 0.055, z]}>
            <planeGeometry args={[0.30, 0.12]} />
            <meshBasicMaterial map={avgMark.tex} transparent depthWrite={false} />
          </mesh>
        </group>
      )}
    </group>
  )
}
