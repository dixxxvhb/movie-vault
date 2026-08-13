import React, { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import Room, { ROOM, WALLS } from './Room.jsx'
import CameraRig, { STATIONS } from './CameraRig.jsx'
import { wasDrag } from './pointer.js'
import Polaroid, { CARD_W, CARD_H } from './Polaroid.jsx'
import CaseFile from './CaseFile.jsx'
import Strings from './Strings.jsx'
import { QueueWall, LessonsWall } from './Notes.jsx'
import ScoreMarks from './ScoreMarks.jsx'
import Archive from './Archive.jsx'
import { WallQuotes } from './Quotes.jsx'
import ColdOpen from './ColdOpen.jsx'
import { startRoomTone, stopRoomTone } from './roomTone.js'

const HD = ROOM.D / 2
const HW = ROOM.W / 2

// deterministic tiny hash -> pinned-photo jitter, stable per slug
function jitter(slug) {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) & 0xffff
  return {
    rot: ((h % 7) - 3) * 0.016,
    dy: (((h >> 3) % 5) - 2) * 0.006,
  }
}

// HEIGHT IS THE SCORE.
//
// The hang used to be a rank-ordered grid: sorted list, eight per row. That
// encodes ordinal position, not feeling — a 9.9 and a 9.5 sat side by side in
// the same row, and the distance from the best film to the worst read as "four
// rows down". You could not look at the wall and know anything.
//
// Now y maps linearly to the score itself. Same score, same height. The gap
// between two Polaroids IS the gap in how he felt about them, and the shape the
// cards make is the true shape of his taste: a crowd up in the nines, a thin
// tail, and two films alone down by the baseboard.
// The axis used to be hard-floored at 5.0, which silently CLAMPED anything
// below it — two films at 4.8 and 3.1 would have hung at exactly the same
// height and the wall would have lied. The floor now drops to whatever the real
// minimum is, and only ever drops: with today's data (min 5.2) the wall is
// pixel-identical to before, and the first sub-5 score rescales it honestly
// instead of piling up on the baseboard.
const SCORE_FLOOR_DEFAULT = 5.0
const SCORE_MAX = 10.0
const Y_FLOOR = 0.66          // lowest score hangs here
const Y_CEIL = 2.22           // a perfect 10 hangs here
const WALL_Z = -HD + 0.014
// the inspected card floats off the wall; aim a little in front of the paper
const LIFT_LOOK = 0.02

const X_STEP = CARD_W + 0.012  // horizontal pitch when cards must sit side by side
const Y_CLEAR = CARD_H * 0.86  // closer than this vertically and they collide

export function makeScoreToY(films) {
  const min = films?.length
    ? Math.min(SCORE_FLOOR_DEFAULT, ...films.map((f) => f.score))
    : SCORE_FLOOR_DEFAULT
  return (score) => {
    const t = (THREE.MathUtils.clamp(score, min, SCORE_MAX) - min) / (SCORE_MAX - min)
    return Y_FLOOR + t * (Y_CEIL - Y_FLOOR)
  }
}

// Cards that share a height would stack on top of each other, so they spread
// sideways from the centre — a beeswarm. Nothing is moved vertically to make
// room, because moving a card vertically would be lying about its score.
function layout(films, scoreToY) {
  const placed = []
  for (const film of [...films].sort((a, b) => b.score - a.score)) {
    const y = scoreToY(film.score)
    let x = 0
    for (let k = 0; k < 40; k++) {
      // 0, +1, -1, +2, -2 … keeps each cluster centred on the wall
      const step = Math.ceil(k / 2) * (k % 2 === 0 ? -1 : 1)
      x = step * X_STEP
      const clash = placed.some(
        (p) => Math.abs(p.position[1] - y) < Y_CLEAR &&
               Math.abs(p.position[0] - x) < X_STEP * 0.98
      )
      if (!clash) break
    }
    const j = jitter(film.slug)
    placed.push({
      film,
      // jitter x only — y is data, and must stay honest
      position: [x + j.dy * 0.6, y, WALL_Z],
      rotation: j.rot,
    })
  }
  return placed
}

