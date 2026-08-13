import React, { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Paper stuck to a wall: the Door (what's next) and the Mirror (what he likes).
//
// Deliberately NOT a corkboard and NOT pinned — Dixon's design doctrine bans
// that drawer. These are torn slips taped up by someone who cannot trust his
// own memory, which is the same reason the Polaroids are there.

function slipTexture({ lines, kicker, accent = '#1d2a3a', w = 512, h = 320, seed = 1 }) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const x = c.getContext('2d')

  let s = seed >>> 0
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)

  // torn-edge paper
  x.fillStyle = '#f2ead6'
  x.fillRect(0, 0, w, h)
  for (let i = 0; i < 4200; i++) {
    x.fillStyle = rand() > 0.5 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)'
    x.fillRect(rand() * w, rand() * h, 2, 2)
  }
  // a soft stain so no two slips look printed
  const gx = rand() * w, gy = rand() * h
  const g = x.createRadialGradient(gx, gy, 4, gx, gy, 90 + rand() * 90)
  g.addColorStop(0, 'rgba(120,95,55,0.16)')
  g.addColorStop(1, 'rgba(120,95,55,0)')
  x.fillStyle = g
  x.fillRect(0, 0, w, h)

  let y = 58
  if (kicker) {
    x.fillStyle = '#9a2f2a'
    x.font = "700 26px 'Caveat', 'Segoe Script', cursive"
    x.textAlign = 'left'
    x.fillText(kicker, 34, y)
    y += 40
  }

  x.fillStyle = accent
  x.font = "500 30px 'Caveat', 'Segoe Script', cursive"
  for (const line of lines) {
    if (y > h - 24) break
    y = wrapText(x, line.text, 34, y, w - 68, 36, line.size, line.color, accent)
    y += line.gap ?? 14
  }

  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function wrapText(ctx, text, x0, y, maxW, lh, size, color, accent) {
  if (size) ctx.font = `500 ${size}px 'Caveat', 'Segoe Script', cursive`
  ctx.fillStyle = color || accent
  const words = String(text).split(' ')
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x0, y)
      y += lh
      line = w
    } else line = test
  }
  if (line) { ctx.fillText(line, x0, y); y += lh }
  return y
}

function Slip({ texture, position, rotation, size, onPick, picked }) {
  const ref = useRef()
  const [hovered, setHovered] = useState(false)
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const up = hovered || picked ? 1 : 0
    g.position.z = THREE.MathUtils.damp(g.position.z, position[2] + up * 0.03, 8, dt)
    const sc = THREE.MathUtils.damp(g.scale.x, up ? 1.06 : 1, 8, dt)
    g.scale.setScalar(sc)
  })
  return (
    <group
      ref={ref}
      position={position}
      rotation={rotation}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
      onClick={(e) => { e.stopPropagation(); onPick?.() }}
    >
      <mesh position={[0.004, -0.005, -0.002]}>
        <planeGeometry args={[size[0] * 1.02, size[1] * 1.02]} />
        <meshBasicMaterial color="#000" transparent opacity={0.3} />
      </mesh>
      <mesh>
        <planeGeometry args={size} />
        <meshStandardMaterial
          map={texture}
          emissiveMap={texture}
          emissive="#ffffff"
          emissiveIntensity={0.24}
          roughness={0.95}
        />
      </mesh>
      {/* a strip of tape, not a pin */}
      <mesh position={[0, size[1] / 2 - 0.004, 0.004]} rotation={[0, 0, 0.05]}>
        <planeGeometry args={[size[0] * 0.28, 0.028]} />
        <meshStandardMaterial color="#d8cfae" transparent opacity={0.5} roughness={0.6} />
      </mesh>
    </group>
  )
}

// deterministic scatter so the wall looks handmade but never reshuffles
function scatter(i, seed) {
  const h = (i * 2654435761 + seed) >>> 0
  return {
    dx: (((h % 100) / 100) - 0.5) * 0.05,
    dy: ((((h >> 7) % 100) / 100) - 0.5) * 0.045,
    rot: ((((h >> 13) % 100) / 100) - 0.5) * 0.09,
  }
}

/* ------------------------------------------------------------------ the door */

export function QueueWall({ queue, origin, rotation }) {
  const slips = useMemo(() => {
    const cols = 4
    const CW = 0.30, CH = 0.19
    return queue.slice(0, 20).map((q, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const s = scatter(i, 91)
      const tex = slipTexture({
        seed: i * 7919 + 3,
        w: 420, h: 268,
        kicker: q.rank ? '#' + q.rank : 'someday',
        lines: [
          { text: q.title, size: 40, color: '#1d2a3a', gap: 4 },
          { text: String(q.year || ''), size: 24, color: '#7d7460', gap: 10 },
          ...(q.reason ? [{ text: q.reason, size: 23, color: '#4a4436' }] : []),
          ...(q.note ? [{ text: q.note, size: 21, color: '#9a2f2a' }] : []),
        ],
      })
      return {
        key: q.title,
        tex,
        size: [CW, CH],
        position: [
          (col - (cols - 1) / 2) * (CW + 0.055) + s.dx,
          1.98 - row * (CH + 0.06) + s.dy,
          0.012,
        ],
        rotation: [0, 0, s.rot],
      }
    })
  }, [queue])

  return (
    <group position={origin} rotation={rotation}>
      {slips.map((s) => (
        <Slip key={s.key} texture={s.tex} position={s.position} rotation={s.rotation} size={s.size} />
      ))}
    </group>
  )
}

/* ---------------------------------------------------------------- the mirror */

export function LessonsWall({ lessons, origin, rotation }) {
  const slips = useMemo(() => {
    const cols = 3
    const CW = 0.34, CH = 0.24
    return lessons.slice(0, 15).map((l, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const s = scatter(i, 4177)
      const tex = slipTexture({
        seed: i * 6271 + 11,
        w: 460, h: 330,
        kicker: '·'.repeat(l.weight || 1),
        lines: [{ text: l.rule, size: 27, color: '#26231d' }],
      })
      return {
        key: i,
        tex,
        size: [CW, CH],
        position: [
          (col - (cols - 1) / 2) * (CW + 0.06) + s.dx,
          2.06 - row * (CH + 0.055) + s.dy,
          0.012,
        ],
        rotation: [0, 0, s.rot],
      }
    })
  }, [lessons])

  return (
    <group position={origin} rotation={rotation}>
      {slips.map((s) => (
        <Slip key={s.key} texture={s.tex} position={s.position} rotation={s.rotation} size={s.size} />
      ))}
    </group>
  )
}
