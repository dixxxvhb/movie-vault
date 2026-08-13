import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makeShoeboxTexture, makeDarkFrameTexture } from './archiveTextures.js'
import { QuoteScrap } from './Quotes.jsx'
import { wasDrag } from './pointer.js'

// The room only ever showed films scored live. Everything else he has watched
// lived nowhere. These are the two places it lives now, and they are deliberately
// NOT the Ledger wall:
//
//   The Shoebox   — seen, scored from memory, in pencil. Faded prints.
//   The Dark Drawer — seen, unscorable. Frames that were never developed.
//
// Hard rule from Dixon's own doctrine: archive scores never sit on the Ledger's
// score axis and never move a Ledger anchor. A remembered 10 and a recorded 10
// are different currencies, so they are never measured against the same wall.
// Both live on the floor, at your feet, which is also where you would actually
// find a shoebox.

export const PRINT_W = 0.15
export const PRINT_H = 0.185

// Where the box sits: under the window, so the cold streetlight is what falls
// on the faded prints and the warm lamp is what falls on the Ledger.
export const SHOEBOX_AT = [-1.6, 0, 0.78]
const SHOEBOX_SPREAD = [-0.5, 0.013, 0.8]
// The drawer spreads out on the carpet in front of the nightstand it came from.
const DRAWER_SPREAD = [1.3, 0.013, -0.3]

// deterministic scatter so a spread looks handled but never reshuffles
function jitter(slug, salt) {
  let h = salt >>> 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) & 0xffffff
  return {
    dx: (((h % 100) / 100) - 0.5) * 0.022,
    dz: ((((h >> 7) % 100) / 100) - 0.5) * 0.022,
    rot: ((((h >> 13) % 100) / 100) - 0.5) * 0.26,
  }
}

// Prints lie flat on the carpet, spread out of the container they came from.
function spread(items, center, cols, salt) {
  const PITCH_X = PRINT_W + 0.03
  const PITCH_Z = PRINT_H + 0.075     // room under each print for a quote scrap
  const rows = Math.ceil(items.length / cols)
  return items.map((film, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const j = jitter(film.slug, salt)
    return {
      film,
      position: [
        center[0] + (col - (cols - 1) / 2) * PITCH_X + j.dx,
        center[1],
        center[2] + (row - (rows - 1) / 2) * PITCH_Z + j.dz,
      ],
      rot: j.rot,
    }
  })
}

/* ---------------------------------------------------------------- one print */

