import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { registerColliders, setBounds, registerFloor, clearOwner } from '../../colliders.js'
import { standardMat } from '../../materials.js'
import { cutTo, DoubleDoors } from '../../kit/threshold.jsx'
import Rue from './Rue.jsx'
import Hall from './Hall.jsx'
import Ornament from './Ornament.jsx'
import Cases from './Cases.jsx'
import UpperWalls from './UpperWalls.jsx'
import Backstage from './Backstage.jsx'
import Cellar from './Cellar.jsx'
import { Floorboard } from './ChapterOne.jsx'
import Theatre from './Theatre.jsx'
import ArrivalCard, { arrivalWanted } from './ArrivalCard.jsx'
import { useRoomAudio } from '../../audio/engine.js'
import { start as basterdsAudio } from '../../audio/recipes/basterds.js'
import {
  FOOTPRINTS, EXTENT, floorAt, zoneAt, blockingRects, SPOTS, ROOM_ENTRY, STREET_RETURN, ROOM_DOORS,
  BOOTH_Y, BAR_Y, SEAT_BLOCKS, FURNITURE, HATCH,
} from './zones.js'

// LE GAMAAR, built to the Two-Scene Standard (docs/VAULT-TWO-SCENE-STANDARD.md,
// film sheet docs/films/inglourious-basterds.md).
//
//   THE ARRIVAL   the rue in the rain, Chapter Six, the facade (Rue.jsx)
//   THE THRESHOLD the front doors: they swing in, black, and you are inside
//   THE ROOM      the auditorium on premiere night, everything in one volume
//                 (Hall.jsx the architecture, Theatre.jsx what happens in it)
//
// ?spot=<name> lands the walker at a named place (zones.js SPOTS), and
// window.__basterdsSpot(name) re-aims a running preview without a reload.

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

