import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { gaze } from '../../CameraRig.jsx'
import { bed as Bed, table as Table, counter as Counter, mirrorPlane as MirrorPlane, paperScatter as PaperScatter } from '../props.jsx'
import { makeMetaTexture } from '../infoTextures.js'
import { sheetOf } from '../../palette.js'
import { setGradeOverride, clearGradeOverride } from '../gradeBus.js'
import { registerColliders, setBounds, clearOwner } from '../colliders.js'
import { useRoomAudio } from '../audio/engine.js'
import { start as startMementoAudio } from '../audio/recipes/memento.js'
import {
  makeNoteTexture, makeNoteBackTexture, makePolaroidTexture, makeFloorPolaroidTexture, makeMirrorNumeralTexture,
} from './mementoTextures.js'
import DoorRow from '../DoorRow.jsx'
import Touchable from '../Touchable.jsx'
import { OpenKind } from '../touchKinds.jsx'

// THE CROWN, 10.0 — "the motel room, backwards." This is the room that
// states the Vault's own thesis (brief §5), so it is the one place in the
// app that is entirely hand-authored rather than staged through GenericRoom:
// the Discount Inn room, the door, the ~18m corridor that un-develops behind
// you as you walk it, the split grade, the mirror-reversed 10.0, and the
// floor-sized polaroid standing in for the hot-take sheet.
//
// Geometry in meters. Room ~4.5 x 2.8 x 5 (w x h x d); the door sits in the
// far (-Z) wall and the corridor continues past it, further into -Z.
const ROOM_W = 4.5
const ROOM_H = 2.8
const ROOM_D = 5
const DOOR_Z = -ROOM_D / 2
// As wide as the corridor itself (CORR_W below) — a narrower door than the
// hallway behind it turned the doorway into a keyhole that clipped the
// corridor's own side walls out of view and left an odd bright sliver of
// floor/ceiling visible through the gap instead of a coherent hallway.
const DOOR_W = 2.0
const DOOR_H = 2.2
const EYE = 1.55

const CELL_LEN = 3          // station spacing, per the spec
const CELLS = 6             // 6 * 3m = 18m corridor
const CORR_W = 2.0
const CORR_H = 2.5

// Dixon's own record, chopped into fragments — never the film's dialogue.
// Sourced from data/hot_takes.json's memento entry and the ledger panel's
// debrief/chat quotes (data/ledger_panels.json), paraphrased down to what
// would fit on an index card.
const NOTE_COPY = [
  'it deserves the 5.0',
  'everything else gets lowered a percentage',
  "structure can't be spoiled",
  'the insulin question stays open',
  "antibodies didn't save him",
  'watched on peacock — july 16',
  'he chooses the lie at the end',
  'a set up bullshittery for lenny',
  'very much life of pi coded',
  'your nickname is now and forever leonard',
  'this document is my polaroids',
  'no answer on the insulin. on purpose.',
]

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const WALL_T = 0.15

/* ----------------------------------------------------------- wall texture */

const roomTexCache = new Map()
function buildWallTexture(tint) {
  if (roomTexCache.has(tint)) return roomTexCache.get(tint)
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, S, S)
  ctx.globalAlpha = 0.1
  let s = 91
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  for (let x = 0; x < S; x += 3) {
    ctx.strokeStyle = r() > 0.5 ? '#000' : '#3a2a18'
    ctx.beginPath()
    ctx.moveTo(x + Math.sin(x * 0.05) * 6, 0)
    ctx.lineTo(x + Math.sin(x * 0.05 + 3) * 6, S)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  roomTexCache.set(tint, tex)
  return tex
}

const corrTexCache = new Map()
function buildCorridorTexture(tint) {
  if (corrTexCache.has(tint)) return corrTexCache.get(tint)
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, S, S)
  ctx.globalAlpha = 0.09
  for (let y = 0; y < S; y += 5) {
    ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000'
    ctx.fillRect(0, y, S, 1)
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2, 1)
  corrTexCache.set(tint, tex)
  return tex
}

