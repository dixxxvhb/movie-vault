import React, { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import Room, { ROOM, WALLS } from './Room.jsx'
import CameraRig, { STATIONS, wasDrag } from './CameraRig.jsx'
import Polaroid, { CARD_W, CARD_H } from './Polaroid.jsx'
import CaseFile from './CaseFile.jsx'
import Strings from './Strings.jsx'
import { QueueWall, LessonsWall } from './Notes.jsx'
import ScoreMarks from './ScoreMarks.jsx'

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
const SCORE_MIN = 5.0
const SCORE_MAX = 10.0
const Y_FLOOR = 0.66          // lowest score hangs here
const Y_CEIL = 2.22           // a perfect 10 hangs here
const WALL_Z = -HD + 0.014
// the inspected card floats off the wall; aim a little in front of the paper
const LIFT_LOOK = 0.02

const X_STEP = CARD_W + 0.012  // horizontal pitch when cards must sit side by side
const Y_CLEAR = CARD_H * 0.86  // closer than this vertically and they collide

export function scoreToY(score) {
  const t = (THREE.MathUtils.clamp(score, SCORE_MIN, SCORE_MAX) - SCORE_MIN) /
    (SCORE_MAX - SCORE_MIN)
  return Y_FLOOR + t * (Y_CEIL - Y_FLOOR)
}

// Cards that share a height would stack on top of each other, so they spread
// sideways from the centre — a beeswarm. Nothing is moved vertically to make
// room, because moving a card vertically would be lying about its score.
function layout(films) {
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

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'vault-data.json')
      .then((r) => r.json())
      .then((d) => { setData(d); const b = document.getElementById('boot'); if (b) b.style.display = 'none' })
      .catch((e) => console.error('vault-data load failed', e))
  }, [])

  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') { setSelected(null); setStation('center') } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  const placed = useMemo(() => (data ? layout(data.films) : []), [data])
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

        <Room dim={thread} />
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
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setStation(k)}
            style={{ ...hud.navBtn, ...(station === k ? hud.navOn : null) }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={hud.hint}>drag to look · click a wall to approach · esc to stand back</div>

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
}
