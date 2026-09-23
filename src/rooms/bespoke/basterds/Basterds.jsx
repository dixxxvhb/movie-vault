import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { registerColliders, setBounds, registerFloor, clearOwner } from '../../colliders.js'
import { standardMat } from '../../materials.js'
import Lobby from './Lobby.jsx'
import Rue from './Rue.jsx'
import {
  FOOTPRINTS, EXTENT, floorAt, zoneAt, blockingRects, SPOTS,
  BOOTH_Y, CELLAR_Y, APRON_Y, ROWS, ROW_Z0, ROW_PITCH, SEAT_W, BLOCKS, SEAT_BLOCKS, FURNITURE,
} from './zones.js'

// LE GAMAAR: Shosanna's cinema, Paris, the night of the premiere.
// Plan: docs/plans/2026-09-22-le-gamaar-basterds-room.md
//
// SESSION 1: the greybox. Every space is walkable at its real size and level
// (street, lobby, stairs, booth, auditorium on its rake, behind the screen,
// the cellar), and nothing else. Walls, openings and colliders are all
// derived from zones.js, so moving a doorway is a one-line change.
//
// ?spot=<name> lands the walker at a named place (zones.js SPOTS), and
// window.__basterdsSpot(name) re-aims a running preview without a reload.

// Ceiling height (absolute y) per footprint. Doorway strips take the lower of
// the two rooms they join, via DOOR_H above their own floor.
const CEIL = {
  lobby: 4.2, stairE: BOOTH_Y + 2.6, gallery: BOOTH_Y + 2.6, booth: BOOTH_Y + 2.6,
  vestibule: 3.0, auditorium: 7.6, behind: 7.6, stairW: 2.6, cellar: CELLAR_Y + 2.5,
}
const DOOR_H = 2.3
const WALL_T = 0.12

// Greybox tints, one per space, so the preview reads which room is which.
const TINT = {
  rue: '#3a3a40', lobby: '#b9a585', stairE: '#5a4c3c', gallery: '#4a3e34', booth: '#5c4636',
  vestibule: '#5a4a3a', auditorium: '#4a1c1c', behind: '#2e2a26', stairW: '#443a30', cellar: '#4a3a2a',
}

const isDoor = (f) => f.id.startsWith('door-') || f.id.startsWith('gap-')

// Windows: openings you can see through but not walk through. The porthole
// cuts both the booth's south wall and the auditorium's north wall.
const WINDOWS = [
  { room: 'booth', side: 's', a: -1.3, b: 0.1, y0: BOOTH_Y + 1.05, y1: BOOTH_Y + 1.95 },
  { room: 'auditorium', side: 'n', a: -1.3, b: 0.1, y0: BOOTH_Y + 1.05, y1: BOOTH_Y + 1.95 },
]


// Openings on one side of a room: every doorway strip that crosses that edge.
function openingsOn(room, side) {
  const r = room.rect
  const horiz = side === 'n' || side === 's'
  const line = side === 'n' ? r.maxZ : side === 's' ? r.minZ : side === 'e' ? r.maxX : r.minX
  const out = []
  for (const d of FOOTPRINTS) {
    if (!isDoor(d) || d === room) continue
    const q = d.rect
    const crosses = horiz ? q.minZ < line && q.maxZ > line : q.minX < line && q.maxX > line
    if (!crosses) continue
    const a = horiz ? Math.max(r.minX, q.minX) : Math.max(r.minZ, q.minZ)
    const b = horiz ? Math.min(r.maxX, q.maxX) : Math.min(r.maxZ, q.maxZ)
    if (b - a > 0.2) {
      const y = d.floor((q.minX + q.maxX) / 2, (q.minZ + q.maxZ) / 2)
      out.push([a, b, y, y + DOOR_H])
    }
  }
  for (const w of WINDOWS) if (w.room === room.id && w.side === side) out.push([w.a, w.b, w.y0, w.y1])
  return out.sort((p, q) => p[0] - q[0])
}

// One wall slab between two points along an edge, from y0 to y1.
function Slab({ side, line, a, b, y0, y1, mat }) {
  if (b - a < 0.01 || y1 - y0 < 0.01) return null
  const horiz = side === 'n' || side === 's'
  const mid = (a + b) / 2
  const pos = horiz ? [mid, (y0 + y1) / 2, line] : [line, (y0 + y1) / 2, mid]
  const size = horiz ? [b - a, y1 - y0, WALL_T] : [WALL_T, y1 - y0, b - a]
  return (
    <mesh position={pos} material={mat}>
      <boxGeometry args={size} />
    </mesh>
  )
}