/* --------------------------------------------------------------- shell(s) */

// The Discount Inn's own wallpaper — a fixed worn brown, not grade.fill
// (that field is the room's COOL counter-light per configs.js's own
// convention; using it for the paint colour made the walls read teal, the
// opposite of "warm into the room").
const WALL_PAINT = '#4a3a26'

function RoomShell({ grade }) {
  const wallTex = useMemo(() => buildWallTexture(WALL_PAINT), [])
  const floorTex = useMemo(() => buildWallTexture('#2a221a'), [])
  const sidePanelW = (ROOM_W - DOOR_W) / 2

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial map={floorTex} roughness={0.94} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial map={wallTex} roughness={0.96} />
      </mesh>
      {/* +Z wall, behind the entry camera */}
      <mesh position={[0, ROOM_H / 2, ROOM_D / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial map={wallTex} roughness={0.9} />
      </mesh>
      {/* -Z wall, split around the doorway */}
      <mesh position={[-(sidePanelW / 2 + DOOR_W / 2), ROOM_H / 2, DOOR_Z]}>
        <planeGeometry args={[sidePanelW, ROOM_H]} />
        <meshStandardMaterial map={wallTex} roughness={0.9} />
      </mesh>
      <mesh position={[sidePanelW / 2 + DOOR_W / 2, ROOM_H / 2, DOOR_Z]}>
        <planeGeometry args={[sidePanelW, ROOM_H]} />
        <meshStandardMaterial map={wallTex} roughness={0.9} />
      </mesh>
      <mesh position={[0, (DOOR_H + ROOM_H) / 2, DOOR_Z]}>
        <planeGeometry args={[DOOR_W, ROOM_H - DOOR_H]} />
        <meshStandardMaterial map={wallTex} roughness={0.9} />
      </mesh>
      {/* door frame trim */}
      {[-DOOR_W / 2, DOOR_W / 2].map((x, i) => (
        <mesh key={i} position={[x, DOOR_H / 2, DOOR_Z + 0.02]}>
          <boxGeometry args={[0.06, DOOR_H, 0.06]} />
          <meshStandardMaterial color="#1c140c" roughness={0.6} />
        </mesh>
      ))}
      {/* side walls */}
      <mesh position={[-ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial map={wallTex} roughness={0.88} />
      </mesh>
      <mesh position={[ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial map={wallTex} roughness={0.88} />
      </mesh>
    </group>
  )
}

// One 3m corridor cell. `level`: 0 full material, 1 wireframe, 2 gone
// (unmounted — this function simply returns null for its solid geometry,
// which IS the "gone" state; the fog swallows the resulting void).
function CorridorCell({ index, level }) {
  const tex = useMemo(() => buildCorridorTexture('#2e2a22'), [])
  const wireGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(CORR_W, CORR_H, CELL_LEN)), [])
  const z0 = DOOR_Z - index * CELL_LEN
  const z1 = DOOR_Z - (index + 1) * CELL_LEN
  const mid = (z0 + z1) / 2

  const solids = level === 0 ? (
    <group key="solid">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, mid]}>
        <planeGeometry args={[CORR_W, CELL_LEN]} />
        <meshStandardMaterial map={tex} roughness={0.92} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, CORR_H, mid]}>
        <planeGeometry args={[CORR_W, CELL_LEN]} />
        <meshStandardMaterial map={tex} roughness={0.95} />
      </mesh>
      <mesh position={[-CORR_W / 2, CORR_H / 2, mid]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[CELL_LEN, CORR_H]} />
        <meshStandardMaterial map={tex} roughness={0.88} />
      </mesh>
      <mesh position={[CORR_W / 2, CORR_H / 2, mid]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[CELL_LEN, CORR_H]} />
        <meshStandardMaterial map={tex} roughness={0.88} />
      </mesh>
    </group>
  ) : level === 1 ? (
    <group key="wire">
      <lineSegments geometry={wireGeo} position={[0, CORR_H / 2, mid]}>
        <lineBasicMaterial color="#5a4a30" transparent opacity={0.55} />
      </lineSegments>
    </group>
  ) : null

  return <group>{solids}</group>
}

