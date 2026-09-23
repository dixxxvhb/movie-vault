import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import Touchable from '../../Touchable.jsx'
import { standardMat } from '../../materials.js'
import { get as getSetting } from '../../../settings.js'
import { claimFlash, strobe, flashGain } from '../../../flashPolicy.js'
import { makePaintedTexture } from './basterdsTextures.js'
import { paintSeatCard, paintScreen } from './theatreTextures.js'
import { CHARACTERS, FRAGMENTS } from './content.js'
import { useVaultData } from './Lobby.jsx'
import { TentCard } from './Rue.jsx'
import { Scrap } from './LobbyProps.jsx'
import { floorAt, ROWS, ROW_Z0, ROW_PITCH, SEAT_W, BLOCKS, BOOTH_Y, APRON_Y } from './zones.js'

// LE GAMAAR: the auditorium, the booth, behind the screen, and the fire.
// Plan §4.3 to §4.5 and §10.
//
// THE SEATING CHART. Rows are the chapter a character walks in (back row =
// chapter 1). Left of the aisle, the hunted and the Allies; right, the Reich.
// A seat that is down with its lamp lit: they were in the building on premiere
// night. A seat folded up, lamp dark: they died before it.

const ROW_OF = { 1: 1, 2: 3, 3: 6, 4: 9 }
const IN_BOX = new Set(['hitler', 'goebbels'])
const seatX = (side, j) => (side === 'hunted' ? -1.0 - SEAT_W * (j + 0.5) : 1.0 + SEAT_W * (j + 0.5))
const rowZ = (r) => ROW_Z0 - r * ROW_PITCH

export const SEATS = (() => {
  const count = {}
  return CHARACTERS.filter((c) => !IN_BOX.has(c.id)).map((c) => {
    const key = c.chapter + ':' + c.side
    const j = (count[key] = (count[key] ?? -1) + 1)
    const r = ROW_OF[c.chapter]
    return { ...c, r, j, x: seatX(c.side, j), z: rowZ(r) }
  })
})()
const TAKEN = new Set(SEATS.map((s) => s.r + ':' + s.side + ':' + s.j))

function usePainted(w, h, paint, deps) {
  const tex = useMemo(() => makePaintedTexture(w, h, paint), deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => tex.dispose(), [tex])
  return tex
}

const velvet = new THREE.MeshStandardMaterial({ color: '#5e1515', roughness: 0.95 })
const frame = new THREE.MeshStandardMaterial({ color: '#1c1410', roughness: 0.6, metalness: 0.3 })
const lampMat = new THREE.MeshStandardMaterial({ color: '#fff0cf', emissive: '#ffcc80', emissiveIntensity: 1.6 })

// Every empty seat in the house: instanced, two draw calls.
function Chairs() {
  const pads = useRef(), backs = useRef()
  const spots = useMemo(() => {
    const out = []
    for (let r = 0; r < ROWS; r++) {
      BLOCKS.forEach(([a, b], bi) => {
        const n = Math.floor((b - a) / SEAT_W)
        for (let k = 0; k < n; k++) {
          const x = a + SEAT_W * (k + 0.5)
          const side = bi === 0 ? 'hunted' : 'reich'
          const j = bi === 0 ? n - 1 - k : k        // j counts out from the aisle
          if (TAKEN.has(r + ':' + side + ':' + j)) continue
          out.push([x, rowZ(r)])
        }
      })
    }
    return out
  }, [])
  useEffect(() => {
    const m = new THREE.Matrix4()
    spots.forEach(([x, z], i) => {
      const y = floorAt(x, z)
      m.makeTranslation(x, y + 0.44, z - 0.02); pads.current.setMatrixAt(i, m)
      m.makeTranslation(x, y + 0.76, z + 0.22); backs.current.setMatrixAt(i, m)
    })
    pads.current.instanceMatrix.needsUpdate = true
    backs.current.instanceMatrix.needsUpdate = true
  }, [spots])
  return (
    <group>
      <instancedMesh ref={pads} args={[null, null, spots.length]} material={velvet} frustumCulled={false}>
        <boxGeometry args={[SEAT_W * 0.86, 0.1, 0.46]} />
      </instancedMesh>
      <instancedMesh ref={backs} args={[null, null, spots.length]} material={velvet} frustumCulled={false}>
        <boxGeometry args={[SEAT_W * 0.86, 0.62, 0.08]} />
      </instancedMesh>
    </group>
  )
}