function Print({ film, kind, position, rot, picked, onPick }) {
  const group = useRef()
  const [tex, setTex] = useState(null)
  const [hovered, setHovered] = useState(false)
  // Stable array identity: R3F re-applies a rotation prop whenever the array is
  // a new object, which would yank the transform back to flat on every re-render
  // and fight the lift animation below.
  const rest = useMemo(() => [-Math.PI / 2, 0, rot], [rot])

  useEffect(() => {
    let live = true
    const make = kind === 'shoebox' ? makeShoeboxTexture : makeDarkFrameTexture
    make(film).then((t) => { if (live) setTex(t) })
    return () => { live = false }
  }, [film, kind])

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    // picked up off the carpet, the way you'd hold one to the light
    const lift = picked ? 0.34 : hovered ? 0.03 : 0
    g.position.y = THREE.MathUtils.damp(g.position.y, position[1] + lift, 7, dt)
    // and tilted up toward the eye rather than left face-up on the floor
    g.rotation.x = THREE.MathUtils.damp(
      g.rotation.x, -Math.PI / 2 + (picked ? 0.95 : 0), 7, dt
    )
    const s = THREE.MathUtils.damp(g.scale.x, picked ? 1.35 : hovered ? 1.07 : 1, 7, dt)
    g.scale.setScalar(s)
  })

  return (
    <group
      ref={group}
      position={position}
      rotation={rest}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
      onClick={(e) => { e.stopPropagation(); if (!wasDrag()) onPick?.(picked ? null : film.slug) }}
    >
      {/* contact shadow on the carpet */}
      <mesh position={[0.004, -0.006, -0.001]}>
        <planeGeometry args={[PRINT_W * 1.05, PRINT_H * 1.05]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.34} />
      </mesh>
      <mesh>
        <planeGeometry args={[PRINT_W, PRINT_H]} />
        {/* key flips with the texture so three compiles USE_MAP in — swapping
            map on a live material never enables it (the blank-cards bug) */}
        {tex
          ? <meshStandardMaterial
              key="mapped"
              map={tex}
              emissiveMap={tex}
              emissive="#ffffff"
              // dark frames get almost no self-light: they must stay unreadable
              emissiveIntensity={kind === 'shoebox' ? 0.30 : 0.10}
              roughness={0.95}
              metalness={0}
            />
          : <meshStandardMaterial key="blank" color={kind === 'shoebox' ? '#e2d6b8' : '#161311'} roughness={0.95} />}
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------- the container */

// A shoebox is a shoebox: a lidless carton with the lid leaned against it. It
// is closed until you click it, because the point is that this stuff was put
// away, not displayed.
function Box({ open, onOpen }) {
  const lid = useRef()
  const W = 0.34, D = 0.24, H = 0.13

  useFrame((_, dt) => {
    const l = lid.current
    if (!l) return
    // the lid comes off and leans on the box rather than vanishing
    l.rotation.x = THREE.MathUtils.damp(l.rotation.x, open ? -1.15 : 0, 6, dt)
    l.position.y = THREE.MathUtils.damp(l.position.y, open ? H + 0.055 : H + 0.005, 6, dt)
    l.position.z = THREE.MathUtils.damp(l.position.z, open ? -D * 0.55 : 0, 6, dt)
  })

  const card = <meshStandardMaterial color="#8a704e" roughness={0.95} side={THREE.DoubleSide} />

  return (
    <group
      position={SHOEBOX_AT}
      rotation={[0, 0.22, 0]}
      onClick={(e) => { e.stopPropagation(); if (!wasDrag()) onOpen() }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = 'auto' }}
    >
      {/* carton walls, open-topped */}
      <mesh position={[0, H / 2, -D / 2]}><planeGeometry args={[W, H]} />{card}</mesh>
      <mesh position={[0, H / 2, D / 2]}><planeGeometry args={[W, H]} />{card}</mesh>
      <mesh position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[D, H]} />{card}</mesh>
      <mesh position={[W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[D, H]} />{card}</mesh>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#6d5738" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {/* the lid */}
      <group ref={lid} position={[0, H + 0.005, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[W * 1.06, D * 1.06]} />
          <meshStandardMaterial color="#967954" roughness={0.92} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ exports */

export default function Archive({
  shoebox = [],
  drawer = [],
  quotesBySlug = {},
  looseQuotes = [],
  open,              // null | 'shoebox' | 'drawer'
  picked,            // slug of the print held up, if any
  onOpen,
  onPick,
}) {
  const boxLaid = useMemo(() => spread(shoebox, SHOEBOX_SPREAD, 7, 0x5b0a), [shoebox])
  const drawerLaid = useMemo(() => spread(drawer, DRAWER_SPREAD, 4, 0x91c3), [drawer])

  return (
    <group>
      <Box open={open === 'shoebox'} onOpen={() => onOpen(open === 'shoebox' ? null : 'shoebox')} />

      {open === 'shoebox' && boxLaid.map(({ film, position, rot }) => (
        <group key={film.slug}>
          <Print
            film={film}
            kind="shoebox"
            position={position}
            rot={rot}
            picked={picked === film.slug}
            onPick={onPick}
          />
          {quotesBySlug[film.slug]?.[0] && (
            <QuoteScrap
              q={quotesBySlug[film.slug][0]}
              position={[position[0] + 0.012, position[1] + 0.001, position[2] + PRINT_H / 2 + 0.035]}
              rotation={[-Math.PI / 2, 0, rot * 0.6]}
              width={0.125}
            />
          )}
        </group>
      ))}

      {open === 'drawer' && drawerLaid.map(({ film, position, rot }) => (
        <group key={film.slug}>
          <Print
            film={film}
            kind="drawer"
            position={position}
            rot={rot}
            picked={picked === film.slug}
            onPick={onPick}
          />
          {quotesBySlug[film.slug]?.[0] && (
            <QuoteScrap
              q={quotesBySlug[film.slug][0]}
              position={[position[0] + 0.012, position[1] + 0.001, position[2] + PRINT_H / 2 + 0.035]}
              rotation={[-Math.PI / 2, 0, rot * 0.6]}
              width={0.125}
            />
          )}
        </group>
      ))}

      {/* Quotes whose film is on no wall and in no box — television, mostly.
          They end up loose in the drawer, which is where loose paper goes. */}
      {open === 'drawer' && looseQuotes.map((q, i) => {
        const j = jitter(q.quote.slice(0, 12), 0x77 + i)
        const col = i % 3
        const row = Math.floor(i / 3)
        return (
          <QuoteScrap
            key={i}
            q={q}
            position={[
              0.30 + col * 0.17 + j.dx,
              0.013,
              -0.85 + row * 0.13 + j.dz,
            ]}
            rotation={[-Math.PI / 2, 0, j.rot]}
            width={0.155}
          />
        )
      })}
    </group>
  )
}