// The corridor's own dead end. Its four walls are a hollow tube — nothing
// sits ON the tunnel's own centreline, so a ray looking straight down it
// never hits a surface until the tube itself runs out, and with no cap that
// meant an increasingly large cone of pure background/void the closer you
// got to the last cell (worse the deeper you'd walked, since less tunnel was
// left to catch the eye at all): read as a flat black rectangle swallowing
// the view rather than a hallway that ends. One plane, facing back up the
// corridor, closes it.
function CorridorEndCap() {
  const tex = useMemo(() => buildCorridorTexture('#221e18'), [])
  const z = DOOR_Z - CELLS * CELL_LEN
  return (
    <mesh position={[0, CORR_H / 2, z]}>
      <planeGeometry args={[CORR_W, CORR_H]} />
      <meshStandardMaterial map={tex} roughness={0.95} />
    </mesh>
  )
}

// The polaroids pinned along the corridor: the last thing to survive. They
// never unmount — level 2 (their wall long gone) just dims them, so the
// corridor's own proof-it-existed is the only light left back there.
function CorridorPolaroid({ index, tex, faded }) {
  const z0 = DOOR_Z - index * CELL_LEN
  const z1 = DOOR_Z - (index + 1) * CELL_LEN
  const mid = (z0 + z1) / 2
  return (
    <mesh position={[CORR_W / 2 - 0.015, 1.5, mid]} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={[0.17, 0.21]} />
      {tex
        ? <meshStandardMaterial
            key="mapped" map={tex} emissiveMap={tex} emissive="#ffffff"
            emissiveIntensity={faded ? 0.1 : 0.3} roughness={0.9}
            color={faded ? '#555' : '#fff'}
          />
        : <meshBasicMaterial key="blank" transparent opacity={0} />}
    </mesh>
  )
}

/* ----------------------------------------------------------------- notes */