// One character's seat, with their card on its back.
function CharacterSeat({ s, cast }) {
  const tex = usePainted(512, 720, (c) => paintSeatCard(c, s, cast), [s.id, cast])
  const y = floorAt(s.x, s.z)
  const w = SEAT_W * 0.86
  return (
    <group position={[s.x, y, s.z]}>
      {s.premiere
        ? <mesh position={[0, 0.44, -0.02]} material={velvet}><boxGeometry args={[w, 0.1, 0.46]} /></mesh>
        : <mesh position={[0, 0.66, 0.14]} rotation={[Math.PI / 2 - 0.1, 0, 0]} material={velvet}><boxGeometry args={[w, 0.1, 0.42]} /></mesh>}
      <mesh position={[0, 0.76, 0.22]} material={velvet}><boxGeometry args={[w, 0.62, 0.08]} /></mesh>
      <mesh position={[0, 0.78, 0.262]}>
        <planeGeometry args={[0.3, 0.42]} />
        <meshStandardMaterial key="card" map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.42} roughness={0.9} />
      </mesh>
      {/* a brass holder rim */}
      <mesh position={[0, 0.998, 0.262]} material={frame}><boxGeometry args={[0.32, 0.02, 0.01]} /></mesh>
      {s.premiere && <mesh position={[0, 1.1, 0.22]} material={lampMat}><sphereGeometry args={[0.018, 12, 10]} /></mesh>}
    </group>
  )
}

// A card that stands on its own (the Box parapet, Marcel behind the screen).
function StandingCard({ ch, cast, pos, ry = 0, scale = 1 }) {
  const tex = usePainted(512, 720, (c) => paintSeatCard(c, ch, cast), [ch.id, cast])
  return (
    <mesh position={pos} rotation={[0, ry, 0]} scale={scale}>
      <planeGeometry args={[0.3, 0.42]} />
      <meshStandardMaterial key="card" map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.45} roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ---------------------------------------------------------------- the screen
function Screen({ state, cast }) {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 860; return c
  }, [])
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [canvas])
  useEffect(() => () => tex.dispose(), [tex])
  const key = state.mode + ':' + (state.n ?? '') + ':' + (state.p ?? 0).toFixed(2) + ':' + (state.t ?? 0)
  useEffect(() => {
    let live = true
    paintScreen(canvas, { ...state, cast }).then(() => { if (live) tex.needsUpdate = true })
    return () => { live = false }
  }, [key, cast]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <mesh position={[0, APRON_Y + 2.6, -31.52]}>
      <planeGeometry args={[10, 4.2]} />
      <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.95} roughness={1} />
    </mesh>
  )
}

