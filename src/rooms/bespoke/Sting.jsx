import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { counter as Counter, barShelf as BarShelf } from '../props.jsx'
import { makeMetaTexture, makeScoreTexture } from '../infoTextures.js'
import { sheetOf } from '../../palette.js'
import { useRoomAudio } from '../audio/engine.js'
import { start as startStingAudio } from '../audio/recipes/the-sting.js'
import {
  makeWoodTexture, makeLumberTexture, makeChalkboardTexture,
  makeHotTakeBrushTexture, makeFbiSignTexture,
} from './stingTextures.js'

// 9.6 — "the wire room builds itself." The betting parlor assembles on
// entry (flats/scaffold/backdrop flying in over ~6s, staggered per wall,
// then locking warm); every flat has a raw lumber back (walk around the back
// wall and the finish disappears, replaced by bare studs + a stage weight);
// the FBI office through the doorway never finishes at all (permanently
// primer-grey wireframe); one wall — the left one — periodically strikes
// itself and rebuilds on a long cycle; and the hot take is painted, in big
// brush strokes, on the back of the largest flat (the back wall), found
// only by walking behind it. Three stations (click-to-advance, no free
// walk, same doctrine as every other room): FRONT (the parlor as staged),
// BEHIND (the back wall's raw side), FBI (the doorway threshold).
const ROOM_W = 4.6
const ROOM_D = 4.6
const ROOM_H = 2.7
const BACK_Z = -ROOM_D / 2
const FRONT_Z = ROOM_D / 2
const LEFT_X = -ROOM_W / 2
const RIGHT_X = ROOM_W / 2

const DOOR_W = 1.0
const DOOR_H = 2.1
const DOOR_Z = 0      // FBI doorway's center, cut into the right wall — kept
                       // at the wall's own midpoint so RightWall's symmetric
                       // panel split (below) lines up with it without also
                       // having to offset the wall's own group position

const FBI_DEPTH = 2.0
const FBI_W = 2.2
const FBI_H = 2.2

const BUILD_DUR = 6          // seconds, per the spec
const REBUILD_PERIOD = 68    // one wall's own long cycle
const REBUILD_WINDOW = 9     // seconds of that cycle spent dipped/rebuilding

const FLY_DIST = 2.3

const STATIONS = {
  front: { pos: [0, 1.5, 2.2], look: [0, 1.3, -1.6], fov: 50 },
  behind: { pos: [0, 1.6, BACK_Z - 1.9], look: [0, 1.3, BACK_Z + 0.5], fov: 55 },
  // kept OUTSIDE the office's own box (RIGHT_X to RIGHT_X+FBI_W) — this is a
  // closer look through the doorway, not a stand-inside-the-desk shot, which
  // is what the office's own primer-grey unfinished-ness actually wants to
  // read as (viewed from a threshold, the way you'd actually find it)
  fbi: { pos: [RIGHT_X - 0.5, 1.5, DOOR_Z + 0.7], look: [RIGHT_X + 1.3, 1.05, DOOR_Z - 0.15], fov: 52 },
}

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
const clamp01 = (v) => Math.max(0, Math.min(1, v))

/* ------------------------------------------------------------ build math */

// Every flat shares this shape: rises up from below over BUILD_DUR seconds
// (staggered per wall by `delay`), locks, and — for the one wall that keeps
// cycling — periodically dips back down and rises again on its own long
// clock, well after the initial assembly has settled.
function buildOffset(elapsed, delay, cycles) {
  const t = clamp01((elapsed - delay) / BUILD_DUR)
  let drop = 1 - easeOutCubic(t)
  if (cycles && elapsed > delay + BUILD_DUR + 4) {
    const cyclePos = (elapsed - (delay + BUILD_DUR + 4)) % REBUILD_PERIOD
    if (cyclePos > REBUILD_PERIOD - REBUILD_WINDOW) {
      const local = (cyclePos - (REBUILD_PERIOD - REBUILD_WINDOW)) / REBUILD_WINDOW
      // out for the first half of the window, back for the second
      const dipT = local < 0.5 ? local * 2 : (1 - local) * 2
      drop = Math.max(drop, dipT)
    }
  }
  return drop
}

function useMountElapsed() {
  const t0 = useRef(null)
  const ref = useRef(0)
  useFrame(({ clock }) => {
    if (t0.current === null) t0.current = clock.elapsedTime
    ref.current = clock.elapsedTime - t0.current
  })
  return ref
}

/* ------------------------------------------------------------------ flat */

