import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { loadImage, drawCover } from './vaultTextures.js'
import { wasDrag } from './pointer.js'

// THE NIGHTS.
//
// The room had no time in it. Thirty-five films happened between Jul 13 and
// now — double features, a Nolan trilogy inside three days, a triple-feature
// Friday, and then a four-day gap where nothing happened at all — and the wall
// could not tell you any of it, because height is the score and x means
// nothing.
//
// So time gets its own object instead of being forced onto the hang: a contact
// strip along the bottom of the Ledger wall, on the dead band between the
// lowest Polaroid and the baseboard. x is the actual calendar, linearly, so a
// quiet week is a visibly empty stretch of wall and a double feature is two
// frames stacked on one date. Nothing about the score layout moves.
//
// Clicking a frame selects that film, same as clicking its Polaroid.

const STRIP_Y = 0.40          // above the baseboard, under the lowest card
const STRIP_X = 1.58          // half-width of the run
const FRAME = 0.066
const STACK = FRAME + 0.008

const FRAME_PX = 128

async function frameTexture(film) {
  const c = document.createElement('canvas')
  c.width = FRAME_PX
  c.height = FRAME_PX
  const ctx = c.getContext('2d')

  ctx.fillStyle = '#0d0b08'
  ctx.fillRect(0, 0, FRAME_PX, FRAME_PX)

  const img = film.poster ? await loadImage(import.meta.env.BASE_URL + film.poster) : null
  const pad = 5
  const inner = FRAME_PX - pad * 2
  if (img) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(pad, pad, inner, inner)
    ctx.clip()
    drawCover(ctx, img, pad, pad, inner, inner)
    ctx.restore()
  } else {
    ctx.fillStyle = film.palette?.bg || '#2A2620'
    ctx.fillRect(pad, pad, inner, inner)
  }

  // sprocket-hole border: this is a strip of film, not a row of thumbnails
  ctx.strokeStyle = 'rgba(238,228,204,0.55)'
  ctx.lineWidth = 2
  ctx.strokeRect(pad - 1, pad - 1, inner + 2, inner + 2)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

// pencil text on the wallpaper, same hand as the score axis
function penTexture(text, { w = 256, h = 64, size = 34, color = 'rgba(226,214,186,0.5)' } = {}) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const x = c.getContext('2d')
  x.font = `500 ${size}px 'Caveat', 'Segoe Script', cursive`
  x.fillStyle = color
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.fillText(text, w / 2, h / 2)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

const day = (iso) => Math.floor(new Date(iso + 'T00:00:00Z').getTime() / 86400000)