// ---------------------------------------------------------------- the booth
function Booth({ reel, setReel, burning }) {
  const metal = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2622', metalness: 0.7, roughness: 0.4 }), [])
  const reels = [1, 2, 3, 4, 5, 'her']
  const dress = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8e1410', roughness: 0.7 }), [])
  return (
    <group>
      {/* the projector, nose to the porthole */}
      <group position={[-0.85, BOOTH_Y, -12.1]}>
        <mesh position={[0, 0.5, 0]} material={metal}><boxGeometry args={[0.5, 1.0, 0.6]} /></mesh>
        <mesh position={[0, 1.25, 0.05]} material={metal}><boxGeometry args={[0.36, 0.5, 0.9]} /></mesh>
        <mesh position={[0, 1.42, -0.52]} rotation={[Math.PI / 2, 0, 0]} material={metal}><cylinderGeometry args={[0.07, 0.09, 0.3, 16]} /></mesh>
        {/* the two spools */}
        {[0.55, -0.45].map((z) => (
          <mesh key={z} position={[0, 1.8, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.3, 0.3, 0.05, 32]} />
            <meshStandardMaterial color={reel ? '#3a3632' : '#2a2622'} metalness={0.8} roughness={0.35} />
          </mesh>
        ))}
        <mesh position={[0, 1.42, -0.68]}><circleGeometry args={[0.06, 16]} /><meshStandardMaterial color="#fffbe8" emissive="#fff4d0" emissiveIntensity={reel || burning ? 3 : 1.2} /></mesh>
      </group>

      {/* the reel rack: five chapters and one more, hers */}
      <group position={[-2.85, BOOTH_Y, -11.6]}>
        <mesh position={[0, 1.1, 0]} material={metal}><boxGeometry args={[0.12, 1.6, 1.9]} /></mesh>
        {reels.map((r, i) => (
          <Touchable key={r} reach={2.2} foley="thunk" anchor={[0.12, 0.55 + (i % 3) * 0.5, -0.6 + Math.floor(i / 3) * 1.1]}
            onUse={() => setReel(r)}>
            <group position={[0.12, 0.55 + (i % 3) * 0.5, -0.6 + Math.floor(i / 3) * 1.1]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.2, 0.2, 0.06, 28]} />
                <meshStandardMaterial color={r === 'her' ? '#5a1a14' : '#3a3632'} metalness={0.6} roughness={0.45}
                  emissive={reel === r ? '#ffb060' : '#000000'} emissiveIntensity={reel === r ? 0.5 : 0} />
              </mesh>
              <ReelLabel text={r === 'her' ? 'hers' : String(r)} hand={r === 'her'} />
            </group>
          </Touchable>
        ))}
      </group>
      <TentCard pos={[-2.5, BOOTH_Y + 0.9, -10.75]} ry={Math.PI} w={0.34}
        text={reel === 'her'
          ? 'Her reel is on. Behind the screen, the nitrate is waiting.'
          : 'Thread a reel and watch the screen through the porthole. The last one is hers.'} />

      {/* the makeup mirror and the red dress: premiere night */}
      <mesh position={[-2.0, BOOTH_Y + 1.5, -10.45]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.6, 0.8]} /><meshStandardMaterial color="#8a8a86" metalness={0.95} roughness={0.08} /></mesh>
      <mesh position={[-0.9, BOOTH_Y + 1.05, -10.62]} material={dress}><coneGeometry args={[0.36, 1.4, 20, 1, true]} /></mesh>
      <mesh position={[-0.9, BOOTH_Y + 1.82, -10.62]} material={dress}><cylinderGeometry args={[0.12, 0.15, 0.25, 16]} /></mesh>
    </group>
  )
}

function ReelLabel({ text, hand }) {
  const tex = usePainted(128, 128, (c) => {
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#efe4cf'; ctx.beginPath(); ctx.arc(64, 64, 60, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = hand ? '#8e1410' : '#1b1612'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = hand ? 'italic 700 40px Georgia' : '700 64px Oswald'
    ctx.fillText(text, 64, 66)
  }, [text])
  return (
    <mesh position={[0.035, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      <circleGeometry args={[0.09, 24]} />
      <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.4} />
    </mesh>
  )
}

// The beam, projector to screen, through the porthole.
function Beam({ on }) {
  const from = new THREE.Vector3(-0.85, BOOTH_Y + 1.42, -12.8)
  const to = new THREE.Vector3(0, APRON_Y + 2.6, -30.2)
  const dir = to.clone().sub(from)
  const len = dir.length()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize())
  const mid = from.clone().add(to).multiplyScalar(0.5)
  return (
    <mesh position={mid} quaternion={q}>
      <cylinderGeometry args={[0.05, 2.6, len, 24, 1, true]} />
      <meshBasicMaterial color="#fff2d8" transparent opacity={on ? 0.04 : 0.016} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} toneMapped={false} />
    </mesh>
  )
}

