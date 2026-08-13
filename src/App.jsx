import React, { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import Room, { ROOM, WALLS } from './Room.jsx'
import CameraRig, { STATIONS, wasDrag } from './CameraRig.jsx'
import Polaroid, { CARD_W, CARD_H } from './Polaroid.jsx'

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

// Salon hang on the north wall: the perfect score crowns it, then rows of eight
// descend by rank toward the baseboard.
const ROWS = [1, 8, 8, 8, 8, 8]
const COL_GAP = CARD_W + 0.052
const ROW_GAP = CARD_H + 0.062
const TOP_Y = 2.16
const WALL_Z = -HD + 0.014

function layout(films) {
  const placed = []
  let idx = 0
  for (let r = 0; r < ROWS.length && idx < films.length; r++) {
    const n = Math.min(ROWS[r], films.length - idx)
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
  const [selected, setSelected] = useState(null)
  const [station, setStation] = useState('center')

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

        <Room />
        <CameraRig station={station} />

        {Object.keys(WALLS).map((w) => (
          <WallZone key={w} wall={w} onGo={(k) => setStation(WALL_STATION[k])} />
        ))}

        {placed.map((p) => (
          <Polaroid
            key={p.film.slug}
            film={p.film}
            position={p.position}
            rotation={p.rotation}
            selected={selected?.slug === p.film.slug}
            onSelect={(f) => { setStation('ledger'); setSelected(f) }}
          />
        ))}

        <EffectComposer>
          <Bloom intensity={0.62} luminanceThreshold={0.52} luminanceSmoothing={0.3} mipmapBlur />
          <ChromaticAberration offset={[0.0006, 0.0009]} blendFunction={BlendFunction.NORMAL} />
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

      {selected && (
        <div style={card.wrap} onClick={() => setSelected(null)}>
          <div style={card.panel} onClick={(e) => e.stopPropagation()}>
            <div style={card.head}>
              <span style={card.name}>{selected.title}</span>
              <span style={card.score}>{selected.score.toFixed(1)}<small style={{ opacity: 0.6 }}> /10</small></span>
            </div>
            <div style={card.meta}>watched {selected.watched} · the Ledger</div>
            <div style={card.note}>
              The full case file — plot, hot take, the conversation — lands in M3, read in
              place on the card instead of in this box.
            </div>
            <div style={card.close}>click anywhere to close</div>
          </div>
        </div>
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
const card = {
  wrap: { position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(8,6,4,.5)' },
  panel: { background: '#fffef8', color: '#25221c', borderRadius: 4, padding: '22px 26px', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,.5)', fontFamily: 'Georgia, serif' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  name: { fontSize: 27, fontStyle: 'italic' },
  score: { fontSize: 27 },
  meta: { fontSize: 11.5, letterSpacing: '.12em', textTransform: 'uppercase', color: '#8a8272', marginTop: 8, fontFamily: 'system-ui, sans-serif' },
  note: { fontSize: 14, lineHeight: 1.5, marginTop: 14, color: '#57503f' },
  close: { fontSize: 12, color: '#a89c82', marginTop: 16, fontFamily: 'system-ui, sans-serif' },
}
