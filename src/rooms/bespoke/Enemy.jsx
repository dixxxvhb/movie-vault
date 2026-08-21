import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { gaze } from '../../CameraRig.jsx'
import { table as Table, chairRow as ChairRow, bed as Bed } from '../props.jsx'
import { makeHotTakeTexture, makeMetaTexture } from '../infoTextures.js'
import { sheetOf } from '../../palette.js'
import { setGradeOverride, clearGradeOverride } from '../gradeBus.js'
import { useRoomAudio } from '../audio/engine.js'
import { start as startEnemyAudio } from '../audio/recipes/enemy.js'
import Duplicates from '../systems/Duplicates.jsx'
import { makeBlindsGoboTexture, makeChalkTexture, makeMarkedScoreTexture } from './enemyTextures.js'
import DoorRow from '../DoorRow.jsx'
import { wasDrag } from '../../pointer.js'

// ENEMY (2013) · 9.6 · "the apartment, doubled." Brief
// (VAULT-IMMERSION-BRIEF-v2.md §5): the Toronto apartment, venetian-blind
// light stripes, yellow-sepia haze pushed hard, every object twinned inches
// apart (one copy slightly wrong), spider-leg shadows that scale near
// corners and vanish under direct look, a skyline suggestion of something
// enormous never resolving, the score appearing twice (one lying by a
// decimal, truth on approach), and his own crack of the case in chalk.
//
// Geometry in meters. A single sparse room, ROOM_W x ROOM_D x ROOM_H, one
// window wall (+X) letting the blind-stripe light in, one chalk wall (-Z).
const ROOM_W = 4.2
const ROOM_D = 4.2
const ROOM_H = 2.5

const ENTRY_STATION = { pos: [0, 1.5, 1.8], look: [0, 1.4, -1.8], fov: 46 }
const LYING_STATION = { pos: [-1.1, 1.5, -0.7], look: [-1.55, 1.55, -ROOM_D / 2 + 0.05], fov: 40 }
const STATIONS = { entry: ENTRY_STATION, lying: LYING_STATION }

const CHALK_TEXT =
  'He invented the innocent. cute shy history teacher he dreams of being instead of the monster he sees himself as. ugh so good.'

/* ------------------------------------------------------------------ shell */

const texCache = new Map()
function flatTexture(key, draw) {
  if (texCache.has(key)) return texCache.get(key)
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  draw(c.getContext('2d'), S)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  texCache.set(key, tex)
  return tex
}
function plasterTexture(tint) {
  return flatTexture('plaster|' + tint, (ctx, S) => {
    ctx.fillStyle = tint
    ctx.fillRect(0, 0, S, S)
    let s = 47
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    ctx.globalAlpha = 0.05
    for (let i = 0; i < 2200; i++) {
      ctx.fillStyle = r() > 0.5 ? '#000' : '#fff'
      ctx.fillRect(r() * S, r() * S, 1.6, 1.6)
    }
    ctx.globalAlpha = 1
  })
}