// Invisible click targets so looking at a wall and clicking takes you to it.
function WallZone({ wall, onGo }) {
  const w = WALLS[wall]
  return (
    <mesh
      position={w.pos}
      rotation={w.rot}
      onClick={(e) => { e.stopPropagation(); if (!wasDrag()) onGo(wall) }}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = 'auto' }}
    >
      <planeGeometry args={w.size} />
      <meshBasicMaterial visible={false} />
    </mesh>
  )
}

const WALL_STATION = { north: 'ledger', east: 'investigation', south: 'door', west: 'mirror' }

export default function App() {
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState(null)   // slug being inspected
  const [station, setStation] = useState('center')
  const [hover, setHover] = useState(null)
  // the archive containers: null, 'shoebox' or 'drawer'. Only ever one open —
  // you are crouched over one box at a time.
  const [openBox, setOpenBox] = useState(null)
  const [picked, setPicked] = useState(null)     // archive print held up
  const [tone, setTone] = useState(false)

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'vault-data.json')
      .then((r) => r.json())
      .then((d) => { setData(d); const b = document.getElementById('boot'); if (b) b.style.display = 'none' })
      .catch((e) => console.error('vault-data load failed', e))
  }, [])

  useEffect(() => {
    const k = (e) => {
      if (e.key !== 'Escape') return
      // Esc steps back one layer at a time rather than teleporting you to the
      // middle of the room from inside a shoebox.
      if (picked) return setPicked(null)
      if (openBox) { setOpenBox(null); return setStation('center') }
      setSelected(null)
      setStation('center')
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [picked, openBox])

  const scoreToY = useMemo(() => makeScoreToY(data?.films), [data])
  const placed = useMemo(() => (data ? layout(data.films, scoreToY) : []), [data, scoreToY])

  // one open box at a time, and opening one takes you to it
  const goBox = (which) => {
    setSelected(null)
    setPicked(null)
    const next = openBox === which ? null : which
    setOpenBox(next)
    setStation(next || 'center')
  }

  // quotes: ledger ones tape to the wall, archive ones ride along with their
  // print, and the orphans go loose in the drawer
  const quotesBySlug = useMemo(() => {
    const out = {}
    for (const q of data?.quotes || []) {
      if (q.where !== 'archive' || !q.slug) continue
      ;(out[q.slug] ||= []).push(q)
    }
    return out
  }, [data])
  const ledgerQuotes = useMemo(
    () => (data?.quotes || []).filter((q) => q.where === 'ledger'),
    [data]
  )
  const looseQuotes = useMemo(
    () => (data?.quotes || []).filter((q) => q.where === 'loose'),
    [data]
  )
  const pickedFilm = useMemo(() => {
    if (!picked) return null
    return [...(data?.shoebox || []), ...(data?.drawer || [])]
      .find((a) => a.slug === picked) || null
  }, [picked, data])
  const byPlace = useMemo(
    () => Object.fromEntries(placed.map((p) => [p.film.slug, p])),
    [placed]
  )
  const openFilm = selected ? byPlace[selected]?.film : null

  // string is strung between pins, which sit at the top of each card
  const pinPoints = useMemo(
    () => Object.fromEntries(placed.map((p) => [p.film.slug, p.position])),
    [placed]
  )
  const thread = station === 'investigation'

  // An inspected card gets its own viewpoint, derived from where it hangs:
  // stand a metre off the wall, card pushed left of centre so the case file
  // has the right side of the screen without covering it.
  const view = useMemo(() => {
    if (!selected) return { station, key: station }
    const p = byPlace[selected]
    if (!p) return { station, key: station }
    const [x, y, z] = p.position
    return {
      key: 'card:' + selected,
      station: {
        pos: [x + 0.42, THREE.MathUtils.clamp(y, 1.15, 2.0), z + 1.45],
        look: [x, y + LIFT_LOOK, z],
        fov: 44,
        yawRange: 0.18,
      },
    }
  }, [selected, station, byPlace])

  return (
    <>
      <Canvas
        shadows={false}
        dpr={[1, 2]}
        camera={{ position: STATIONS.center.pos, fov: STATIONS.center.fov, near: 0.05, far: 60 }}
        gl={{ antialias: true }}
        onPointerMissed={() => setSelected(null)}
      >
        <color attach="background" args={['#05040a']} />

        <Room
          dim={thread}
          drawerOpen={openBox === 'drawer'}
          onDrawer={() => goBox('drawer')}
        />
        <CameraRig station={view.station} stationKey={view.key} />

        {Object.keys(WALLS).map((w) => (
          <WallZone
            key={w}
            wall={w}
            onGo={(k) => { setSelected(null); setStation(WALL_STATION[k]) }}
          />
        ))}

        <ScoreMarks scoreToY={scoreToY} avg={data?.avg} z={WALL_Z - 0.004} />

        {placed.map((p) => (
          <Polaroid
            key={p.film.slug}
            film={p.film}
            position={p.position}
            rotation={p.rotation}
            inspected={selected === p.film.slug}
            onSelect={(f) => setSelected(f.slug)}
            onHover={setHover}
          />
        ))}

        {/* the door wall: what's next. Offset left so the slips don't hang
            across the actual door, which sits at x = 0.95 */}
        {data?.queue?.length > 0 && (
          <QueueWall queue={data.queue} origin={[-0.62, 0, HD - 0.016]} rotation={[0, Math.PI, 0]} />
        )}

        {/* the mirror wall: what he likes. Pushed off the window at z = 0.75 */}
        {data?.lessons?.length > 0 && (
          <LessonsWall lessons={data.lessons} origin={[-HW + 0.016, 0, -0.45]} rotation={[0, Math.PI / 2, 0]} />
        )}

        {/* the archive: everything he has watched but never scored live */}
        <Archive
          shoebox={data?.shoebox || []}
          drawer={data?.drawer || []}
          quotesBySlug={quotesBySlug}
          looseQuotes={looseQuotes}
          open={openBox}
          picked={picked}
          onOpen={goBox}
          onPick={setPicked}
        />

        {/* lines he wrote down, taped under the film that said them */}
        {ledgerQuotes.length > 0 && (
          <WallQuotes quotes={ledgerQuotes} positions={pinPoints} cardH={CARD_H} />
        )}

        {thread && (
          <Strings
            links={data?.links || []}
            positions={pinPoints}
            focus={selected || hover}
          />
        )}

        <EffectComposer>
          <Bloom intensity={0.42} luminanceThreshold={0.72} luminanceSmoothing={0.35} mipmapBlur />
          {/* barely there. At 0.0006 the fringing read as a rendering fault on
              every card edge rather than as lens character. */}
          <ChromaticAberration offset={[0.00022, 0.0003]} blendFunction={BlendFunction.NORMAL} />
          <Noise opacity={0.05} blendFunction={BlendFunction.OVERLAY} />
          <Vignette eskil={false} offset={0.24} darkness={0.92} />
        </EffectComposer>
      </Canvas>

      {/* HUD */}
      <div style={hud.brand}>
        <div style={hud.title}>The Vault</div>
        {data && <div style={hud.sub}>{data.count} films · avg {data.avg} · scored live</div>}
      </div>

      <div style={hud.nav}>
        {[
          ['center', 'stand'],
          ['ledger', 'the ledger'],
          ['investigation', 'investigation'],
          ['door', 'the door'],
          ['mirror', 'the mirror'],
          ['shoebox', 'the shoebox'],
          ['drawer', 'the drawer'],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => {
              if (k === 'shoebox' || k === 'drawer') return goBox(k)
              setOpenBox(null)
              setPicked(null)
              setStation(k)
            }}
            style={{ ...hud.navBtn, ...(station === k ? hud.navOn : null) }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => { tone ? stopRoomTone() : startRoomTone(); setTone(!tone) }}
          style={{ ...hud.navBtn, ...(tone ? hud.navOn : null) }}
          title="air handler, two floors down"
        >
          {tone ? 'room tone ·on' : 'room tone'}
        </button>
      </div>

      <div style={hud.hint}>
        {openBox
          ? 'click a print to hold it up · esc to put the box away'
          : 'drag to look · click a wall to approach · esc to stand back'}
      </div>

      {/* What a print says when you hold it up. Deliberately thin next to a
          case file — there is no hot take here, because he never wrote one. */}
      {pickedFilm && (
        <div style={hud.print}>
          <div style={hud.printTitle}>
            {pickedFilm.title}{pickedFilm.year ? ` (${pickedFilm.year})` : ''}
          </div>
          <div style={hud.printScore}>
            {pickedFilm.memory != null
              ? `${pickedFilm.memory.toFixed(1)} from memory`
              : 'never scored'}
          </div>
          <div style={hud.printMeta}>
            {[
              pickedFilm.director?.join(', '),
              pickedFilm.runtime ? `${pickedFilm.runtime} min` : null,
              pickedFilm.genres?.join(' · '),
            ].filter(Boolean).map((line, i) => <div key={i}>{line}</div>)}
          </div>
          <div style={hud.printNote}>{pickedFilm.note}</div>
        </div>
      )}

      <ColdOpen />

      {openFilm && (
        <CaseFile
          film={openFilm}
          links={data?.links || []}
          onClose={() => setSelected(null)}
          onJump={(slug) => setSelected(slug)}
        />
      )}
    </>
  )
}

const hud = {
  brand: { position: 'fixed', top: 16, left: 20, color: '#efe7d6', pointerEvents: 'none', fontFamily: 'Georgia, serif', textShadow: '0 2px 12px rgba(0,0,0,.8)' },
  title: { fontSize: 26, fontStyle: 'italic', letterSpacing: '.01em' },
  sub: { fontSize: 12.5, color: '#b9ae98', marginTop: 2, fontFamily: 'system-ui, sans-serif' },
  nav: { position: 'fixed', bottom: 18, left: 20, display: 'flex', gap: 8, flexWrap: 'wrap' },
  navBtn: {
    background: 'rgba(14,10,8,.62)', color: '#a99c85', border: '1px solid rgba(180,160,120,.22)',
    padding: '7px 12px', borderRadius: 2, fontSize: 11.5, letterSpacing: '.14em',
    textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
    backdropFilter: 'blur(3px)',
  },
  navOn: { color: '#f2e4c8', border: '1px solid rgba(255,190,120,.55)', background: 'rgba(50,32,16,.72)' },
  hint: { position: 'fixed', bottom: 18, right: 20, color: '#7d735f', fontSize: 12.5, fontFamily: 'system-ui, sans-serif', pointerEvents: 'none' },
  print: {
    position: 'fixed', top: 96, right: 22, width: 276, padding: '16px 18px 18px',
    background: 'rgba(12,9,7,.82)', border: '1px solid rgba(180,160,120,.22)',
    color: '#cdc2ab', fontFamily: 'system-ui, sans-serif', pointerEvents: 'none',
    backdropFilter: 'blur(4px)', borderRadius: 2,
  },
  printTitle: { fontFamily: 'Georgia, serif', fontSize: 19, color: '#f0e6d2', lineHeight: 1.25 },
  // pencil, not ink — the same tell the print itself carries
  printScore: { marginTop: 7, fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', color: '#9a927f' },
  printMeta: { marginTop: 12, fontSize: 12.5, lineHeight: 1.65, color: '#8d8472' },
  printNote: { marginTop: 12, fontSize: 12.5, lineHeight: 1.55, color: '#6f6857', fontStyle: 'italic' },
}