// ---------------------------------------------------------------- the room
export default function Basterds({ film, config, goToStation, onDoor }) {
  const mats = useMemo(() => ({
    stalls: standardMat({ kind: 'wood', tint: '#3a1614', wear: 0.3, seed: 'ib-f-stalls' }),
    wood: standardMat({ kind: 'wood', tint: '#4a3020', wear: 0.3, seed: 'ib-f-wood' }),
    door: standardMat({ kind: 'wood', tint: '#2a1a12', wear: 0.2, seed: 'ib-door', roughness: 0.4 }),
  }), [])

  // Collision: the complement of the walkable union, plus the seats and furniture.
  useEffect(() => {
    const owner = 'room:' + (film?.slug ?? 'inglourious-basterds')
    registerColliders(owner, blockingRects([...SEAT_BLOCKS, ...FURNITURE]))
    setBounds(owner, { kind: 'rect', minX: EXTENT.minX + 0.1, maxX: EXTENT.maxX - 0.1, minZ: EXTENT.minZ + 0.1, maxZ: EXTENT.maxZ - 0.1 })
    registerFloor(owner, floorAt)
    return () => clearOwner(owner)
  }, [film?.slug])

  const fov = config.camera?.fov ?? 55
  // A rig flight can pass through the street doors on its way somewhere else;
  // for a moment after any flight, walking into the doors doesn't count.
  const flewAt = useRef(0)
  const fly = (s, key) => { flewAt.current = performance.now(); goToStation({ pos: s.pos, look: s.look, fov }, key + ':' + Date.now()) }

  // ?spot= on arrival, and a live re-aim hook for the preview pane.
  useEffect(() => {
    const go = (name) => { const s = SPOTS[name]; if (!s) return false; fly(s, 'spot:' + name); return true }
    const spot = new URLSearchParams(window.location.search).get('spot')
    if (spot) go(spot)
    window.__basterdsSpot = go
    return () => { delete window.__basterdsSpot }
  }, [goToStation, fov]) // eslint-disable-line react-hooks/exhaustive-deps

  // THE THRESHOLD. In: the street doors swing, black, the house. Out: the
  // house doors swing, black, the street, facing away from the building.
  const [streetOpen, setStreetOpen] = useState(false)
  const [houseOpen, setHouseOpen] = useState(false)
  const busy = useRef(false)
  const through = (setOpen, to, key) => {
    if (busy.current) return
    busy.current = true
    setOpen(true)
    window.dispatchEvent(new CustomEvent('basterds:threshold', { detail: { to: key } }))
    setTimeout(() => cutTo(() => {
      fly(to, 'threshold-' + key); setOpen(false)
      setTimeout(() => { busy.current = false }, 1400)
    }), 380)
  }
  const enter = () => through(setStreetOpen, ROOM_ENTRY, 'room')
  const leave = () => through(setHouseOpen, STREET_RETURN, 'street')
  useEffect(() => {
    window.__basterdsEnter = enter; window.__basterdsLeave = leave
    return () => { delete window.__basterdsEnter; delete window.__basterdsLeave }
  })

  // Chapter Six: the arrival card, then a slow push toward the doors.
  const [arriving] = useState(() => arrivalWanted())
  const push = () => goToStation({ pos: [0, 1.55, 6.4], look: [0, 4.4, 0], fov }, 'arrival-push')

  useRoomAudio(basterdsAudio)

  // Which space the walker is in, published for the audio, the preview and the
  // Dailies. Walking right up to the street doors counts as going through them.
  const zoneRef = useRef('')
  useFrame(({ camera }) => {
    const { x, z } = camera.position
    const zone = zoneAt(x, z)
    if (zone !== zoneRef.current) {
      zoneRef.current = zone; window.__basterdsZone = zone
      window.dispatchEvent(new CustomEvent('basterds:zone', { detail: { zone } }))
    }
    if (zone === 'rue' && z < 0.95 && Math.abs(x) < 1.1 && !busy.current && performance.now() - flewAt.current > 3000) enter()
  })

  const g = config.grade || {}
  return (
    <>
      <fogExp2 attach="fog" args={[g.fogColor || '#0b0a0c', g.fogDensity ?? 0.012]} />

      {/* the Room's own lights: the back crossing, the booth, La Louisiane (the house key and the fire are Theatre's) */}
      <pointLight position={[-6.8, 2.7, -12.1]} intensity={16} distance={11} color="#ffc78a" />
      <pointLight position={[0.4, BOOTH_Y + 2.3, -8.3]} intensity={12} distance={8} color="#ffc27a" />
      <pointLight position={[11.4, BAR_Y + 1.75, -21.6]} intensity={11} distance={10} color="#ffb060" />

      {FOOTPRINTS.filter((f) => f.id !== 'rue' && f.id !== 'crossing').map((f) => (
        <Floor key={f.id} room={f} mat={f.id === 'stalls' ? mats.stalls : mats.wood} />
      ))}
      {/* the crossing floor, with the hole for the glass over chapter 1 */}
      {[
        [-8.8, HATCH.x0, -13.2, -11.0], [HATCH.x1, 9.8, -13.2, -11.0],
        [HATCH.x0, HATCH.x1, -13.2, HATCH.z0], [HATCH.x0, HATCH.x1, HATCH.z1, -11.0],
      ].map(([a, b2, c, d]) => (
        <mesh key={a + ':' + c} position={[(a + b2) / 2, 0, (c + d) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={mats.stalls}>
          <planeGeometry args={[b2 - a, d - c]} />
        </mesh>
      ))}
      <Floorboard />

      {/* THE ARRIVAL */}
      <Rue onDoor={onDoor} />
      <DoubleDoors pos={[0, 0, 0.12]} w={2.8} h={2.6} open={streetOpen} onUse={enter} mat={mats.door} />
      {arriving && <ArrivalCard onDone={push} />}

      {/* THE ROOM */}
      <Hall />
      <Ornament />
      <Cases />
      <UpperWalls />
      <Backstage />
      <Cellar />
      <DoubleDoors pos={[ROOM_DOORS.x, 0, ROOM_DOORS.z + 0.08]} ry={Math.PI} w={ROOM_DOORS.w} h={2.5}
        open={houseOpen} onUse={leave} mat={mats.door} />


      <Theatre />
    </>
  )
}