// ---------------------------------------------------------------- behind
function Behind({ armed, onIgnite, burning, cast }) {
  const cans = useRef()
  const spots = useMemo(() => {
    const out = []
    for (let col = 0; col < 18; col++) for (let h = 0; h < 7; h++) out.push([-6.8 + col * 0.44, APRON_Y + 0.06 + h * 0.12 * 2.6, -34.1 + (col % 2) * 0.08])
    return out
  }, [])
  useEffect(() => {
    const m = new THREE.Matrix4()
    spots.forEach(([x, y, z], i) => { m.makeTranslation(x, y + 0.14, z); cans.current.setMatrixAt(i, m) })
    cans.current.instanceMatrix.needsUpdate = true
  }, [spots])
  const burn = FRAGMENTS.find((f) => f.where.includes('nitrate'))
  const marcel = CHARACTERS.find((c) => c.id === 'marcel')
  const [refused, setRefused] = useState(false)
  return (
    <group>
      <instancedMesh ref={cans} args={[null, null, spots.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.2, 0.2, 0.3, 24]} />
        <meshStandardMaterial color="#6e6258" metalness={0.75} roughness={0.35}
          emissive={armed || burning ? '#ff6a1a' : '#000000'} emissiveIntensity={burning ? 0.9 : armed ? 0.12 : 0} />
      </instancedMesh>
      <mesh position={[1.0, APRON_Y + 2.4, -32.9]}><sphereGeometry args={[0.05, 12, 10]} /><meshStandardMaterial color="#fff2d0" emissive="#ffd9a0" emissiveIntensity={3} /></mesh>
      {burn && <Scrap text={burn.text} pos={[-2.6, APRON_Y + 1.25, -33.5]} w={2.4} rot={0.04} size={120} />}
      <StandingCard ch={marcel} cast={cast} pos={[2.4, APRON_Y + 1.55, -34.3]} scale={1.3} />
      {/* the ashtray and the cigarette */}
      <mesh position={[3.4, APRON_Y + 0.45, -34.1]} material={frame}><cylinderGeometry args={[0.18, 0.2, 0.9, 16]} /></mesh>
      <Touchable reach={2.2} foley="swish" anchor={[3.4, APRON_Y + 0.95, -34.1]}
        onUse={() => { if (armed && !burning) onIgnite(); else if (!armed) setRefused(true) }}>
        <group position={[3.4, APRON_Y + 0.93, -34.1]}>
          <mesh><cylinderGeometry args={[0.09, 0.07, 0.03, 20]} /><meshStandardMaterial color="#3a3632" metalness={0.8} roughness={0.3} /></mesh>
          <mesh position={[0.05, 0.03, 0]} rotation={[0, 0, Math.PI / 2 - 0.12]}><cylinderGeometry args={[0.005, 0.005, 0.08, 8]} /><meshStandardMaterial color="#f2eee6" /></mesh>
          <mesh position={[0.092, 0.035, 0]}><sphereGeometry args={[0.006, 8, 6]} /><meshStandardMaterial color="#ff7a30" emissive="#ff6a1a" emissiveIntensity={3} /></mesh>
        </group>
      </Touchable>
      <TentCard pos={[3.4, APRON_Y + 0.92, -33.72]} w={0.3}
        text={burning ? 'Marcel locks the doors and drops it.' : armed
          ? 'Her reel is running. Touch the cigarette.'
          : refused ? 'Not yet. She has a reel to run first. The booth is up the east stair.' : 'Marcel\'s cigarette. Nitrate film burns hotter than anything in this building.'} />
    </group>
  )
}

