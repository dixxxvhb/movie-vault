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

// Salon hang on the north wall: the top score crowns it, then rows descend by
// rank toward the baseboard.
const MAX_PER_ROW = 9
const COL_GAP = CARD_W + 0.052
const ROW_GAP = CARD_H + 0.062
const TOP_Y = 2.16
const WALL_Z = -HD + 0.014
// the inspected card floats off the wall; aim a little in front of the paper
const LIFT_LOOK = 0.02

// Rows are computed, not hardcoded. A fixed [1,8,8,8,8] leaves a single
// stranded card the moment the ledger hits 34 films, and it will keep growing.
// Balance the remainder across rows instead so the hang always looks composed.
function rowSizes(total) {
  if (total <= 1) return [total]
  const rest = total - 1
  const rows = Math.ceil(rest / MAX_PER_ROW)
  const base = Math.floor(rest / rows)
  const extra = rest % rows
  return [1, ...Array.from({ length: rows }, (_, i) => base + (i < extra ? 1 : 0))]
}

function layout(films) {
  const placed = []
  const rows = rowSizes(films.length)
  let idx = 0
  for (let r = 0; r < rows.length && idx < films.length; r++) {
    const n = Math.min(rows[r], films.length - idx)
    const y = TOP_Y - r * ROW_GAP
    for (let c = 0; c < n; c++) {
      const film = films[idx++]
      const j = jitter(film.slug)
      const x = (c - (n - 1) / 2) * COL_GAP
      placed.push({ film, position: [x, y + j.dy, WALL_Z], rotation: j.rot })
    }
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
