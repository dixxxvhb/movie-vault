import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { buildCourt, buildStrip, inArea, EYE, bandName } from './scenes.js'
import { radialTexture, frame } from './geo.js'
import { shortDate } from './layout.js'

// NO VACANCY building prototypes: the Court and the Strip, side by side on
// one page, both laid out from the live ledger. A prototype for Dixon's
// open call 1 (plan §9), not the building phase: no rooms are entered here,
// a door links out to the real room on the live Vault.

const LIVE = 'https://dixxxvhb.github.io/movie-vault/'
const stick = { x: 0, z: 0 }
const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

function initialKind() {
  try {
    const q = new URLSearchParams(location.search).get('b')
    if (q === 'strip' || q === 'court') return q
    const h = location.hash.replace('#', '')
    if (h === 'strip' || h === 'court') return h
  } catch { /* ignore */ }
  return 'court'
}

// ------------------------------------------------------------ scene layers

function Layers({ scene, onDoor }) {
  const radial = useMemo(() => radialTexture(), [])
  const built = useMemo(() => {
    const L = scene.layers
    const g = {
      arch: L.arch.geometry(), doors: L.doors.geometry(), glow: L.glow.geometry(),
      pools: L.pools.geometry(), words: L.words.geometry(),
    }
    return g
  }, [scene])
  useEffect(() => () => {
    Object.values(built).forEach((g) => g.dispose())
    scene.layers.atlas.texture?.dispose()
  }, [built, scene])
  useEffect(() => () => radial.dispose(), [radial])

  const click = (e) => {
    e.stopPropagation()
    if (e.delta > 8) return
    const tag = scene.layers.doors.tags[e.faceIndex]
    if (tag >= 0) onDoor(scene.rooms[tag])
  }

  return (
    <group>
      <mesh geometry={built.arch}>
        <meshStandardMaterial vertexColors roughness={0.93} metalness={0} />
      </mesh>
      <mesh geometry={built.doors} onClick={click}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}>
        <meshStandardMaterial vertexColors roughness={0.55} metalness={0.1} />
      </mesh>
      <mesh geometry={built.glow}>
        <meshBasicMaterial vertexColors toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={built.pools} renderOrder={2}>
        <meshBasicMaterial map={radial} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={built.words} renderOrder={1}>
        <meshBasicMaterial map={scene.layers.atlas.texture} transparent color="#d9d1c2" toneMapped={false} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
    </group>
  )
}