function Frame({ film, position, tex, dimmed, active, onSelect, onHover }) {
  const mesh = useRef()
  const mat = useRef()
  useFrame((_, dt) => {
    if (!mesh.current || !mat.current) return
    const want = active ? 1.42 : dimmed ? 0.86 : 1
    const s = THREE.MathUtils.damp(mesh.current.scale.x, want, 9, dt)
    mesh.current.scale.set(s, s, 1)
    mat.current.opacity = THREE.MathUtils.damp(
      mat.current.opacity, dimmed && !active ? 0.22 : 1, 8, dt
    )
  })
  return (
    <mesh
      ref={mesh}
      position={position}
      onPointerOver={(e) => { e.stopPropagation(); onHover(film.slug); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { onHover(null); document.body.style.cursor = 'auto' }}
      onClick={(e) => { e.stopPropagation(); if (!wasDrag()) onSelect(film.slug) }}
    >
      <planeGeometry args={[FRAME, FRAME]} />
      <meshBasicMaterial ref={mat} map={tex} transparent opacity={1} depthWrite={false} />
    </mesh>
  )
}

export default function Nights({ films, z, lens, selected, hover, onSelect, onHover }) {
  const [texes, setTexes] = useState({})

  const { placed, ticks } = useMemo(() => {
    if (!films?.length) return { placed: [], ticks: [] }
    const days = films.map((f) => day(f.watched))
    const lo = Math.min(...days)
    const hi = Math.max(...days)
    const span = Math.max(1, hi - lo)
    const atX = (d) => -STRIP_X + ((d - lo) / span) * (STRIP_X * 2)

    // group by night so a double feature stacks instead of overlapping
    const byDay = {}
    for (const f of films) (byDay[day(f.watched)] ||= []).push(f)

    const placed = []
    for (const [d, list] of Object.entries(byDay)) {
      // earliest score first at the bottom, so a stack reads bottom-up like a
      // pile of prints from that night
      const sorted = [...list].sort((a, b) => a.title.localeCompare(b.title))
      sorted.forEach((film, i) => {
        placed.push({ film, position: [atX(Number(d)), STRIP_Y + i * STACK, z] })
      })
    }

    // one tick per month boundary plus the ends — enough to date the strip
    // without turning the baseboard into a ruler
    const ticks = []
    const seen = new Set()
    for (const f of films) {
      const dt = new Date(f.watched + 'T00:00:00Z')
      const key = dt.getUTCFullYear() + '-' + dt.getUTCMonth()
      if (seen.has(key)) continue
      seen.add(key)
      const first = Math.max(lo, Math.floor(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), 1) / 86400000))
      ticks.push({
        key,
        x: atX(first),
        label: dt.toLocaleString('en', { month: 'long', timeZone: 'UTC' }).toLowerCase(),
      })
    }
    return { placed, ticks }
  }, [films, z])

  useEffect(() => {
    let live = true
    Promise.all(placed.map(async (p) => [p.film.slug, await frameTexture(p.film)]))
      .then((pairs) => { if (live) setTexes(Object.fromEntries(pairs)) })
    return () => { live = false }
  }, [placed])

  const tickTex = useMemo(
    () => Object.fromEntries(ticks.map((t) => [t.key, penTexture(t.label)])),
    [ticks]
  )
  const railTex = useMemo(() => penTexture('the nights', { size: 34, color: 'rgba(226,214,186,0.42)' }), [])

  if (!placed.length) return null

  return (
    <group>
      {/* the rail the strip sits on */}
      <mesh position={[0, STRIP_Y - FRAME / 2 - 0.022, z]}>
        <planeGeometry args={[STRIP_X * 2 + 0.1, 0.0026]} />
        <meshBasicMaterial color="#e2d6ba" transparent opacity={0.13} depthWrite={false} />
      </mesh>

      {/* the strip's name sits at the END of the run, not the start: the left
          end is where the first month tick lands and the two labels were
          printing on top of each other ("the nightsuly") */}
      <mesh position={[STRIP_X + 0.20, STRIP_Y, z]}>
        <planeGeometry args={[0.26, 0.065]} />
        <meshBasicMaterial map={railTex} transparent depthWrite={false} />
      </mesh>

      {ticks.map((t) => (
        <group key={t.key}>
          <mesh position={[t.x, STRIP_Y - FRAME / 2 - 0.032, z]}>
            <planeGeometry args={[0.0022, 0.022]} />
            <meshBasicMaterial color="#e2d6ba" transparent opacity={0.22} depthWrite={false} />
          </mesh>
          <mesh position={[t.x + 0.055, STRIP_Y - FRAME / 2 - 0.062, z]}>
            <planeGeometry args={[0.2, 0.05]} />
            <meshBasicMaterial map={tickTex[t.key]} transparent depthWrite={false} />
          </mesh>
        </group>
      ))}

      {placed.map((p) => (
        texes[p.film.slug] ? (
          <Frame
            key={p.film.slug}
            film={p.film}
            position={p.position}
            tex={texes[p.film.slug]}
            dimmed={!!lens && !(p.film.vibes || []).includes(lens)}
            active={selected === p.film.slug || hover === p.film.slug}
            onSelect={onSelect}
            onHover={onHover}
          />
        ) : null
      ))}
    </group>
  )
}
