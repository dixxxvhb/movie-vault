import React, { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Polaroid from './Polaroid.jsx'

// deterministic tiny hash -> pinned-photo jitter, stable per slug
function jitter(slug) {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) & 0xffff
  return {
    rot: (((h % 7) - 3) * 0.018),
    dy: (((h >> 3) % 5) - 2) * 0.03,
  }
}

// salon hang: perfect score crowns the wall, then rows of six descend by rank
const ROWS = [1, 6, 6, 6, 6, 6]
const COL_GAP = 1.46
const ROW_GAP = 1.66
const TOP_Y = 9.3

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
      placed.push({ film, position: [x, y + j.dy, 0.02], rotation: j.rot })
    }
  }
  return placed
}

function Room() {
  return (
    <group>
      {/* back wall — aged ivory, warm */}
      <mesh position={[0, 5, -0.35]} receiveShadow>
        <planeGeometry args={[26, 16]} />
        <meshStandardMaterial color="#cbbfa3" roughness={1} />
      </mesh>
      {/* floor — dark boards */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 6]}>
        <planeGeometry args={[26, 22]} />
        <meshStandardMaterial color="#241a12" roughness={1} />
      </mesh>
      {/* ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 12.5, 6]}>
        <planeGeometry args={[26, 22]} />
        <meshStandardMaterial color="#221d17" roughness={1} />
      </mesh>
      {/* side walls */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-13, 5, 6]}>
        <planeGeometry args={[22, 16]} />
        <meshStandardMaterial color="#3a3126" roughness={1} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[13, 5, 6]}>
        <planeGeometry args={[22, 16]} />
        <meshStandardMaterial color="#3a3126" roughness={1} />
      </mesh>
    </group>
  )
}

export default function App() {
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'vault-data.json')
      .then((r) => r.json())
      .then((d) => { setData(d); const b = document.getElementById('boot'); if (b) b.style.display = 'none' })
      .catch((e) => console.error('vault-data load failed', e))
  }, [])

  const placed = useMemo(() => (data ? layout(data.films) : []), [data])

  return (
    <>
      <Canvas
        shadows={false}
        dpr={[1, 2]}
        camera={{ position: [0, 4.4, 12.5], fov: 42 }}
        gl={{ antialias: true }}
        onPointerMissed={() => setSelected(null)}
      >
        <color attach="background" args={['#0b0906']} />
        <fog attach="fog" args={['#0b0906', 14, 40]} />

        {/* room lighting only affects the walls/floor now — the polaroid faces
            are unlit so they stay readable. Kept low + warm for a moody vault. */}
        <ambientLight intensity={0.55} color="#f2e6cf" />
        <spotLight position={[0, 11.5, 7]} angle={0.7} penumbra={0.8} intensity={12} color="#ffd9a0" decay={0.4} />
        <pointLight position={[-8, 6, 9]} intensity={16} color="#ffe6c2" decay={2} />

        <Room />

        {placed.map((p) => (
          <Polaroid
            key={p.film.slug}
            film={p.film}
            position={p.position}
            rotation={p.rotation}
            selected={selected?.slug === p.film.slug}
            onSelect={setSelected}
          />
        ))}

        <OrbitControls
          target={[0, 5, 0]}
          enablePan={false}
          minDistance={4}
          maxDistance={18}
          minPolarAngle={0.4}
          maxPolarAngle={Math.PI / 2 + 0.15}
          minAzimuthAngle={-0.9}
          maxAzimuthAngle={0.9}
          rotateSpeed={0.6}
          zoomSpeed={0.8}
        />
      </Canvas>

      {/* HUD */}
      <div style={hud.brand}>
        <div style={hud.title}>The Vault</div>
        {data && <div style={hud.sub}>{data.count} films · avg {data.avg} · scored live</div>}
      </div>
      <div style={hud.hint}>drag to look around · scroll to zoom · click a photo</div>

      {selected && (
        <div style={card.wrap} onClick={() => setSelected(null)}>
          <div style={card.panel} onClick={(e) => e.stopPropagation()}>
            <div style={card.head}>
              <span style={card.name}>{selected.title}</span>
              <span style={card.score}>{selected.score.toFixed(1)}<small style={{ opacity: 0.6 }}> /10</small></span>
            </div>
            <div style={card.meta}>watched {selected.watched} · the Ledger</div>
            <div style={card.note}>Full hot-take and back-of-card notes land in the next pass — this is milestone one (real 3D, live on your own hosting).</div>
            <div style={card.close}>click anywhere to close</div>
          </div>
        </div>
      )}
    </>
  )
}

const hud = {
  brand: { position: 'fixed', top: 16, left: 20, color: '#efe7d6', pointerEvents: 'none', fontFamily: 'Georgia, serif' },
  title: { fontSize: 26, fontStyle: 'italic', letterSpacing: '.01em' },
  sub: { fontSize: 12.5, color: '#b9ae98', marginTop: 2, fontFamily: 'system-ui, sans-serif' },
  hint: { position: 'fixed', bottom: 16, right: 20, color: '#8f8672', fontSize: 13, fontFamily: 'system-ui, sans-serif', pointerEvents: 'none' },
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