function RoomShell({ grade }) {
  const wallTex = useMemo(() => plasterTexture(grade.fill || '#3a3020'), [grade.fill])
  const floorTex = useMemo(() => plasterTexture('#241e12'), [])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial map={floorTex} roughness={0.92} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial map={wallTex} roughness={0.95} />
      </mesh>
      <mesh position={[0, ROOM_H / 2, -ROOM_D / 2]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial map={wallTex} roughness={0.9} />
      </mesh>
      <mesh position={[0, ROOM_H / 2, ROOM_D / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial map={wallTex} roughness={0.9} />
      </mesh>
      <mesh position={[-ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial map={wallTex} roughness={0.9} />
      </mesh>
      {/* +X window wall, mostly glazing */}
      <mesh position={[ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial map={wallTex} roughness={0.9} />
      </mesh>
      <mesh position={[ROOM_W / 2 - 0.01, ROOM_H * 0.55, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D * 0.72, ROOM_H * 0.5]} />
        <meshBasicMaterial color={grade.key || '#c9a24a'} transparent opacity={0.32} />
      </mesh>
    </group>
  )
}

/* --------------------------------------------------------- blind stripes */

// The gobo stripe pattern, cast two ways: a semi-transparent plane just
// inside the window (the light itself, cut into bars) and a matching decal
// on the floor beneath it (where those bars actually land). Both read the
// SAME texture so the stripes agree with each other.
function BlindLight() {
  const tex = useMemo(() => makeBlindsGoboTexture(), [])
  return (
    <group>
      <mesh position={[ROOM_W / 2 - 0.05, ROOM_H * 0.55, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D * 0.72, ROOM_H * 0.5]} />
        <meshBasicMaterial map={tex} color="#0a0704" transparent opacity={0.55} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, -Math.PI / 2]} position={[0.6, 0.006, 0]}>
        <planeGeometry args={[2.6, 3.0]} />
        <meshBasicMaterial map={tex} color="#0a0704" transparent opacity={0.4} depthWrite={false} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------ spider shadows */

// Spider-leg shadow: a canvas-drawn radiating shape in the ceiling corner,
// visible only in your peripheral vision and gone the instant you look
// straight at it — same gaze-angle math as systems/PeripheralFigure.jsx
// (kept local rather than importing that component, since this renders a
// flat shadow shape, not an abstractFigure).
function spiderTexture() {
  return flatTexture('spider', (ctx, S) => {
    ctx.clearRect(0, 0, S, S)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    const legs = 7
    for (let i = 0; i < legs; i++) {
      const a = (i / legs) * Math.PI * 0.9 + 0.1
      ctx.globalAlpha = 0.5 + (i % 3) * 0.1
      ctx.beginPath()
      ctx.moveTo(S * 0.15, S * 0.15)
      const midx = S * 0.15 + Math.cos(a) * S * 0.35
      const midy = S * 0.15 + Math.sin(a) * S * 0.35
      ctx.quadraticCurveTo(midx, midy, S * 0.15 + Math.cos(a) * S * 0.6, S * 0.15 + Math.sin(a) * S * 0.6)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  })
}

function SpiderShadow({ pos, cornerYaw }) {
  const ref = useRef()
  const tex = useMemo(() => spiderTexture(), [])
  useFrame(() => {
    if (!ref.current) return
    let d = Math.abs(gaze.yaw - cornerYaw)
    while (d > Math.PI) d = Math.abs(d - Math.PI * 2)
    const edge = 0.3, full = 1.0
    const s = Math.min(1, Math.max(0, (d - edge) / (full - edge)))
    // smoothstep, then INVERTED for "vanish under direct gaze": looking
    // straight at the corner (d≈0) drives s to 0, so opacity should be 0
    // there and rise as you look away — s already does exactly that.
    const smooth = s * s * (3 - 2 * s)
    ref.current.material.opacity = smooth * 0.6
  })
  return (
    <mesh ref={ref} position={pos} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.2, 2.2]} />
      <meshBasicMaterial map={tex} color="#000000" transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

/* ------------------------------------------------------------- skyline */

function Skyline() {
  const boxes = useMemo(() => Array.from({ length: 10 }, (_, i) => ({
    x: (i - 4.5) * 0.5,
    h: 0.6 + (i % 4) * 0.4,
  })), [])
  return (
    <group position={[ROOM_W / 2 + 3, 0, 0]}>
      {boxes.map((b, i) => (
        <mesh key={i} position={[0.2, b.h / 2 + 1.4, b.x]}>
          <boxGeometry args={[0.6, b.h, 0.4]} />
          <meshStandardMaterial color="#26241a" roughness={0.95} transparent opacity={0.55} />
        </mesh>
      ))}
      {/* the fog-faint suggestion, never resolving: two vast, very low
          opacity "legs" straddling the skyline, deliberately underdefined */}
      <mesh position={[1.4, 3.6, -0.6]}>
        <cylinderGeometry args={[0.14, 0.22, 7, 8]} />
        <meshBasicMaterial color="#0c0a06" transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[1.4, 3.6, 0.9]}>
        <cylinderGeometry args={[0.14, 0.22, 7, 8]} />
        <meshBasicMaterial color="#0c0a06" transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  )
}

/* --------------------------------------------------------------- score */

// Two numerals, on opposite walls: the "true" 9.6 by the door (opacity
// steady) and the "lying" 9.5 (position below, LYING_STATION's own wall)
// which flickers to correct itself once — irreversible, only ever
// triggered from its own click station.
function ScoreDuo({ film, corrected }) {
  const trueLabel = (film.score ?? 9.6).toFixed(1)
  const lieLabel = (Math.round((film.score - 0.1) * 10) / 10).toFixed(1)
  const lieRef = useRef()
  const flickerUntil = useRef(0)

  useEffect(() => {
    if (corrected) flickerUntil.current = performance.now() / 1000 + 0.7
  }, [corrected])

  useFrame(({ clock }) => {
    if (!lieRef.current) return
    const t = clock.elapsedTime
    if (corrected && t < flickerUntil.current) {
      // rapid on/off — the flicker itself
      lieRef.current.material.opacity = Math.floor(t * 22) % 2 === 0 ? 1 : 0.15
    } else if (corrected) {
      lieRef.current.material.opacity = 1
    }
  })

  return (
    <group>
      <mesh position={[ROOM_W / 2 - 0.012, 1.7, 1.2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshBasicMaterial
          map={useMemo(() => makeMarkedScoreTexture(trueLabel, '#c9a24a'), [trueLabel])}
          transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={lieRef} position={[-ROOM_W / 2 + 0.012, 1.6, -0.7]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshBasicMaterial
          map={useMemo(
            () => makeMarkedScoreTexture(corrected ? trueLabel : lieLabel, '#c9a24a'),
            [corrected, trueLabel, lieLabel]
          )}
          transparent opacity={1} depthWrite={false} toneMapped={false} side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

/* --------------------------------------------------------------- chalk */

function ChalkCrack() {
  const tex = useMemo(() => makeChalkTexture(CHALK_TEXT, '— Dixon, in debrief'), [])
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <mesh position={[0.9, 1.45, -ROOM_D / 2 + 0.012]}>
      <planeGeometry args={[1.9, 0.95]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

/* -------------------------------------------------------------- record */

function InfoPlinth({ film }) {
  const palette = sheetOf(film.palette)
  const [hotTex, setHotTex] = useState(null)
  const [metaTex, setMetaTex] = useState(null)
  useEffect(() => {
    let live = true
    const h = makeHotTakeTexture(film, palette)
    const m = makeMetaTexture(film, palette)
    if (live) { setHotTex(h); setMetaTex(m) }
    return () => { live = false; h.dispose(); m.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug])

  return (
    <group position={[1.3, 0, 1.3]} rotation={[0, -0.35, 0]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.06, 1.1, 0.06]} />
        <meshStandardMaterial color="#241e12" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.22, 0.02]}>
        <planeGeometry args={[1.0, 0.62]} />
        {hotTex
          ? <meshBasicMaterial key="mapped" map={hotTex} toneMapped={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" color={palette.paper} toneMapped={false} />}
      </mesh>
      <mesh position={[0, 0.86, 0.02]}>
        <planeGeometry args={[0.86, 0.16]} />
        {metaTex
          ? <meshBasicMaterial key="mapped" map={metaTex} transparent depthWrite={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" transparent opacity={0} />}
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ room */

const DOOR_MOUNT = { position: [0, 0, ROOM_D / 2 - 0.05], rotationY: Math.PI, spacing: 0.95, scale: 0.8 }

export default function Enemy({ film, config, doors = [], goToStation, onDoor }) {
  const { grade } = config
  const [stationKey, setStationKey] = useState('entry')
  const [corrected, setCorrected] = useState(false)

  const stepTo = (key) => {
    setStationKey(key)
    goToStation?.(STATIONS[key], key)
    if (key === 'lying') setCorrected(true) // approaching it corrects it — one-way
  }

  useEffect(() => {
    setGradeOverride({ sat: grade.sat ?? 0.12, contrast: grade.contrast ?? 0.06, hue: 0.02 })
    return clearGradeOverride
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useRoomAudio(startEnemyAudio)

  const furniture = (
    <>
      <Table pos={[-0.4, 0, -0.4]} w={1} d={0.6} color="#3a2c1a" />
      <ChairRow pos={[-0.4, 0, -0.1]} count={2} spacing={0.6} color="#241c10" />
      <Bed pos={[1.3, 0, -1.0]} rot={[0, -0.2, 0]} color="#5a5040" frame="#241c10" />
    </>
  )

  return (
    <group>
      <fogExp2 attach="fog" args={[grade.fill || '#3a3020', 0.05]} />
      <pointLight position={[0.6, 2.2, 0]} intensity={(grade.keyIntensity ?? 1) * 14} color={grade.key || '#c9a24a'} distance={12} decay={2} />
      <ambientLight intensity={grade.ambient ?? 0.22} color={grade.fill || '#3a3020'} />

      <RoomShell grade={grade} />
      <BlindLight />
      <Skyline />

      {/* every object twinned, the second copy slightly wrong — Duplicates
          renders its children twice with a small offset/rotation delta */}
      <Duplicates offset={0.11} wrongness="high">
        {furniture}
      </Duplicates>

      {/* "your camera casts two shadows": a soft dark floor blob at the
          entry standpoint, twinned by the same Duplicates offset as the
          furniture — your own presence in the room is doubled too */}
      <Duplicates offset={0.09} wrongness="high">
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 1.7]}>
          <circleGeometry args={[0.32, 20]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      </Duplicates>

      <SpiderShadow pos={[ROOM_W / 2 - 0.9, ROOM_H - 0.02, -ROOM_D / 2 + 0.9]} cornerYaw={Math.atan2(-(ROOM_W / 2 - 0.9), -(-ROOM_D / 2 + 0.9))} />

      <ScoreDuo film={film} corrected={corrected} />
      <ChalkCrack />
      <InfoPlinth film={film} />

      {Object.entries(STATIONS).map(([key, st]) => (
        <mesh
          key={key}
          position={[st.pos[0], 0.012, st.pos[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e) => { e.stopPropagation(); if (wasDrag()) return; stepTo(key) }}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'auto' }}
        >
          <ringGeometry args={[0.18, 0.24, 20]} />
          <meshBasicMaterial color="#c9a24a" transparent opacity={stationKey === key ? 0.55 : 0.2} depthWrite={false} />
        </mesh>
      ))}

      <DoorRow
        doors={doors}
        position={DOOR_MOUNT.position}
        rotationY={DOOR_MOUNT.rotationY}
        spacing={DOOR_MOUNT.spacing}
        scale={DOOR_MOUNT.scale}
        grade={grade}
        onDoor={onDoor}
      />
    </group>
  )
}
