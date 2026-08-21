import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { gaze } from '../../CameraRig.jsx'
import { bed as Bed, counter as Counter, mirrorPlane as MirrorPlane, paperScatter as PaperScatter } from '../props.jsx'
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
import { standardMat } from '../materials.js'
import { Bevel, Trim, crumpledPaper as CrumpledPaper, cup as Cup } from '../detail.jsx'
import LightRig, { LIGHT_SCALE } from '../lightRig.js'

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

/* --------------------------------------------------------------- shell(s) */

// The Discount Inn's own wallpaper — a fixed worn brown, not grade.fill
// (that field is the room's COOL counter-light per configs.js's own
// convention; using it for the paint colour made the walls read teal, the
// opposite of "warm into the room").
const WALL_PAINT = '#4a3a26'

// Every plaster surface below is its own standardMat() call with a nudged
// tint/scale/wear so no two adjacent walls share one material instance
// (materials.js's own rule) — the Discount Inn's paint job was never applied
// in one uniform coat, and grazing light across four IDENTICAL walls reads
// as a texture tile, not a room.
function RoomShell({ grade }) {
  const floorMat = useMemo(() => standardMat({ kind: 'carpet', tint: '#241c14', scale: 1.1, wear: 0.65, repeat: [3, 3.3] }), [])
  const ceilMat = useMemo(() => standardMat({ kind: 'plaster', tint: '#40331f', scale: 1.3, wear: 0.3, repeat: [2, 2] }), [])
  const wallBack = useMemo(() => standardMat({ kind: 'plaster', tint: WALL_PAINT, scale: 1, wear: 0.42, repeat: [1.6, 1] }), [])
  const wallLeftDoor = useMemo(() => standardMat({ kind: 'plaster', tint: '#453521', scale: 0.9, wear: 0.55, repeat: [0.8, 1], seed: 401 }), [])
  const wallRightDoor = useMemo(() => standardMat({ kind: 'plaster', tint: '#4c3c27', scale: 1.15, wear: 0.35, repeat: [0.8, 1], seed: 402 }), [])
  const wallAboveDoor = useMemo(() => standardMat({ kind: 'plaster', tint: '#463522', scale: 1, wear: 0.4, repeat: [1, 0.3], seed: 403 }), [])
  const wallW = useMemo(() => standardMat({ kind: 'plaster', tint: '#4a3927', scale: 1.25, wear: 0.5, repeat: [2, 1] }), [])
  const wallE = useMemo(() => standardMat({ kind: 'plaster', tint: '#443422', scale: 0.85, wear: 0.3, repeat: [2, 1], seed: 404 }), [])
  const doorFrameMat = useMemo(() => standardMat({ kind: 'wood', tint: '#1c140c', scale: 0.6, wear: 0.55, roughness: 0.75 }), [])

  const sidePanelW = (ROOM_W - DOOR_W) / 2
  const baseY = 0.045

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <primitive object={floorMat} attach="material" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <primitive object={ceilMat} attach="material" />
      </mesh>
      {/* +Z wall, behind the entry camera */}
      <mesh position={[0, ROOM_H / 2, ROOM_D / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <primitive object={wallBack} attach="material" />
      </mesh>
      {/* -Z wall, split around the doorway */}
      <mesh position={[-(sidePanelW / 2 + DOOR_W / 2), ROOM_H / 2, DOOR_Z]}>
        <planeGeometry args={[sidePanelW, ROOM_H]} />
        <primitive object={wallLeftDoor} attach="material" />
      </mesh>
      <mesh position={[sidePanelW / 2 + DOOR_W / 2, ROOM_H / 2, DOOR_Z]}>
        <planeGeometry args={[sidePanelW, ROOM_H]} />
        <primitive object={wallRightDoor} attach="material" />
      </mesh>
      <mesh position={[0, (DOOR_H + ROOM_H) / 2, DOOR_Z]}>
        <planeGeometry args={[DOOR_W, ROOM_H - DOOR_H]} />
        <primitive object={wallAboveDoor} attach="material" />
      </mesh>
      {/* door frame: beveled jambs + head, dark stained wood, standing proud
          of the wall plane rather than a naked flush box */}
      {[-DOOR_W / 2 - 0.03, DOOR_W / 2 + 0.03].map((x, i) => (
        <Bevel key={i} pos={[x, DOOR_H / 2, DOOR_Z + 0.025]} w={0.08} h={DOOR_H} d={0.07} radius={0.012} mat={doorFrameMat} />
      ))}
      <Bevel pos={[0, DOOR_H + 0.02, DOOR_Z + 0.025]} w={DOOR_W + 0.2} h={0.08} d={0.07} radius={0.012} mat={doorFrameMat} />
      {/* baseboards, all four walls */}
      <Trim pos={[0, baseY, ROOM_D / 2 - 0.01]} wallLength={ROOM_W} along="x" color="#1c140c" />
      <Trim pos={[-(sidePanelW / 2 + DOOR_W / 2), baseY, DOOR_Z + 0.01]} wallLength={sidePanelW} along="x" color="#1c140c" />
      <Trim pos={[sidePanelW / 2 + DOOR_W / 2, baseY, DOOR_Z + 0.01]} wallLength={sidePanelW} along="x" color="#1c140c" />
      <Trim pos={[-ROOM_W / 2 + 0.01, baseY, 0]} wallLength={ROOM_D} along="z" color="#1c140c" />
      <Trim pos={[ROOM_W / 2 - 0.01, baseY, 0]} wallLength={ROOM_D} along="z" color="#1c140c" />
      {/* side walls */}
      <mesh position={[-ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <primitive object={wallW} attach="material" />
      </mesh>
      <mesh position={[ROOM_W / 2, ROOM_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <primitive object={wallE} attach="material" />
      </mesh>
    </group>
  )
}

// One 3m corridor cell. `level`: 0 full material, 1 wireframe, 2 gone
// (unmounted — this function simply returns null for its solid geometry,
// which IS the "gone" state; the fog swallows the resulting void).
function CorridorCell({ index, level }) {
  // corridor concrete: floor/ceiling get their own params from the side
  // walls (materials.js rule — no two adjacent surfaces share one instance),
  // and darken slightly cell by cell so the far end reads a shade deeper
  // than the mouth even before the un-develop wireframe stage takes over.
  const depthWear = clamp(0.4 + index * 0.03, 0.4, 0.62)
  const floorMat = useMemo(() => standardMat({ kind: 'concrete', tint: '#2a2620', scale: 1.1, wear: depthWear, repeat: [1.4, 1.4] }), [depthWear])
  const ceilMat = useMemo(() => standardMat({ kind: 'concrete', tint: '#28241d', scale: 0.9, wear: depthWear, repeat: [1.4, 1.4], seed: 500 + index }), [depthWear, index])
  const wallMat = useMemo(() => standardMat({ kind: 'concrete', tint: '#2e2a22', scale: 1, wear: depthWear, repeat: [1.4, 1.4], seed: 600 + index }), [depthWear, index])
  const wireGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(CORR_W, CORR_H, CELL_LEN)), [])
  const z0 = DOOR_Z - index * CELL_LEN
  const z1 = DOOR_Z - (index + 1) * CELL_LEN
  const mid = (z0 + z1) / 2

  const solids = level === 0 ? (
    <group key="solid">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, mid]}>
        <planeGeometry args={[CORR_W, CELL_LEN]} />
        <primitive object={floorMat} attach="material" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, CORR_H, mid]}>
        <planeGeometry args={[CORR_W, CELL_LEN]} />
        <primitive object={ceilMat} attach="material" />
      </mesh>
      <mesh position={[-CORR_W / 2, CORR_H / 2, mid]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[CELL_LEN, CORR_H]} />
        <primitive object={wallMat} attach="material" />
      </mesh>
      <mesh position={[CORR_W / 2, CORR_H / 2, mid]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[CELL_LEN, CORR_H]} />
        <primitive object={wallMat} attach="material" />
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
  const mat = useMemo(() => standardMat({ kind: 'concrete', tint: '#1c1912', scale: 0.8, wear: 0.65, repeat: [1.2, 1.2] }), [])
  const z = DOOR_Z - CELLS * CELL_LEN
  return (
    <mesh position={[0, CORR_H / 2, z]}>
      <planeGeometry args={[CORR_W, CORR_H]} />
      <primitive object={mat} attach="material" />
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
        // depth: a few mm of standoff varied per item, per the polish spec
        // ("papers at slightly varied angles/depths") — a wall of paper that
        // is all flush with the plaster reads as decals, not pinned pages.
        depth: 0.004 + ((ri * 13 + ci * 7) % 5) * 0.0026,
        text: isPolaroid ? null : NOTE_COPY[noteI++ % NOTE_COPY.length],
      })
    })
  })
  return items
})()