function Walls({ room, top, mat }) {
  const r = room.rect
  const lowest = Math.min(
    room.floor(r.minX, r.minZ), room.floor(r.maxX, r.maxZ),
    room.floor(r.minX, r.maxZ), room.floor(r.maxX, r.minZ)) - 0.05
  const sides = [['n', r.maxZ, r.minX, r.maxX], ['s', r.minZ, r.minX, r.maxX],
                 ['e', r.maxX, r.minZ, r.maxZ], ['w', r.minX, r.minZ, r.maxZ]]
  const parts = []
  for (const [side, line, lo, hi] of sides) {
    let cursor = lo
    for (const [a, b, oy0, oy1] of openingsOn(room, side)) {
      parts.push(<Slab key={side + cursor} side={side} line={line} a={cursor} b={a} y0={lowest} y1={top} mat={mat} />)
      // lintel over the opening, and a sill under it (doors that sit higher
      // than this room's floor, and every window)
      parts.push(<Slab key={side + a + 'l'} side={side} line={line} a={a} b={b} y0={oy1} y1={top} mat={mat} />)
      parts.push(<Slab key={side + a + 's'} side={side} line={line} a={a} b={b} y0={lowest} y1={oy0 - 0.02} mat={mat} />)
      cursor = b
    }
    parts.push(<Slab key={side + 'end'} side={side} line={line} a={cursor} b={hi} y0={lowest} y1={top} mat={mat} />)
  }
  return <>{parts}</>
}

// A floor that follows the footprint's own floor function (ramps, the rake).
function Floor({ room, mat }) {
  const geo = useMemo(() => {
    const r = room.rect
    const w = r.maxX - r.minX, d = r.maxZ - r.minZ
    const g = new THREE.PlaneGeometry(w, d, Math.max(1, Math.ceil(w / 0.5)), Math.max(1, Math.ceil(d / 0.5)))
    g.rotateX(-Math.PI / 2)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + (r.minX + r.maxX) / 2
      const z = p.getZ(i) + (r.minZ + r.maxZ) / 2
      p.setXYZ(i, x, room.floor(x, z), z)
    }
    g.computeVertexNormals()
    return g
  }, [room])
  useEffect(() => () => geo.dispose(), [geo])
  return <mesh geometry={geo} material={mat} receiveShadow />
}

function Ceiling({ room, y, mat }) {
  const r = room.rect
  return (
    <mesh position={[(r.minX + r.maxX) / 2, y, (r.minZ + r.maxZ) / 2]} rotation={[Math.PI / 2, 0, 0]} material={mat}>
      <planeGeometry args={[r.maxX - r.minX, r.maxZ - r.minZ]} />
    </mesh>
  )
}

// ---------------------------------------------------------------- the seats
// The seating chart, greybox: rows are chapters (back = 1, front = 5), the
// centre aisle splits the sides. Instanced, one draw call.