// A wall's raw back: exposed studs (a simple rectangular frame + one cross
// brace) and a stage weight — a squat dark box — sitting at its foot. Real
// geometry, not a texture, so it reads correctly from any angle once you're
// behind the painted face that was hiding it.
function LumberFrame({ w, h, tex }) {
  const t = 0.05
  return (
    <group>
      {[-w / 2 + t / 2, w / 2 - t / 2].map((x, i) => (
        <mesh key={'v' + i} position={[x, h / 2, 0]}>
          <boxGeometry args={[t, h, t]} />
          <meshStandardMaterial map={tex} roughness={0.9} />
        </mesh>
      ))}
      {[t / 2, h / 2, h - t / 2].map((y, i) => (
        <mesh key={'h' + i} position={[0, y, 0]}>
          <boxGeometry args={[w - t, t, t]} />
          <meshStandardMaterial map={tex} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, h / 2, 0]} rotation={[0, 0, Math.atan2(h, w)]}>
        <boxGeometry args={[Math.hypot(w, h) * 0.94, t * 0.8, t * 0.8]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
      {/* the stage weight, a squat sandbag stand-in */}
      <mesh position={[w / 2 - 0.3, 0.14, 0.1]}>
        <boxGeometry args={[0.34, 0.28, 0.34]} />
        <meshStandardMaterial color="#2a2620" roughness={0.95} />
      </mesh>
    </group>
  )
}

// The parlor's back wall — the largest flat. Front face: wood panelling
// behind the counter/rail/chalkboard. Back face (visible only from the
// BEHIND station, since the painted plane occludes it from the front): bare
// studs, a stage weight, and the hot take painted across the raw wood.
function BackWall({ elapsedRef, film }) {
  const group = useRef()
  const woodTex = useMemo(() => makeWoodTexture('#4a3018'), [])
  const lumberTex = useMemo(() => makeLumberTexture(), [])
  const [hotTakeTex, setHotTakeTex] = useState(null)

  useEffect(() => {
    let live = true
    const t = makeHotTakeBrushTexture(film)
    if (live) setHotTakeTex(t)
    return () => { live = false; t.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug])

  useFrame(() => {
    if (!group.current) return
    const drop = buildOffset(elapsedRef.current, 0, false)
    group.current.position.y = -drop * FLY_DIST
  })

  return (
    <group ref={group} position={[0, 0, BACK_Z]}>
      {/* front face — normal points +Z, into the room */}
      <mesh position={[0, ROOM_H / 2, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial map={woodTex} roughness={0.85} />
      </mesh>
      {/* raw back, clear of the painted face so front-station occlusion
          hides it entirely until you've actually gone around */}
      <group position={[0, 0, -0.14]} rotation={[0, Math.PI, 0]}>
        <LumberFrame w={ROOM_W * 0.94} h={ROOM_H * 0.94} tex={lumberTex} />
        {/* the hot take itself, well clear of the studs behind it so no
            depth-clipping can eat a word (the known bug class) */}
        <mesh position={[0, ROOM_H / 2, 0.16]}>
          <planeGeometry args={[ROOM_W * 0.82, ROOM_H * 0.7]} />
          {hotTakeTex
            ? <meshBasicMaterial key="mapped" map={hotTakeTex} toneMapped={false} side={THREE.DoubleSide} />
            : <meshBasicMaterial key="blank" color="#c8b088" toneMapped={false} />}
        </mesh>
      </group>
    </group>
  )
}

// Left wall — the one that un-builds and rebuilds on its own long cycle.
// Plain panelling, no furniture riding along with it (so the cycle reads as
// "one wall" rather than "half the room vanishing").
function LeftWall({ elapsedRef }) {
  const group = useRef()
  const woodTex = useMemo(() => makeWoodTexture('#3a2814'), [])
  const lumberTex = useMemo(() => makeLumberTexture(), [])

  useFrame(() => {
    if (!group.current) return
    const drop = buildOffset(elapsedRef.current, 0.8, true)
    group.current.position.y = -drop * FLY_DIST
  })

  return (
    <group ref={group} position={[LEFT_X, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, ROOM_H / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial map={woodTex} roughness={0.85} />
      </mesh>
      <group position={[0, 0, -0.14]} rotation={[0, Math.PI, 0]}>
        <LumberFrame w={ROOM_D * 0.94} h={ROOM_H * 0.94} tex={lumberTex} />
      </group>
    </group>
  )
}

function FrontWall({ elapsedRef }) {
  const group = useRef()
  const woodTex = useMemo(() => makeWoodTexture('#4a3018'), [])
  useFrame(() => {
    if (!group.current) return
    const drop = buildOffset(elapsedRef.current, 1.6, false)
    group.current.position.y = -drop * FLY_DIST
  })
  return (
    <group ref={group} position={[0, 0, FRONT_Z]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, ROOM_H / 2, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial map={woodTex} roughness={0.9} />
      </mesh>
    </group>
  )
}

// Right wall, split around the FBI doorway — same two-panel construction as
// Memento's door wall.
function RightWall({ elapsedRef }) {
  const group = useRef()
  const woodTex = useMemo(() => makeWoodTexture('#4a3018'), [])
  const panelD = (ROOM_D - DOOR_W) / 2

  useFrame(() => {
    if (!group.current) return
    const drop = buildOffset(elapsedRef.current, 0.4, false)
    group.current.position.y = -drop * FLY_DIST
  })

  return (
    <group ref={group} position={[RIGHT_X, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh position={[-(panelD / 2 + DOOR_W / 2), ROOM_H / 2, 0]}>
        <planeGeometry args={[panelD, ROOM_H]} />
        <meshStandardMaterial map={woodTex} roughness={0.85} />
      </mesh>
      <mesh position={[panelD / 2 + DOOR_W / 2, ROOM_H / 2, 0]}>
        <planeGeometry args={[panelD, ROOM_H]} />
        <meshStandardMaterial map={woodTex} roughness={0.85} />
      </mesh>
      <mesh position={[0, (DOOR_H + ROOM_H) / 2, 0]}>
        <planeGeometry args={[DOOR_W, ROOM_H - DOOR_H]} />
        <meshStandardMaterial map={woodTex} roughness={0.85} />
      </mesh>
    </group>
  )
}

/* -------------------------------------------------------------- FBI office */

// Permanently mid-construction: primer grey, wireframe only, because Gondorf
// knew from the start that this room never had to fool anyone up close —
// nobody legitimate. Never touches the build/rebuild cycle above; this one
// simply never finishes.
function FbiOffice() {
  const wireGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(FBI_W, FBI_H, FBI_DEPTH)), [])
  const [signTex, setSignTex] = useState(null)
  useEffect(() => {
    let live = true
    const t = makeFbiSignTexture()
    if (live) setSignTex(t)
    return () => { live = false; t.dispose() }
  }, [])
  return (
    <group position={[RIGHT_X + FBI_W / 2, 0, DOOR_Z]}>
      <lineSegments geometry={wireGeo} position={[0, FBI_H / 2, 0]}>
        <lineBasicMaterial color="#8a8a86" transparent opacity={0.65} />
      </lineSegments>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[FBI_W * 0.9, FBI_DEPTH * 0.9]} />
        <meshStandardMaterial color="#4a4a48" roughness={0.95} />
      </mesh>
      {/* the desk: a primer-grey slab, never dressed any further */}
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[1.2, 0.76, 0.6]} />
        <meshStandardMaterial color="#5a5a56" roughness={0.9} />
      </mesh>
      <mesh position={[0, FBI_H - 0.35, -FBI_DEPTH / 2 + 0.02]}>
        <planeGeometry args={[0.62, 0.27]} />
        {signTex
          ? <meshBasicMaterial key="mapped" map={signTex} toneMapped={false} />
          : <meshBasicMaterial key="blank" color="#4a4a48" toneMapped={false} />}
      </mesh>
    </group>
  )
}

// Wraps a group of freestanding furniture so it rises into place on the
// same staggered timer as the wall it belongs against — "the con is the
// architecture" reads best when the counter/rail/chalkboard arrive as part
// of the same assembly beat as the wood behind them, not a beat later.
function BuildRide({ elapsedRef, delay = 0, children }) {
  const group = useRef()
  useFrame(() => {
    if (!group.current) return
    const drop = buildOffset(elapsedRef.current, delay, false)
    group.current.position.y = -drop * FLY_DIST
  })
  return <group ref={group}>{children}</group>
}

// A thin brass rail along the counter's front edge — the one unmistakably
// "betting parlor" detail besides the odds board itself.
function BrassRail({ pos, length = 2.2 }) {
  return (
    <mesh position={pos} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.018, 0.018, length, 10]} />
      <meshStandardMaterial color="#c9a227" roughness={0.25} metalness={0.85} />
    </mesh>
  )
}

/* -------------------------------------------------------------- click hotspots */

function Hotspot({ pos, size, rot, onSelect }) {
  return (
    <mesh
      position={pos}
      rotation={rot || [0, 0, 0]}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = 'auto' }}
    >
      <planeGeometry args={size} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

/* -------------------------------------------------------------------- record */

function ParlorRecord({ film, infoVisible }) {
  const palette = sheetOf(film.palette)
  const [scoreTex, setScoreTex] = useState(null)
  const [metaTex, setMetaTex] = useState(null)

  useEffect(() => {
    let live = true
    const t = makeScoreTexture(film, palette)
    if (live) setScoreTex(t)
    return () => { live = false; t.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug])

  useEffect(() => {
    let live = true
    const t = makeMetaTexture(film, palette)
    if (live) setMetaTex(t)
    return () => { live = false; t.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug])

  if (!infoVisible) return null

  return (
    <group>
      {/* score, its own framed tile beside the chalkboard rather than
          overlapping it — pulled well clear in both x and z, per the
          BabyDriver lesson about near-coplanar depth clipping */}
      <mesh position={[0.15, 2.05, BACK_Z + 0.16]}>
        <planeGeometry args={[0.42, 0.42]} />
        {scoreTex
          ? <meshBasicMaterial key="mapped" map={scoreTex} transparent depthWrite={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" transparent opacity={0} />}
      </mesh>
      {/* meta + chips, small, on the counter top — clear of the counter's
          own edge so no coplanar clipping (BabyDriver's own QA lesson) */}
      <mesh position={[-1.4, 0.98, BACK_Z + 0.75]} rotation={[-Math.PI / 2, 0, 0.25]}>
        <planeGeometry args={[0.9, 0.22]} />
        {metaTex
          ? <meshBasicMaterial key="mapped" map={metaTex} transparent depthWrite={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" transparent opacity={0} />}
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ room */

export default function Sting({ film, config, infoVisible = true, goToStation }) {
  const { grade } = config
  const [station, setStation] = useState('front')
  const elapsedRef = useMountElapsed()

  const goto = (name) => {
    setStation(name)
    goToStation?.(STATIONS[name], name)
  }

  const chalkTex = useMemo(() => makeChalkboardTexture(), [])

  useRoomAudio(startStingAudio)

  return (
    <group>
      <fogExp2 attach="fog" args={[grade.fogColor || '#241a10', 0.03]} />
      <pointLight position={[0, 2.3, 0.4]} intensity={(grade.keyIntensity ?? 1) * 24} color={grade.key || '#c8964a'} distance={12} decay={2} />
      <pointLight position={[0, 1.3, 1.6]} intensity={8} color={grade.fill || '#3a2c1a'} distance={10} decay={2} />

      {/* shell: floor + ceiling, plain — the walls are the story here */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#2a2014" roughness={0.9} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#241a10" roughness={0.95} />
      </mesh>

      <BackWall elapsedRef={elapsedRef} film={film} />
      <LeftWall elapsedRef={elapsedRef} />
      <FrontWall elapsedRef={elapsedRef} />
      <RightWall elapsedRef={elapsedRef} />
      <FbiOffice />

      {/* the parlor's furniture, riding in with the back wall's own build —
          rendered as a sibling on the same staggered timer (delay 0, same
          as BackWall) rather than as the wall's own child, so the counter's
          own floor placement stays simple */}
      <BuildRide elapsedRef={elapsedRef} delay={0}>
        <Counter pos={[-1.4, 0, BACK_Z + 0.55]} rot={[0, 0, 0]} w={2} d={0.6} h={0.95} color="#5a3f22" />
        <BarShelf pos={[-1.4, 0, BACK_Z + 0.1]} rot={[0, 0, 0]} count={12} w={1.8} color="#3a2814" glint="#e8b060" />
        <BrassRail pos={[-1.4, 0.55, BACK_Z + 0.86]} length={2.1} />
        <mesh position={[-1.3, 2.0, BACK_Z + 0.2]} rotation={[0, 0, 0]}>
          <planeGeometry args={[1.6, 1.1]} />
          <meshBasicMaterial map={chalkTex} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </BuildRide>

      {station === 'front' && (
        <>
          <Hotspot pos={[0, 1.3, BACK_Z + 0.35]} size={[ROOM_W * 0.7, ROOM_H * 0.6]} onSelect={() => goto('behind')} />
          <Hotspot pos={[RIGHT_X - 0.02, 1.2, DOOR_Z]} rot={[0, -Math.PI / 2, 0]} size={[DOOR_W, DOOR_H]} onSelect={() => goto('fbi')} />
        </>
      )}
      {station === 'behind' && (
        <Hotspot pos={[0, 1.3, BACK_Z - 1.2]} size={[3, 2.4]} onSelect={() => goto('front')} />
      )}
      {station === 'fbi' && (
        <Hotspot pos={[RIGHT_X + 0.6, 1.2, DOOR_Z]} rot={[0, -Math.PI / 2, 0]} size={[2.6, 2.4]} onSelect={() => goto('front')} />
      )}

      <ParlorRecord film={film} infoVisible={infoVisible} />
    </group>
  )
}