// A single tape corner: a small translucent quad crossing a page's edge at
// 45 degrees, standing a hair further proud than the page itself so it
// never z-fights. Two per item (opposite corners) is enough to read as
// pinned rather than floating.
function TapeCorners({ x, y, z, rot, w, h, seed }) {
  const s = 0.028 + ((seed * 7) % 3) * 0.004
  const corners = [
    { dy: h / 2 - s * 0.3, dz: -w / 2 + s * 0.3, a: 0.78 },
    { dy: -h / 2 + s * 0.3, dz: w / 2 - s * 0.3, a: -0.78 + Math.PI },
  ]
  return (
    <group>
      {corners.map((c, i) => (
        <mesh key={i} position={[x + 0.0012, y + c.dy, z + c.dz]} rotation={[0, rot, c.a]}>
          <planeGeometry args={[s, s * 0.55]} />
          <meshStandardMaterial color="#d8cba0" roughness={0.7} transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

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
    <group position={[-ROOM_W / 2 + 0.012 + (it.depth || 0), it.y, it.z]} rotation={[0, Math.PI / 2, it.rot]}>
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
        const depthX = wallX + (it.depth || 0)
        if (it.type === 'note') {
          return (
            <group key={i}>
              <FlippableNote it={it} w={w} h={h} frontTex={tex} />
              <TapeCorners x={wallX} y={it.y} z={it.z} rot={Math.PI / 2} w={w} h={h} seed={it.seed} />
            </group>
          )
        }
        return (
          <group key={i}>
            <mesh position={[depthX, it.y, it.z]} rotation={[0, Math.PI / 2, it.rot]}>
              <planeGeometry args={[w, h]} />
              {tex
                ? <meshStandardMaterial key="mapped" map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.3} roughness={0.92} side={THREE.DoubleSide} />
                : <meshStandardMaterial key="blank" color="#e8dfc8" roughness={0.92} side={THREE.DoubleSide} />}
            </mesh>
            <TapeCorners x={wallX} y={it.y} z={it.z} rot={Math.PI / 2} w={w} h={h} seed={it.seed} />
          </group>
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
//
// PUNCH LIST FIX: this used to run at raw intensity 130, colocated with the
// camera — a point light has no near-field cap (irradiance ~ 1/distance^decay
// as distance->0), so ANY nearby surface (the door frame, the corridor walls
// a meter to either side) got hit with an unbounded amount of light. Looking
// back down the corridor toward the warm room compounded it: the room's own
// key/fill were also lighting that same doorway, and the sum blew to
// near-white well before tone mapping could roll it off. Retuned to
// LIGHT_SCALE.practicals units (same "how bright does this feel" authoring
// scale the rest of the toolkit uses) and — the actual fix — the glow now
// fades OUT as the camera nears the room again (t>0.6, the same split-grade
// signal Memento already tracks) rather than staying at full strength right
// up against the doorway it's about to blow out.
function CorridorGlow({ warmthRef }) {
  const ref = useRef()
  useFrame(({ camera }) => {
    if (!ref.current) return
    ref.current.position.copy(camera.position)
    const warmth = warmthRef?.current ?? 0
    const fade = 1 - clamp((warmth - 0.55) / 0.45, 0, 1)
    ref.current.intensity = LIGHT_SCALE.practicals * 0.95 * fade
  })
  return <pointLight ref={ref} color="#cfd8dc" intensity={LIGHT_SCALE.practicals * 0.95} distance={7.5} decay={2} />
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
  const drawerMat = useMemo(() => standardMat({ kind: 'wood', tint: '#20160c', scale: 0.7, wear: 0.4, roughness: 0.7 }), [])
  const frontMat = useMemo(() => standardMat({ kind: 'wood', tint: '#2a1d10', scale: 0.55, wear: 0.35, roughness: 0.55 }), [])
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
          <Bevel pos={[0, 0.34, 0.02]} w={0.4} h={0.14} d={0.34} radius={0.008} mat={drawerMat} />
          {/* drawer front */}
          <Bevel pos={[0, 0.34, 0.19]} w={0.42} h={0.16} d={0.04} radius={0.012} mat={frontMat} />
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

/* -------------------------------------------------------- furniture + set */

// Dresser: replaces the generic flat-color Table prop with beveled,
// wood-grained carcass + two drawer fronts, same footprint the old Table
// call and the collider list both already assume ([-1.55,0,-0.4] rot 0.1).
function Dresser() {
  const bodyMat = useMemo(() => standardMat({ kind: 'wood', tint: '#241a0f', scale: 0.6, wear: 0.45, roughness: 0.6 }), [])
  const frontMat = useMemo(() => standardMat({ kind: 'wood', tint: '#2e2013', scale: 0.5, wear: 0.3, roughness: 0.45, seed: 77 }), [])
  const topMat = useMemo(() => standardMat({ kind: 'wood', tint: '#1c130b', scale: 0.9, wear: 0.55, roughness: 0.5, seed: 78 }), [])
  return (
    <group position={[-1.55, 0, -0.4]} rotation={[0, 0.1, 0]}>
      <Bevel pos={[0, 0.26, 0]} w={0.6} h={0.5} d={0.44} radius={0.014} mat={bodyMat} castShadow receiveShadow />
      <Bevel pos={[0, 0.51, 0]} w={0.64} h={0.03} d={0.47} radius={0.006} mat={topMat} receiveShadow />
      {[0.14, -0.14].map((y, i) => (
        <Bevel key={i} pos={[0, 0.32 + y, 0.225]} w={0.5} h={0.17} d={0.02} radius={0.01} mat={frontMat} />
      ))}
      {[0.14, -0.14].map((y, i) => (
        <mesh key={'pull' + i} position={[0, 0.32 + y, 0.24]}>
          <boxGeometry args={[0.1, 0.016, 0.016]} />
          <meshStandardMaterial color="#0e0a06" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

// Nightstand carcass: the plain footprint the old flat-color Table prop used
// to fill ([1.4,0,1.35] rot -0.15, w0.5 d0.4 h0.5) — NightstandDrawer only
// renders the drawer/pull/notepad, sitting inside/on this body.
function NightstandBody() {
  const bodyMat = useMemo(() => standardMat({ kind: 'wood', tint: '#26190d', scale: 0.65, wear: 0.4, roughness: 0.6, seed: 55 }), [])
  const topMat = useMemo(() => standardMat({ kind: 'wood', tint: '#1a1109', scale: 0.9, wear: 0.5, roughness: 0.45, seed: 56 }), [])
  return (
    <group position={[1.4, 0, 1.35]} rotation={[0, -0.15, 0]}>
      <Bevel pos={[0, 0.23, 0]} w={0.46} h={0.44} d={0.36} radius={0.012} mat={bodyMat} castShadow receiveShadow />
      <Bevel pos={[0, 0.465, 0]} w={0.5} h={0.03} d={0.4} radius={0.006} mat={topMat} receiveShadow />
    </group>
  )
}

// Duvet fold: a second slab riding just above the mattress, its far edge
// pulled down into a soft crease — the polish spec's own suggested device
// ("a second displaced slab with a soft edge") rather than fighting props.jsx's
// shared Bed (used by a dozen other rooms) for a bespoke silhouette. Lives in
// the same local frame the Bed call below uses, so the same pos/rot keeps
// them welded together.
function DuvetFold() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1.2, 1.5, 10, 14)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const vy = p.getY(i) // -0.75..0.75 local (becomes world Z after rotation below)
      const vx = p.getX(i)
      const foldT = clamp((vy + 0.75) / 1.5, 0, 1) // 0 at foot, 1 at head
      // the duvet sags off the mattress edge near the foot and settles into
      // a soft ridge along the middle third — not a flat plane, not a
      // random crumple.
      const ridge = Math.sin(vx * 2.4) * 0.012 * foldT
      const foot = (1 - foldT) * -0.05 * Math.max(0, 1 - Math.abs(vx) * 1.2)
      p.setZ(i, ridge + foot)
    }
    g.computeVertexNormals()
    return g
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  const mat = useMemo(() => standardMat({ kind: 'fabric', tint: '#a89880', scale: 1.4, wear: 0.35, roughness: 1 }), [])
  return (
    <mesh geometry={geo} position={[0, 0.505, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
      <primitive object={mat} attach="material" />
    </mesh>
  )
}

// Bathroom nook: tile floor patch + backsplash behind the sink counter,
// standing in for the film's tattoo-mirror bathroom tile.
function BathroomTile() {
  const floorMat = useMemo(() => standardMat({ kind: 'tile', tint: '#9aa4a6', scale: 1.3, wear: 0.4, repeat: [1, 1] }), [])
  const backMat = useMemo(() => standardMat({ kind: 'tile', tint: '#8d979a', scale: 1.6, wear: 0.3, repeat: [1, 1], seed: 900 }), [])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.55, 0.002, -0.75]}>
        <planeGeometry args={[1.3, 0.9]} />
        <primitive object={floorMat} attach="material" />
      </mesh>
      <mesh position={[1.55, 1.0, -0.99]}>
        <planeGeometry args={[1.15, 0.35]} />
        <primitive object={backMat} attach="material" />
      </mesh>
    </group>
  )
}

// Environmental-storytelling clutter, authored to the film's world per the
// polish spec (never random confetti, never film-branded props): a motel
// ashtray, an instant-camera-shaped object, strewn note papers, a pen, a
// tumbler.
function Ashtray({ pos }) {
  const mat = useMemo(() => standardMat({ kind: 'metal', tint: '#38342c', scale: 0.6, wear: 0.5, metalness: 0.5 }), [])
  return (
    <group position={V3AsArray(pos)}>
      <mesh position={[0, 0.012, 0]}>
        <cylinderGeometry args={[0.05, 0.045, 0.022, 16]} />
        <primitive object={mat} attach="material" />
      </mesh>
      <mesh position={[0, 0.024, 0]}>
        <torusGeometry args={[0.04, 0.006, 8, 20]} />
        <primitive object={mat} attach="material" />
      </mesh>
      {/* two spent butts, tiny crumpled cylinders */}
      {[[0.012, 0.01], [-0.016, -0.005]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.03, z]} rotation={[0, i, Math.PI / 2.1]}>
          <cylinderGeometry args={[0.003, 0.003, 0.03, 6]} />
          <meshStandardMaterial color="#e8e0d0" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function InstantCameraProp({ pos, rot }) {
  const bodyMat = useMemo(() => standardMat({ kind: 'plaster', tint: '#2a2c2e', scale: 0.5, wear: 0.2, roughness: 0.55 }), [])
  return (
    <group position={V3AsArray(pos)} rotation={V3AsArray(rot)}>
      <Bevel pos={[0, 0.035, 0]} w={0.14} h={0.09} d={0.11} radius={0.012} mat={bodyMat} />
      <mesh position={[0, 0.045, 0.058]}>
        <cylinderGeometry args={[0.028, 0.032, 0.03, 20]} />
        <meshStandardMaterial color="#111214" roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[0.045, 0.075, 0.05]}>
        <boxGeometry args={[0.03, 0.018, 0.02]} />
        <meshStandardMaterial color="#e8e4dc" roughness={0.6} />
      </mesh>
    </group>
  )
}

function Pen({ pos, rot }) {
  return (
    <mesh position={V3AsArray(pos)} rotation={rot ? V3AsArray(rot) : [0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.004, 0.0045, 0.14, 8]} />
      <meshStandardMaterial color="#1a3a2a" roughness={0.4} metalness={0.2} />
    </mesh>
  )
}

const V3AsArray = (v) => (Array.isArray(v) ? v : [0, 0, 0])

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
  const warmthRef = useRef(1)

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
    warmthRef.current = t
    setGradeOverride({
      sat: THREE.MathUtils.lerp(-1, grade.sat ?? 0.05, t),
      // warm ceiling retuned down (was grade.contrast ?? 0, i.e. flat) — the
      // corridor look-back punch list fix pairs a LOWER contrast ceiling
      // with a capped bloom below so the warm end never has two different
      // paths pushing toward clipping at once.
      contrast: THREE.MathUtils.lerp(0.16, Math.min(grade.contrast ?? 0, 0.08), t),
      hue: 0,
      // config.grade.bg has no override for this slug, so it falls back to
      // the film's own card-front palette — Memento's is white, right for a
      // Polaroid, very wrong for a 3D scene background peeking through the
      // corridor's far end. Corrected here instead of in configs.js (that
      // file is mid-edit elsewhere this session; this keeps the fix scoped
      // to this room).
      bg: t > 0.5 ? '#241c14' : '#0c0a08',
      // per-side grade triplet (Wave P1): corridor reads slightly grainier
      // and darker-vignetted (colder, more clinical); the warm room end
      // gets a touch more grain (film-warm, not clean digital) but LESS
      // bloom — bloomIntensity is the other half of the corridor-blowout
      // fix, since Bloom sits on TOP of whatever the raw lights already put
      // out and was amplifying the CorridorGlow/key overlap right at the
      // doorway.
      grain: THREE.MathUtils.lerp(0.09, 0.055, t),
      vignette: THREE.MathUtils.lerp(0.82, 0.68, t),
      bloomIntensity: THREE.MathUtils.lerp(0.26, 0.2, t),
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

  // Layered lighting per the P0 doctrine: the room lamp is the KEY (the
  // room's one motivated warm source, and the one light in this room that
  // earns a shadow map — spec's "ONE 512 shadow light max"), a cool bounce
  // off the far wall stands in for hallway/window spill, and ColdFlicker
  // (below, still its own animated component — the toolkit has no flicker
  // primitive) is the bathroom's practical.
  const roomLights = useMemo(() => ({
    key: {
      pos: [0, 2.15, 0.6], color: grade.key || '#c98a4a',
      intensity: grade.keyIntensity ?? 2.6, distance: 13, decay: 2,
      castShadow: true, shadowMapSize: 512, shadowBias: -0.002,
    },
    bounce: [
      { pos: [0, 1.2, 1.8], color: grade.fill || '#3a5560', intensity: 1.9, distance: 12, decay: 2 },
      { pos: [-1.9, 0.9, 0.4], color: '#8a6a44', intensity: 1.1, distance: 5.5, decay: 2 },
    ],
  }), [grade.key, grade.keyIntensity, grade.fill])

  return (
    <group>
      <fogExp2 attach="fog" args={['#0c0a08', 0.028]} />
      <ambientLight intensity={0.09} color="#3a2c1e" />
      <LightRig lights={roomLights} />

      <RoomShell grade={grade} />
      <CorridorGlow warmthRef={warmthRef} />

      <Bed pos={[-1.35, 0, 1.15]} rot={[0, 0.14, 0]} />
      <DuvetFold />
      <Dresser />
      {/* NOTE: paperScatter's own per-instance rotation already flattens the
          quads onto the local XZ plane — passing an extra outer rot here
          (the pattern several other rooms/configs.js entries copy) double-
          rotates both the tilt AND the x/z scatter axes, standing the
          "scattered papers" up on edge instead of laying them flat. Fixed
          locally for this call only (props.jsx is shared by a dozen other
          rooms — out of scope for this room's own polish pass). */}
      <PaperScatter pos={[-1.5, 0.51, -0.4]} count={10} area={[0.5, 0.4]} color="#e6dcc0" />
      <NightstandBody />
      <NightstandDrawer film={film} />

      {/* clutter: motel ashtray + strewn notes on the dresser top, a pen and
          tumbler with the meta notepad on the nightstand, the instant-camera
          shape propped beside it — environmental storytelling, never film
          dialogue/props-with-logos. */}
      <Ashtray pos={[-1.7, 0.53, -0.55]} />
      <InstantCameraProp pos={[-1.38, 0.53, -0.32]} rot={[0, 0.4, 0]} />
      <CrumpledPaper pos={[-1.75, 0.53, -0.3]} rot={[0.3, 0.6, 0]} radius={0.045} color="#e6dcc0" seed={11} />
      <CrumpledPaper pos={[-1.62, 0.01, -0.6]} rot={[0, 1.1, 0]} radius={0.04} color="#e2d8bc" seed={12} />
      <Pen pos={[1.62, 0.51, 1.28]} />
      <Cup pos={[1.22, 0.51, 1.42]} color="#c9d0d2" h={0.09} r1={0.028} r2={0.024} />

      {/* bathroom nook */}
      <BathroomTile />
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