function Sky() {
  const geo = useMemo(() => {
    const n = 900
    const p = new Float32Array(n * 3)
    let s = 7
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2
      const e = 0.08 + Math.pow(rnd(), 0.7) * 1.4
      p[i * 3] = Math.cos(a) * Math.cos(e) * 400
      p[i * 3 + 1] = Math.sin(e) * 400
      p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 400
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    return g
  }, [])
  return (
    <group>
      <points geometry={geo}>
        <pointsMaterial color="#cfd8f0" size={1.4} sizeAttenuation={false} fog={false} toneMapped={false} />
      </points>
      <mesh position={[-160, 210, -260]}>
        <circleGeometry args={[9, 32]} />
        <meshBasicMaterial color="#e9eefc" fog={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ------------------------------------------------------------ the camera

function Rig({ scene, mode, level, warp, onNear }) {
  const { camera, gl, size } = useThree()
  const st = useRef({ x: 0, z: 0, yaw: 0, pitch: 0, ov: 0, ovDir: 1, ovHold: 0 })
  const keys = useRef(new Set())
  const lastNear = useRef(null)
  const nearClock = useRef(0)

  // Cut (never fly) to wherever the app asks: a spawn, a landing, a door.
  useEffect(() => {
    if (!warp) return
    const s = st.current
    s.x = warp.x
    s.z = warp.z
    s.yaw = warp.yaw
    s.pitch = warp.pitch ?? -0.04
  }, [warp])

  useEffect(() => {
    st.current.ov = scene.overview.kind === 'orbit' ? 0 : scene.overview.x0
    st.current.ovDir = 1
  }, [scene])

  useEffect(() => {
    const down = (e) => { keys.current.add(e.code) }
    const up = (e) => { keys.current.delete(e.code) }
    const blur = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  // drag to look (walk) or to scrub (overview)
  useEffect(() => {
    const el = gl.domElement
    let drag = null
    const pd = (e) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY } }
    const pm = (e) => {
      if (!drag || drag.id !== e.pointerId) return
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      drag.x = e.clientX
      drag.y = e.clientY
      const s = st.current
      if (mode === 'walk') {
        s.yaw += dx * 0.0042
        s.pitch = Math.max(-1.1, Math.min(1.1, s.pitch + dy * 0.0036))
      } else {
        s.ovHold = 5
        if (scene.overview.kind === 'orbit') s.ov = Math.max(-1.2, Math.min(1.2, s.ov + dx * 0.004))
        else s.ov = Math.max(scene.overview.x0, Math.min(scene.overview.x1, s.ov - dx * 0.12))
      }
    }
    const pu = (e) => { if (drag && drag.id === e.pointerId) drag = null }
    el.addEventListener('pointerdown', pd)
    window.addEventListener('pointermove', pm)
    window.addEventListener('pointerup', pu)
    window.addEventListener('pointercancel', pu)
    return () => {
      el.removeEventListener('pointerdown', pd)
      window.removeEventListener('pointermove', pm)
      window.removeEventListener('pointerup', pu)
      window.removeEventListener('pointercancel', pu)
    }
  }, [gl, mode, scene])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = st.current
    const ov = scene.overview
    camera.fov = coarse && size.width < size.height ? 62 : 52
    camera.updateProjectionMatrix()

    if (mode === 'overview') {
      if (s.ovHold > 0) s.ovHold -= dt
      if (ov.kind === 'orbit') {
        if (s.ovHold <= 0) {
          s.ov += s.ovDir * dt * 0.05
          if (s.ov > 0.75) s.ovDir = -1
          if (s.ov < -0.75) s.ovDir = 1
        }
        const vf = THREE.MathUtils.degToRad(camera.fov) / 2
        const hf = Math.atan(Math.tan(vf) * camera.aspect)
        const w = camera.aspect < 1 ? ov.width * 0.62 : ov.width
        const R = Math.max((w / 2) / Math.tan(hf), 17 / Math.tan(vf)) * 1.08
        const a = s.ov
        const t = ov.target
        camera.position.set(t[0] + Math.sin(a) * Math.cos(ov.elev) * R, t[1] + Math.sin(ov.elev) * R, t[2] + Math.cos(a) * Math.cos(ov.elev) * R)
        camera.lookAt(t[0], t[1], t[2])
      } else {
        if (s.ovHold <= 0) {
          s.ov += s.ovDir * dt * 4.2
          if (s.ov > ov.x1) s.ovDir = -1
          if (s.ov < ov.x0) s.ovDir = 1
        }
        const portrait = camera.aspect < 1
        camera.position.set(s.ov - (portrait ? 10 : 18), portrait ? 6.5 : 8, portrait ? 24 : 30)
        camera.lookAt(s.ov + (portrait ? 4 : 8), 1.6, 0)
      }
      return
    }

    // walk
    const k = keys.current
    let fwd = stick.z
    let side = stick.x
    if (k.has('KeyW') || k.has('ArrowUp')) fwd += 1
    if (k.has('KeyS') || k.has('ArrowDown')) fwd -= 1
    if (k.has('KeyD')) side += 1
    if (k.has('KeyA')) side -= 1
    if (k.has('ArrowLeft')) s.yaw += dt * 1.8
    if (k.has('ArrowRight')) s.yaw -= dt * 1.8
    const len = Math.hypot(fwd, side)
    if (len > 1) { fwd /= len; side /= len }
    const speed = (k.has('ShiftLeft') || k.has('ShiftRight')) ? 7.5 : 3.6
    const fx = -Math.sin(s.yaw)
    const fz = -Math.cos(s.yaw)
    const rx = Math.cos(s.yaw)
    const rz = -Math.sin(s.yaw)
    const dx = (fx * fwd + rx * side) * speed * dt
    const dz = (fz * fwd + rz * side) * speed * dt
    const area = scene.levels[level].area
    if (inArea(area, s.x + dx, s.z)) s.x += dx
    if (inArea(area, s.x, s.z + dz)) s.z += dz
    const y = scene.levels[level].y + EYE
    camera.position.set(s.x, y, s.z)
    camera.rotation.set(0, 0, 0)
    camera.rotation.order = 'YXZ'
    camera.rotation.y = s.yaw
    camera.rotation.x = -s.pitch

    // the nearest door you are standing in front of
    nearClock.current -= dt
    if (nearClock.current <= 0) {
      nearClock.current = 0.15
      let best = null
      let bd = 3.2
      for (const rm of scene.rooms) {
        if (rm.floor !== level) continue
        const { f } = frame(rm.rotY)
        const px = rm.x + f[0] * 0.9
        const pz = rm.z + f[2] * 0.9
        const d = Math.hypot(px - s.x, pz - s.z)
        if (d < bd) { bd = d; best = rm }
      }
      if (best !== lastNear.current) { lastNear.current = best; onNear(best) }
    }
  })
  return null
}

// ------------------------------------------------------------ DOM bits

function Stick() {
  const ring = useRef(null)
  const nub = useRef(null)
  useEffect(() => {
    const el = ring.current
    let id = null
    let cx = 0
    let cy = 0
    const R = 48
    const set = (x, z) => {
      stick.x = x
      stick.z = z
      nub.current.style.transform = `translate(${x * R}px, ${-z * R}px)`
    }
    const s = (e) => {
      const t = e.changedTouches[0]
      const r = el.getBoundingClientRect()
      id = t.identifier
      cx = r.left + r.width / 2
      cy = r.top + r.height / 2
      e.preventDefault()
    }
    const m = (e) => {
      const t = [...e.changedTouches].find((tt) => tt.identifier === id)
      if (!t) return
      let x = (t.clientX - cx) / R
      let z = -(t.clientY - cy) / R
      const l = Math.hypot(x, z)
      if (l > 1) { x /= l; z /= l }
      set(x, z)
      e.preventDefault()
    }
    const en = (e) => {
      if (![...e.changedTouches].some((tt) => tt.identifier === id)) return
      id = null
      set(0, 0)
    }
    el.addEventListener('touchstart', s, { passive: false })
    el.addEventListener('touchmove', m, { passive: false })
    el.addEventListener('touchend', en)
    el.addEventListener('touchcancel', en)
    return () => {
      set(0, 0)
      el.removeEventListener('touchstart', s)
      el.removeEventListener('touchmove', m)
      el.removeEventListener('touchend', en)
      el.removeEventListener('touchcancel', en)
    }
  }, [])
  return (
    <div ref={ring} className="stick" aria-hidden="true">
      <div ref={nub} className="nub" />
    </div>
  )
}

const BLURB = {
  court: (sc) => `${sc.rooms.length} rooms on ${sc.levels.length} levels. The room number is his score and each floor is one whole point: the fives on the ground, the nines on top, the two tens in the penthouse.`,
  strip: (sc) => `${sc.rooms.length} rooms in one row, best to worst, ${Math.round(sc.xEnd + 12)} metres from the office to the last door. Every tenth of a point nobody scored is ${2.2} metres of blank wall.`,
}

export default function BuildingApp() {
  const [films, setFilms] = useState(null)
  const [failed, setFailed] = useState(false)
  const [kind, setKind] = useState(initialKind)
  const [mode, setMode] = useState('overview')
  const [level, setLevel] = useState(0)
  const [warp, setWarp] = useState(null)
  const [selected, setSelected] = useState(null)
  const [near, setNear] = useState(null)
  const [fade, setFade] = useState(false)

  useEffect(() => {
    let live = true
    // The signage is painted into a canvas once, so the face has to be here first.
    const fonts = document.fonts
      ? Promise.all(['500 40px Oswald', '600 40px Oswald'].map((f) => document.fonts.load(f))).catch(() => null)
      : Promise.resolve()
    Promise.all([fetch(import.meta.env.BASE_URL + 'vault-data.json').then((r) => r.json()), fonts])
      .then(([d]) => live && setFilms(d.films.filter((f) => typeof f.score === 'number')))
      .catch(() => live && setFailed(true))
    return () => { live = false }
  }, [])

  const scene = useMemo(() => {
    if (!films) return null
    return kind === 'court' ? buildCourt(films) : buildStrip(films)
  }, [films, kind])

  useEffect(() => {
    const b = document.getElementById('boot')
    if (scene && b) b.style.display = 'none'
  }, [scene])

  // A cut: wash to black, move, wash back (plan §6 item 6, "cut, don't fly").
  const cut = useCallback((fn) => {
    setFade(true)
    setTimeout(() => { fn(); setTimeout(() => setFade(false), 60) }, 220)
  }, [])

  const switchKind = (k) => {
    if (k === kind) return
    cut(() => {
      setKind(k)
      setMode('overview')
      setLevel(0)
      setSelected(null)
      setNear(null)
      try { history.replaceState(null, '', `#${k}`) } catch { /* ignore */ }
    })
  }

  const walkIn = () => cut(() => {
    const sp = scene.spawn
    setLevel(sp.level)
    setWarp({ ...sp, t: Date.now() })
    setMode('walk')
    setSelected(null)
  })

  const goLevel = (i) => cut(() => {
    const lv = scene.levels[i]
    setLevel(i)
    setWarp({ ...lv.landing, t: Date.now() })
    setMode('walk')
    setSelected(null)
  })

  const walkTo = (rm) => cut(() => {
    const { f } = frame(rm.rotY)
    const lvl = rm.floor
    let x = rm.x + f[0] * 2.0 + Math.cos(rm.rotY) * 0.6
    let z = rm.z + f[2] * 2.0 - Math.sin(rm.rotY) * 0.6
    if (!inArea(scene.levels[lvl].area, x, z)) { x = rm.x + f[0] * 1.6; z = rm.z + f[2] * 1.6 }
    setLevel(lvl)
    setWarp({ x, z, yaw: rm.rotY, pitch: -0.08, t: Date.now() })
    setMode('walk')
    setSelected(null)
  })

  if (failed) return <p className="msg">The ledger could not be loaded.</p>
  if (!scene) return <p className="msg">Reading the ledger.</p>

  const levelsTopDown = scene.levels.map((lv, i) => ({ ...lv, i })).reverse()
  const counts = scene.levels.map((_, i) => scene.rooms.filter((r) => r.floor === i).length)

  return (
    <div className="app">
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ fov: 52, near: 0.1, far: 900, position: [0, 20, 60] }}
        onCreated={({ scene: s }) => { s.background = new THREE.Color('#0a1020') }}
      >
        <fogExp2 attach="fog" args={['#0a1020', scene.fog]} />
        <hemisphereLight args={['#5d74a6', '#1c140c', 0.85]} />
        <directionalLight position={[-30, 50, 40]} intensity={0.55} color="#a9bfe6" />
        {kind === 'court' && <pointLight position={[0, 0.6, -2]} color="#3fc6d8" intensity={40} distance={26} decay={1.6} />}
        <Sky />
        <Layers scene={scene} onDoor={(rm) => setSelected(rm)} />
        <Rig scene={scene} mode={mode} level={level} warp={warp} onNear={setNear} />
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.95} luminanceThreshold={0.55} luminanceSmoothing={0.25} mipmapBlur />
          <Vignette offset={0.32} darkness={0.72} />
        </EffectComposer>
      </Canvas>

      <div className={`fade${fade ? ' on' : ''}`} />

      <header className="top">
        <div className="brand">
          <span className="name">The Vault</span>
          <span className="tag">building prototype</span>
        </div>
        <div className="seg" role="group" aria-label="Building">
          <button type="button" className={kind === 'court' ? 'on' : ''} onClick={() => switchKind('court')}>The Court</button>
          <button type="button" className={kind === 'strip' ? 'on' : ''} onClick={() => switchKind('strip')}>The Strip</button>
        </div>
      </header>

      {kind === 'court' && (
        <nav className="floors" aria-label="Floors">
          {levelsTopDown.map((lv) => (
            <button type="button" key={lv.i} className={mode === 'walk' && level === lv.i ? 'on' : ''} onClick={() => goLevel(lv.i)}>
              <b>{lv.label.replace('THE ', '')}</b><span>{counts[lv.i]}</span>
            </button>
          ))}
        </nav>
      )}

      {mode === 'overview' ? (
        <footer className="foot">
          <p className="blurb">{BLURB[kind](scene)}</p>
          <div className="row">
            <button type="button" className="primary" onClick={walkIn}>Walk in</button>
            <span className="hint">Drag to look around. Tap a door to read its card.</span>
          </div>
        </footer>
      ) : (
        <footer className="foot walk">
          <div className="row">
            <button type="button" onClick={() => cut(() => { setMode('overview'); setSelected(null) })}>See the whole building</button>
            <span className="where">{scene.levels[level].label} <i>{scene.levels[level].sub}</i></span>
          </div>
          {near && !selected && (
            <button type="button" className="near" onClick={() => setSelected(near)}>
              <b>Room {near.number}</b> {near.title} <span>{near.score.toFixed(1)}</span>
            </button>
          )}
          {!coarse && <span className="hint">WASD or arrows to walk, drag to look, Shift to hurry.</span>}
        </footer>
      )}

      {mode === 'walk' && coarse && <Stick />}

      {selected && (
        <aside className="card" role="dialog" aria-label={`Room ${selected.number}`}>
          <button type="button" className="x" aria-label="Close" onClick={() => setSelected(null)}>Close</button>
          <div className="num">{selected.number}</div>
          <h2>{selected.title}</h2>
          <p className="meta">
            {selected.score.toFixed(1)} · watched {shortDate(selected.watched)} · {kind === 'court'
              ? (selected.floor === scene.levels.length - 1 ? 'penthouse' : `floor ${selected.floor + 1}, ${bandName(Math.floor(selected.tenths / 10)).toLowerCase()}`)
              : `${Math.round(selected.x + 12)} m from the office`}
            {selected.tieSize > 1 ? ` · one of ${selected.tieSize} at ${selected.score.toFixed(1)}` : ''}
          </p>
          <div className="row">
            <button type="button" className="primary" onClick={() => walkTo(selected)}>Walk to the door</button>
            <a className="link" href={`${LIVE}?room=${selected.slug}`} target="_blank" rel="noreferrer">Open the room on the live Vault</a>
          </div>
        </aside>
      )}
    </div>
  )
}