function useBatchTextures(build) {
  const [texs, setTexs] = useState(null)
  useEffect(() => {
    let live = true
    const made = build()
    if (live) setTexs(made)
    return () => { live = false; made.forEach((t) => t?.dispose()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return texs
}

const WALL_ITEMS = (() => {
  const cols = [-1.7, -0.65, 0.5, 1.65]
  const rows = [1.05, 1.6, 2.15]
  const items = []
  let noteI = 0
  rows.forEach((y, ri) => {
    cols.forEach((z, ci) => {
      const isPolaroid = (ri + ci) % 3 === 0
      items.push({
        type: isPolaroid ? 'polaroid' : 'note',
        y,
        z,
        seed: ri * 10 + ci,
        rot: ((ri * 7 + ci * 13) % 9 - 4) * 0.03,
        text: isPolaroid ? null : NOTE_COPY[noteI++ % NOTE_COPY.length],
      })
    })
  })
  return items
})()

// Wave T: a note quad you can touch to flip over. The wall's own base
// orientation (position + rotation.y=PI/2 + the item's little per-note tilt)
// stays on a static outer group, never animated — OpenKind's hinge mode
// resets rotation before applying its own single axis, so the flip lives on
// an INNER group instead, spinning on its own local Y on top of that fixed
// orientation. Front/back are two coincident FrontSide planes rather than
// one DoubleSide plane with two textures: rotating the pair 180 degrees is a
// rigid transform, so the back page reads correctly (not mirrored) the
// instant it's the one facing you.
function FlippableNote({ it, w, h, frontTex }) {
  const [token, setToken] = useState(0)
  const backTex = useMemo(() => makeNoteBackTexture(it.seed), [it.seed])
  useEffect(() => () => backTex.dispose(), [backTex])

  return (
    <group position={[-ROOM_W / 2 + 0.012, it.y, it.z]} rotation={[0, Math.PI / 2, it.rot]}>
      <Touchable onUse={() => setToken((t) => t + 1)} reach={2.4} foley="paper" anchor={[0, 0, 0]}>
        <OpenKind token={token} mode="hinge" hingeAxis="y" angle={Math.PI}>
          <mesh position={[0, 0, 0.0015]}>
            <planeGeometry args={[w, h]} />
            {frontTex
              ? <meshStandardMaterial key="mapped" map={frontTex} emissiveMap={frontTex} emissive="#ffffff" emissiveIntensity={0.3} roughness={0.92} side={THREE.FrontSide} />
              : <meshStandardMaterial key="blank" color="#e8dfc8" roughness={0.92} side={THREE.FrontSide} />}
          </mesh>
          <mesh position={[0, 0, -0.0015]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[w, h]} />
            <meshStandardMaterial map={backTex} emissiveMap={backTex} emissive="#ffffff" emissiveIntensity={0.22} roughness={0.94} side={THREE.FrontSide} />
          </mesh>
        </OpenKind>
      </Touchable>
    </group>
  )
}

function NoteWall() {
  const wallX = -ROOM_W / 2 + 0.012
  const texs = useBatchTextures(() =>
    WALL_ITEMS.map((it) => it.type === 'note' ? makeNoteTexture(it.text, it.seed) : makePolaroidTexture(it.seed))
  )
  return (
    <group>
      {WALL_ITEMS.map((it, i) => {
        const tex = texs?.[i]
        const w = it.type === 'note' ? 0.24 : 0.165
        const h = it.type === 'note' ? 0.18 : 0.195
        // every note quad flips (8 of them, comfortably past the "at least
        // 6" law); polaroids stay static wall dressing, unchanged.
        if (it.type === 'note') {
          return <FlippableNote key={i} it={it} w={w} h={h} frontTex={tex} />
        }
        return (
          <mesh key={i} position={[wallX, it.y, it.z]} rotation={[0, Math.PI / 2, it.rot]}>
            <planeGeometry args={[w, h]} />
            {tex
              ? <meshStandardMaterial key="mapped" map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.3} roughness={0.92} side={THREE.DoubleSide} />
              : <meshStandardMaterial key="blank" color="#e8dfc8" roughness={0.92} side={THREE.DoubleSide} />}
          </mesh>
        )
      })}
    </group>
  )
}

/* ------------------------------------------------------------ floor take */

function FloorPolaroid({ film }) {
  const [tex, setTex] = useState(null)
  useEffect(() => {
    let live = true
    const t = makeFloorPolaroidTexture(film)
    if (live) setTex(t)
    return () => { live = false; t.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug])
  return (
    <mesh position={[0.3, 0.008, 0.35]} rotation={[-Math.PI / 2, 0, 0.06]}>
      <planeGeometry args={[1.76, 2.2]} />
      {tex
        ? <meshStandardMaterial key="mapped" map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.45} roughness={0.95} />
        : <meshStandardMaterial key="blank" color="#efe9dc" roughness={0.95} />}
    </mesh>
  )
}

/* -------------------------------------------------------------- mirror 10 */

function MirrorNumeral({ score }) {
  const [tex, setTex] = useState(null)
  useEffect(() => {
    let live = true
    const t = makeMirrorNumeralTexture(score)
    if (live) setTex(t)
    return () => { live = false; t.dispose() }
  }, [score])

  const wallX = ROOM_W / 2 - 0.012
  return (
    <group>
      {/* the world plaque: mesh scaled -1 on X mirrors the geometry (and its
          UVs with it) — one texture, drawn once, reads BACKWARDS here and
          correctly inside the mirror plane below. This is the whole trick:
          no second canvas, just a flipped mesh. */}
      <mesh position={[wallX, 1.98, -0.5]} rotation={[0, -Math.PI / 2, 0]} scale={[-1, 1, 1]}>
        <planeGeometry args={[0.46, 0.46]} />
        {tex
          ? <meshBasicMaterial key="mapped" map={tex} transparent depthWrite={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" transparent opacity={0} />}
      </mesh>
      {/* the mirror itself */}
      <MirrorPlane pos={[wallX - 0.01, 1.55, -0.9]} rot={[0, -Math.PI / 2, 0]} w={0.78} h={1.1} tint="#aebac0" />
      {/* the "reflection": same texture, NOT flipped, sitting just off the
          mirror's own surface where the plaque's reflection would fall —
          this app has no real-time reflection pass, so it is faked the same
          way mirrorPlane already is everywhere else (a tinted quad, not a
          render target) */}
      <mesh position={[wallX - 0.018, 1.55, -0.9]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.34, 0.34]} />
        {tex
          ? <meshBasicMaterial key="mapped" map={tex} transparent depthWrite={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" transparent opacity={0} />}
      </mesh>
    </group>
  )
}

// The corridor has no fixtures of its own (a motel hallway this far back
// wouldn't), so the only light down there travels with you — a dim, cool
// pool a couple of meters wide, camera-attached. Without this the un-develop
// stages (wireframe, gone) are technically correct but invisible: the
// corridor was reading as a solid black void past the door.
function CorridorGlow() {
  const ref = useRef()
  useFrame(({ camera }) => {
    if (!ref.current) return
    ref.current.position.copy(camera.position)
  })
  return <pointLight ref={ref} color="#cfd8dc" intensity={130} distance={10} decay={1.7} />
}

function ColdFlicker({ position }) {
  const ref = useRef()
  const base = 0.6
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    // an old bathroom tube: mostly steady, the occasional stutter
    const stutter = Math.sin(t * 41) > 0.982 ? 0.35 : 0
    ref.current.intensity = (base + Math.sin(t * 3.1) * 0.03 - stutter) * 12
  })
  return <pointLight ref={ref} position={position} color="#c9dbe0" distance={3} decay={2} />
}

/* ------------------------------------------------------------- meta note */

// Wave T: the nightstand drawer. The nightstand itself is the plain `Table`
// at [1.4,0,1.35] rot.y=-0.15 rendered below (the collider list already
// calls this footprint "nightstand") — an open-leg table with no drawer body
// of its own, so the drawer is new geometry mounted in its own local frame,
// slid open/closed with the shared OpenKind. The meta notepad already sits
// on this exact nightstand (film.slug's own record propped on top), so it's
// reparented in here at the same local offset that reproduces its old world
// position exactly when the drawer is closed — it rides out with the drawer
// front rather than floating independently.
function NightstandDrawer({ film }) {
  const [token, setToken] = useState(0)
  const palette = sheetOf(film.palette)
  const [tex, setTex] = useState(null)
  useEffect(() => {
    let live = true
    const t = makeMetaTexture(film, palette)
    if (live) setTex(t)
    return () => { live = false; t.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug])

  return (
    <group position={[1.4, 0, 1.35]} rotation={[0, -0.15, 0]}>
      <Touchable onUse={() => setToken((t) => t + 1)} reach={2.2} foley="creak" anchor={[0, 0.4, 0.2]}>
        <OpenKind token={token} mode="slide" axis="z" distance={0.16}>
          {/* drawer carcass */}
          <mesh position={[0, 0.34, 0.02]}>
            <boxGeometry args={[0.4, 0.14, 0.34]} />
            <meshStandardMaterial color="#1c1408" roughness={0.85} />
          </mesh>
          {/* drawer front */}
          <mesh position={[0, 0.34, 0.19]}>
            <boxGeometry args={[0.42, 0.16, 0.04]} />
            <meshStandardMaterial color="#241a10" roughness={0.7} />
          </mesh>
          {/* pull */}
          <mesh position={[0, 0.34, 0.215]}>
            <boxGeometry args={[0.12, 0.02, 0.02]} />
            <meshStandardMaterial color="#0e0a06" metalness={0.4} roughness={0.5} />
          </mesh>
          {/* the notepad, riding along — local offset chosen so the closed
              pose lands exactly on its old world position [1.35,0.66,1.55] */}
          <mesh position={[-0.02, 0.66, 0.205]} rotation={[-Math.PI / 2, 0.15, -0.1]}>
            <planeGeometry args={[0.42, 0.1]} />
            {tex
              ? <meshBasicMaterial key="mapped" map={tex} transparent depthWrite={false} side={THREE.DoubleSide} />
              : <meshBasicMaterial key="blank" transparent opacity={0} />}
          </mesh>
        </OpenKind>
      </Touchable>
    </group>
  )
}

/* ------------------------------------------------------------------ room */

// Bloodline doors (brief §6) mount on the +Z wall — behind the entry camera
// (config.camera looks toward -Z, at the corridor door), the one wall in
// this room every prop list above leaves clear: the note wall and the
// mirror/numeral both claim a SIDE wall, and nothing sits past z=1.55. Scaled
// down and tightly spaced (four links, memento's max) so all four clear the
// side walls with room to spare — this is the motel room zone strictly,
// never the corridor past the door.
const DOOR_MOUNT = { position: [0, 0, ROOM_D / 2 - 0.05], rotationY: Math.PI, spacing: 1.0, scale: 0.85 }

// Wave M3: free walk. `goToStation` (FilmWorld's flight seam) is no longer
// called from in here — the entry viewpoint stays config.camera, and every
// place inside the room is reached by walking, not clicking — so it's
// deliberately not destructured; FilmWorld still passes it, unused.
export default function Memento({ film, config, doors = [], onDoor }) {
  const { grade } = config
  // Wave M3: the walker replaces click-to-advance. `maxIndex` is now a
  // monotonic high-water mark derived from the walker's own z each frame
  // (never a click count) — walking deeper raises it, walking back never
  // lowers it, which is the un-develop law: what's behind you stays gone.
  const maxIndexRef = useRef(-1)
  const [maxIndex, setMaxIndex] = useState(-1)

  // The door: purely a visual "closed door" black plane from the room side.
  // It fades out (~400ms) the moment the walker gets within 0.8m of the
  // threshold, and once faded it never comes back — same monotonic shape as
  // the un-develop high-water above, just for one plane instead of six cells.
  const doorMatRef = useRef()
  const doorOpacityRef = useRef(0.82)
  const doorFadedRef = useRef(false)

  const corridorPolTexs = useBatchTextures(() =>
    Array.from({ length: CELLS }, (_, i) => makePolaroidTexture(300 + i))
  )

  // The split grade: warm in the room, silver B&W down the corridor. Once
  // you're standing IN the corridor it follows view yaw (gaze.yaw, published
  // every frame by CameraRig) — face back toward the room and it warms
  // again — but while you're still standing in the room itself, it stays
  // fully warm regardless of which way you happen to be looking. The entry
  // viewpoint is composed staring straight at the door, and a yaw-only rule
  // would have read that as "looking down the corridor" and desaturated the
  // room to grey on the very first frame, which is backwards: whether the
  // walker has actually crossed DOOR_Z into the corridor — not the compass
  // bearing of its opening camera cut — is what actually means "you are in
  // the corridor now."
  useFrame(({ camera }, dt) => {
    const z = camera.position.z

    // un-develop high-water, keyed to walker position per the spec formula
    const idx = clamp(Math.floor((DOOR_Z - 0.4 - z) / CELL_LEN), -1, CELLS - 1)
    if (idx > maxIndexRef.current) {
      maxIndexRef.current = idx
      setMaxIndex(idx)
    }

    const inCorridor = z < DOOR_Z
    let t
    if (!inCorridor) {
      t = 1 // in the room: always warm
    } else {
      const yaw = gaze.yaw
      // forward.z = -cos(yaw); +1 facing back toward the room, -1 facing
      // deeper down the corridor
      const roomFacing = -Math.cos(yaw)
      t = (roomFacing + 1) / 2
    }
    setGradeOverride({
      sat: THREE.MathUtils.lerp(-1, grade.sat ?? 0.05, t),
      contrast: THREE.MathUtils.lerp(0.16, grade.contrast ?? 0, t),
      hue: 0,
      // config.grade.bg has no override for this slug, so it falls back to
      // the film's own card-front palette — Memento's is white, right for a
      // Polaroid, very wrong for a 3D scene background peeking through the
      // corridor's far end. Corrected here instead of in configs.js (that
      // file is mid-edit elsewhere this session; this keeps the fix scoped
      // to this room).
      bg: t > 0.5 ? '#241c14' : '#0c0a08',
    })

    // door fade, gated on distance to the threshold rather than which side
    // you're on — walking through it and turning right back around does not
    // resurrect it, the door is gone the instant it's crossed
    if (!doorFadedRef.current) {
      const distToDoor = z - DOOR_Z
      if (distToDoor <= 0.8) {
        doorOpacityRef.current = Math.max(0, doorOpacityRef.current - dt * (0.82 / 0.4))
        if (doorOpacityRef.current <= 0.001) doorFadedRef.current = true
      }
    }
    if (doorMatRef.current) doorMatRef.current.opacity = doorOpacityRef.current
  })
  useEffect(() => clearGradeOverride, [])

  // Wave M3: colliders. Room walls (door gap open at DOOR_Z/DOOR_W), the
  // furniture, and the corridor's own side + far-end walls, all as one
  // owner's rect list; bounds is one generous rect spanning the room and the
  // full corridor length — the wall rects (not the bounds) are what actually
  // give the corridor its narrower shape, same device GenericRoom's own
  // corridor shell uses.
  useEffect(() => {
    const ownerId = 'bespoke:memento'
    registerColliders(ownerId, [
      // +Z wall, behind the entry camera
      { minX: -ROOM_W / 2, maxX: ROOM_W / 2, minZ: ROOM_D / 2, maxZ: ROOM_D / 2 + WALL_T },
      // -Z wall, split around the doorway
      { minX: -ROOM_W / 2, maxX: -DOOR_W / 2, minZ: DOOR_Z - WALL_T, maxZ: DOOR_Z },
      { minX: DOOR_W / 2, maxX: ROOM_W / 2, minZ: DOOR_Z - WALL_T, maxZ: DOOR_Z },
      // room side walls
      { minX: -ROOM_W / 2 - WALL_T, maxX: -ROOM_W / 2, minZ: DOOR_Z, maxZ: ROOM_D / 2 },
      { minX: ROOM_W / 2, maxX: ROOM_W / 2 + WALL_T, minZ: DOOR_Z, maxZ: ROOM_D / 2 },
      // corridor side walls
      { minX: -CORR_W / 2 - WALL_T, maxX: -CORR_W / 2, minZ: DOOR_Z - CELLS * CELL_LEN, maxZ: DOOR_Z },
      { minX: CORR_W / 2, maxX: CORR_W / 2 + WALL_T, minZ: DOOR_Z - CELLS * CELL_LEN, maxZ: DOOR_Z },
      // corridor far end (the dead-end cap)
      { minX: -CORR_W / 2, maxX: CORR_W / 2, minZ: DOOR_Z - CELLS * CELL_LEN - WALL_T, maxZ: DOOR_Z - CELLS * CELL_LEN },
      // furniture (approximate axis-aligned footprints, expanded a little
      // past each mesh's own local extent to absorb its small authored yaw)
      { minX: -2.1, maxX: -0.6, minZ: 0.05, maxZ: 2.25 }, // bed
      { minX: -1.9, maxX: -1.2, minZ: -0.68, maxZ: -0.12 }, // dresser
      { minX: 1.1, maxX: 1.7, minZ: 1.1, maxZ: 1.6 }, // nightstand
      { minX: 0.9, maxX: 2.2, minZ: -1.05, maxZ: -0.45 }, // bathroom sink counter
    ])
    setBounds(ownerId, {
      kind: 'rect',
      minX: -ROOM_W / 2 + 0.02,
      maxX: ROOM_W / 2 - 0.02,
      minZ: DOOR_Z - CELLS * CELL_LEN - 0.3,
      maxZ: ROOM_D / 2 - 0.02,
    })
    return () => clearOwner(ownerId)
  }, [])

  useRoomAudio(startMementoAudio)

  return (
    <group>
      <fogExp2 attach="fog" args={['#0c0a08', 0.035]} />
      <pointLight position={[0, 2.3, 0.6]} intensity={(grade.keyIntensity ?? 1.6) * 26} color={grade.key || '#c98a4a'} distance={14} decay={2} />
      <pointLight position={[0, 1.2, 1.8]} intensity={10} color={grade.fill || '#3a5560'} distance={10} decay={2} />

      <RoomShell grade={grade} />
      <CorridorGlow />

      <Bed pos={[-1.35, 0, 1.15]} rot={[0, 0.14, 0]} />
      <Table pos={[-1.55, 0, -0.4]} rot={[0, 0.1, 0]} w={0.6} d={0.45} h={0.55} color="#2c2014" />
      <PaperScatter pos={[-1.5, 0.56, -0.4]} rot={[Math.PI / 2, 0, 0]} count={10} area={[0.5, 0.4]} color="#e6dcc0" />
      <Table pos={[1.4, 0, 1.35]} rot={[0, -0.15, 0]} w={0.5} d={0.4} h={0.5} color="#3a2c1c" />
      <NightstandDrawer film={film} />

      {/* bathroom nook */}
      <Counter pos={[1.55, 0, -0.75]} rot={[0, -0.2, 0]} w={1.1} d={0.5} h={0.85} color="#8a8f92" />
      <ColdFlicker position={[1.55, 2.1, -0.75]} />
      <MirrorNumeral score={film.score} />

      <NoteWall />
      <FloorPolaroid film={film} />

      <DoorRow
        doors={doors}
        position={DOOR_MOUNT.position}
        rotationY={DOOR_MOUNT.rotationY}
        spacing={DOOR_MOUNT.spacing}
        scale={DOOR_MOUNT.scale}
        grade={grade}
        onDoor={onDoor}
      />

      {/* door + corridor. The slab is purely the visual "closed door" look
          from the room side (nearly opaque black filling the frame); its
          opacity is driven imperatively in the useFrame above (a distance-
          to-threshold fade, not a station index). */}
      <mesh position={[0, DOOR_H / 2 - 0.05, DOOR_Z + 0.01]}>
        <planeGeometry args={[DOOR_W - 0.06, DOOR_H - 0.1]} />
        <meshBasicMaterial ref={doorMatRef} color="#000000" transparent opacity={0.82} depthWrite={false} />
      </mesh>

      <CorridorEndCap />
      {Array.from({ length: CELLS }, (_, i) => {
        const level = clamp(maxIndex - i, 0, 2)
        return <CorridorCell key={i} index={i} level={level} />
      })}
      {Array.from({ length: CELLS }, (_, i) => (
        <CorridorPolaroid
          key={'p' + i}
          index={i}
          tex={corridorPolTexs?.[i]}
          faded={clamp(maxIndex - i, 0, 2) >= 2}
        />
      ))}
    </group>
  )
}