function Seats() {
  const ref = useRef()
  const seats = useMemo(() => {
    const out = []
    for (let row = 0; row < ROWS; row++) {
      const z = ROW_Z0 - row * ROW_PITCH
      for (const [a, b] of BLOCKS) {
        const n = Math.floor((b - a) / SEAT_W)
        for (let k = 0; k < n; k++) out.push([a + SEAT_W * (k + 0.5), z])
      }
    }
    return out
  }, [])
  useEffect(() => {
    const m = new THREE.Matrix4()
    seats.forEach(([x, z], i) => {
      m.makeTranslation(x, floorAt(x, z) + 0.45, z)
      ref.current.setMatrixAt(i, m)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [seats])
  return (
    // frustumCulled off: the instance bounds sit at the origin, behind every
    // camera in the auditorium, so three would cull all 280 seats.
    <instancedMesh ref={ref} args={[null, null, seats.length]} frustumCulled={false}>
      <boxGeometry args={[SEAT_W * 0.86, 0.9, 0.6]} />
      <meshStandardMaterial color="#6e1f1f" roughness={0.9} />
    </instancedMesh>
  )
}

// ---------------------------------------------------------------- the room
export default function Basterds({ film, config, goToStation, onDoor }) {
  const mats = useMemo(() => {
    const m = {}
    for (const [k, tint] of Object.entries(TINT)) {
      m[k] = {
        wall: standardMat({ kind: 'plaster', tint, wear: 0.25, seed: 'gb-w-' + k }),
        floor: standardMat({ kind: k === 'rue' ? 'wetconcrete' : 'wood', tint, wear: 0.3, seed: 'gb-f-' + k }),
        ceil: standardMat({ kind: 'plaster', tint: '#2a2622', wear: 0.2, seed: 'gb-c-' + k }),
      }
    }
    return m
  }, [])

  // Collision: the complement of the walkable union, plus the seat blocks.
  useEffect(() => {
    const owner = 'room:' + (film?.slug ?? 'inglourious-basterds')
    registerColliders(owner, blockingRects([...SEAT_BLOCKS, ...FURNITURE]))
    setBounds(owner, { kind: 'rect', minX: EXTENT.minX + 0.1, maxX: EXTENT.maxX - 0.1, minZ: EXTENT.minZ + 0.1, maxZ: EXTENT.maxZ - 0.1 })
    registerFloor(owner, floorAt)
    return () => clearOwner(owner)
  }, [film?.slug])

  // ?spot= on arrival, and a live re-aim hook for the preview pane.
  useEffect(() => {
    const fly = (name) => {
      const s = SPOTS[name]
      if (!s) return false
      goToStation({ pos: s.pos, look: s.look, fov: config.camera?.fov ?? 55 }, 'spot:' + name + ':' + Date.now())
      return true
    }
    const spot = new URLSearchParams(window.location.search).get('spot')
    if (spot) fly(spot)
    window.__basterdsSpot = fly
    return () => { delete window.__basterdsSpot }
  }, [goToStation, config.camera?.fov])

  // Which space the walker is in, published for the preview and the Dailies.
  const zoneRef = useRef('')
  useFrame(({ camera }) => {
    const z = zoneAt(camera.position.x, camera.position.z)
    if (z !== zoneRef.current) { zoneRef.current = z; window.__basterdsZone = z }
  })

  const g = config.grade || {}
  return (
    <>
      <fogExp2 attach="fog" args={[g.fogColor || '#0b0a0c', g.fogDensity ?? 0.012]} />

      {/* greybox lights: one per space, warm tungsten except the street */}
      <pointLight position={[0, 3.8, -5]} intensity={30} distance={14} color="#ffcf8a" />
      <pointLight position={[0, 6.8, -20]} intensity={40} distance={26} color="#ffb070" />
      <pointLight position={[-0.6, BOOTH_Y + 2.2, -11.6]} intensity={10} distance={7} color="#ffc27a" />
      <pointLight position={[-14, CELLAR_Y + 2.1, -6]} intensity={16} distance={12} color="#ffb060" />
      <pointLight position={[0, 3, -33.6]} intensity={8} distance={12} color="#ff9a50" />

      {FOOTPRINTS.filter((f) => !isDoor(f)).map((f) => {
        const t = mats[f.id] || mats.lobby
        return (
          <group key={f.id}>
            {f.id !== 'rue' && <Floor room={f} mat={t.floor} />}
            {f.id !== 'rue' && <Walls room={f} top={CEIL[f.id] ?? 4} mat={t.wall} />}
            {f.id !== 'rue' && <Ceiling room={f} y={CEIL[f.id] ?? 4} mat={t.ceil} />}
          </group>
        )
      })}
      {FOOTPRINTS.filter(isDoor).map((f) => (
        <Floor key={f.id} room={f} mat={mats.lobby.floor} />
      ))}

      <Rue onDoor={onDoor} />

      {/* the screen, on the auditorium's south wall */}
      <mesh position={[0, APRON_Y + 2.6, -31.52]}>
        <planeGeometry args={[10, 4.2]} />
        <meshStandardMaterial color="#f4ecdc" emissive="#f4ecdc" emissiveIntensity={0.55} />
      </mesh>

      {/* the Box, over the east side aisle (view-only in v1) */}
      <mesh position={[7.1, 2.9, -21.5]} material={mats.booth.wall}><boxGeometry args={[1.8, 0.2, 5]} /></mesh>
      <mesh position={[6.25, 3.45, -21.5]} material={mats.booth.wall}><boxGeometry args={[0.1, 0.9, 5]} /></mesh>


      <Seats />
      <Lobby />

      {/* the nitrate, behind the screen */}
      <mesh position={[-3, APRON_Y + 1.1, -34.1]} material={mats.behind.floor}><boxGeometry args={[8, 2.2, 0.8]} /></mesh>

      {/* La Louisiane: the long table and the bar */}
      <mesh position={[-15, CELLAR_Y + 0.4, -6]} material={mats.cellar.floor}><boxGeometry args={[1.2, 0.8, 4.2]} /></mesh>
      <mesh position={[-18.4, CELLAR_Y + 0.55, -6]} material={mats.cellar.wall}><boxGeometry args={[0.8, 1.1, 7]} /></mesh>
    </>
  )
}