// ---------------------------------------------------------------- the whole
export default function Theatre() {
  const data = useVaultData()
  const cast = data?.cast?.['inglourious-basterds'] || null
  const { scene } = useThree()
  const [reel, setReel] = useState(null)                    // null | 1..5 | 'her'
  const [fire, setFire] = useState(null)                    // null | {t0} | 'rewind' | 'burnt'
  const [p, setP] = useState(0)
  const [ft, setFt] = useState(0)
  const keyLight = useRef()
  const fireLight = useRef()
  const baseFog = useRef(null)

  const ignite = () => {
    if (getSetting('content.roomEvents') === false) { setFire('burnt'); setTimeout(() => { setFire(null); setReel(null) }, 6000); return }
    claimFlash('basterds-fire', 1)
    setFire({ t0: performance.now() })
  }

  // test hooks for the preview and the Dailies (same as touching the reel / the cigarette)
  useEffect(() => {
    window.__basterdsReel = (r) => setReel(r)
    window.__basterdsIgnite = () => ignite()
    return () => { delete window.__basterdsReel; delete window.__basterdsIgnite }
  })

  const DURATION = 18
  useFrame(() => {
    if (!fire || typeof fire !== 'object') {
      if (fireLight.current) { fireLight.current.intensity = 7; fireLight.current.color.set('#ffb070') }
      return
    }
    const t = (performance.now() - fire.t0) / 1000
    const q = Math.min(1, t / DURATION)
    const burnP = Math.min(0.86, Math.max(0, (t - 2.5) / 11))
    const quant = Math.round(burnP * 40) / 40
    if (quant !== p) setP(quant)
    const tq = Math.round(t * 10) / 10          // flames repaint at 10 fps
    if (tq !== ft) setFt(tq)
    // the fire's light: a rising orange, with a flicker the flash budget allows
    const gain = flashGain()
    const flick = gain > 0 ? strobe(t, { hz: 2.2, soft: 0.8, floor: 0.55 }) : 1
    if (fireLight.current) fireLight.current.color.set('#ff7a2a')
    if (fireLight.current) fireLight.current.intensity = 7 + 70 * Math.min(1, t / 4) * (gain > 0 ? flick : 0.85) * (1 - Math.max(0, (q - 0.9) * 10))
    // smoke rolls in
    if (scene.fog) {
      if (baseFog.current == null) baseFog.current = scene.fog.density
      scene.fog.density = baseFog.current + 0.035 * Math.min(1, t / 9) * (1 - Math.max(0, (q - 0.9) * 10))
    }
    if (t > DURATION) {
      if (scene.fog && baseFog.current != null) scene.fog.density = baseFog.current
      setFire('rewind'); setP(0)
      setTimeout(() => { setFire(null); setReel(null) }, 3500)
    }
  })

  const burning = fire && typeof fire === 'object'
  const screenState = fire === 'rewind' ? { mode: 'rewind' } : fire === 'burnt' ? { mode: 'burnt' }
    : burning ? { mode: 'burn', p, t: ft } : reel === 'her' ? { mode: 'her' } : reel ? { mode: 'reel', n: reel } : { mode: 'idle' }

  const boxFragment = FRAGMENTS.find((f) => f.where.includes('box'))
  const landa = FRAGMENTS.find((f) => f.where.includes('Landa'))
  const landaSeat = SEATS.find((s) => s.id === 'landa')
  return (
    <group>
      <pointLight ref={keyLight} position={[0, 6.8, -20]} intensity={40} distance={26} color="#ffb070" />
      {/* behind the screen: a bare work light that becomes the fire (one light, two jobs, the budget is 7) */}
      <pointLight ref={fireLight} position={[1.0, APRON_Y + 2.4, -32.9]} intensity={7} distance={30} color="#ffb070" />
      <Chairs />
      {SEATS.map((s) => <CharacterSeat key={s.id} s={s} cast={cast} />)}
      {landa && landaSeat && (
        <Scrap text={'"' + landa.text + '"'} pos={[landaSeat.x + 0.02, floorAt(landaSeat.x, landaSeat.z) + 1.22, landaSeat.z + 0.27]} w={0.5} rot={0.06} size={58} />
      )}
      {/* the Box: Hitler and Goebbels on the parapet, and his line */}
      {['hitler', 'goebbels'].map((id, i) => (
        <StandingCard key={id} ch={CHARACTERS.find((c) => c.id === id)} cast={cast}
          pos={[6.19, 3.5, -20.7 - i * 1.6]} ry={-Math.PI / 2} scale={1.4} />
      ))}
      {boxFragment && <Scrap text={boxFragment.text} pos={[6.18, 3.05, -23.2]} ry={-Math.PI / 2} w={1.3} rot={-0.05} size={70} />}
      <Screen state={screenState} cast={cast} />
      {/* <Beam /> parked: renders as a solid slab under this post stack; Session 4 polish */}
      <Booth reel={reel} setReel={setReel} burning={burning} />
      <Behind armed={reel === 'her'} onIgnite={ignite} burning={burning} cast={cast} />
    </group>
  )
}
