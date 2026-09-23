import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import Touchable from '../../Touchable.jsx'
import { standardMat } from '../../materials.js'
import { makePaintedTexture } from './basterdsTextures.js'
import { paintSeatCard } from './theatreTextures.js'
import { paintWhoAmI, paintAnswer, paintCardBack, paintBanner, paintClock, paintNapkin } from './cellarTextures.js'
import { CHARACTERS, BONUS, GUEST, WILHELM } from './content.js'
import { useVaultData } from './data.js'
import { TentCard } from '../../kit/notes.jsx'
import { CELLAR_Y, BAR_Y } from './zones.js'

// LA LOUISIANE: the basement tavern, chapter 4. Plan §4.6.
//
// The long table where the card game was played, the bar, the clock, the new
// father's banner. Three things to touch: the deck ("Who am I?", the room's
// memory game), the carved hand on the bar (British three, German three), and
// nothing at all for the shoe, which you just have to notice.

const Y = CELLAR_Y
const TABLE = { x: -15, z: -6, w: 1.2, d: 4.2, h: 0.8 }
const TOP = Y + TABLE.h

function usePainted(w, h, paint, deps) {
  const tex = useMemo(() => makePaintedTexture(w, h, paint), deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => tex.dispose(), [tex])
  return tex
}

const brass = new THREE.MeshStandardMaterial({ color: '#8a6a36', metalness: 0.8, roughness: 0.35 })
const glassMat = new THREE.MeshStandardMaterial({ color: '#d8c89a', transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.1 })
const whisky = new THREE.MeshStandardMaterial({ color: '#a8621a', emissive: '#5a2a08', emissiveIntensity: 0.4, roughness: 0.2 })
const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff0cf', emissive: '#ffbf70', emissiveIntensity: 1.4 })

// ---------------------------------------------------------------- the deck
// Random order without repeats: the twenty characters, then the five
// forehead names, then the last card. No score, nothing counted. The
// rehearsal, not the exam.
function shuffle(a) {
  const out = a.slice()
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]] }
  return out
}
function freshDeck() {
  return [
    ...shuffle(CHARACTERS).map((c, i) => ({ kind: 'character', key: c.id, seed: i + 1, ...c })),
    ...shuffle(BONUS).map((b, i) => ({ kind: 'bonus', key: 'bonus-' + i, seed: 40 + i, ...b })),
    { kind: 'guest', key: 'guest', seed: 77, ...GUEST },
  ]
}

const CARD_W = 0.36, CARD_H = 0.5

function DealtCard({ card, cast, turned, onTurn }) {
  const front = usePainted(512, 720, (c) => paintWhoAmI(c, card), [card.key])
  const back = usePainted(512, 720, (c) => (card.kind === 'character'
    ? paintSeatCard(c, { ...card, tag: 'THAT WAS ME' }, cast)
    : paintAnswer(c, card)), [card.key, cast])
  const spin = useRef()
  const rise = useRef()
  const t = useRef(0), up = useRef(0)
  useFrame((_, dt) => {
    t.current = THREE.MathUtils.damp(t.current, turned ? 1 : 0, 7, dt)
    up.current = THREE.MathUtils.damp(up.current, 1, 5, dt)
    if (spin.current) spin.current.rotation.y = t.current * Math.PI
    if (rise.current) { rise.current.position.y = -0.28 * (1 - up.current); rise.current.rotation.x = -0.9 * (1 - up.current) }
  })
  return (
    <group ref={rise}>
      <Touchable reach={2.4} foley="paper" anchor={[0, CARD_H / 2, 0]} onUse={onTurn}>
        <group ref={spin} position={[0, CARD_H / 2 + 0.02, 0]}>
          <mesh>
            <planeGeometry args={[CARD_W, CARD_H]} />
            <meshStandardMaterial key={'f' + card.key} map={front} emissiveMap={front} emissive="#ffffff" emissiveIntensity={0.45} roughness={0.9} />
          </mesh>
          <mesh rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[CARD_W, CARD_H]} />
            <meshStandardMaterial key={'b' + card.key} map={back} emissiveMap={back} emissive="#ffffff" emissiveIntensity={0.45} roughness={0.9} />
          </mesh>
        </group>
      </Touchable>
    </group>
  )
}

function WhoAmI({ cast }) {
  const [deck, setDeck] = useState(freshDeck)
  const [i, setI] = useState(-1)
  const [turned, setTurned] = useState(false)
  const backTex = usePainted(256, 360, paintCardBack, [])
  const left = i < 0 ? deck.length : deck.length - 1 - i
  const deal = () => {
    setTurned(false)
    if (i + 1 >= deck.length) { setDeck(freshDeck()); setI(0) } else setI(i + 1)
  }
  useEffect(() => {
    window.__basterdsDeal = (n = 1, turn = false) => {
      setI((v) => Math.min(deck.length - 1, v + n)); setTurned(turn)
    }
    window.__basterdsTurn = () => setTurned((v) => !v)
    return () => { delete window.__basterdsDeal; delete window.__basterdsTurn }
  }, [deck.length])
  const card = i >= 0 ? deck[i] : null
  const stackH = Math.max(0.004, left * 0.0022)
  return (
    <group position={[TABLE.x + 0.34, TOP, TABLE.z + 0.2]} rotation={[0, Math.PI / 2, 0]}>
      {/* the deck, face down */}
      <Touchable reach={2.4} foley="paper" anchor={[0.34, 0.03, 0.05]} onUse={deal}>
        <group position={[0.34, 0, 0.05]}>
          <mesh position={[0, stackH / 2, 0]}><boxGeometry args={[0.13, stackH, 0.18]} /><meshStandardMaterial color="#e9dfca" roughness={0.9} /></mesh>
          <mesh position={[0, stackH + 0.0006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.13, 0.18]} />
            <meshStandardMaterial map={backTex} roughness={0.8} />
          </mesh>
        </group>
      </Touchable>
      {/* the stand: a little brass easel */}
      <mesh position={[0, 0.012, -0.02]} material={brass}><boxGeometry args={[0.3, 0.024, 0.08]} /></mesh>
      <mesh position={[0, 0.2, -0.07]} rotation={[-0.12, 0, 0]} material={brass}><boxGeometry args={[0.014, 0.4, 0.012]} /></mesh>
      <group position={[0, 0.02, 0]} rotation={[-0.1, 0, 0]}>
        {card && <DealtCard key={card.key + ':' + i} card={card} cast={cast} turned={turned} onTurn={() => setTurned((v) => !v)} />}
      </group>
      <TentCard pos={[-0.34, 0, 0.12]} ry={0.25} w={0.3}
        text={!card
          ? 'Who am I? The tavern game. Touch the deck to deal a card, then guess before you turn it.'
          : card.kind === 'guest'
            ? 'That was the last card. Touch the deck to shuffle and start over.'
            : 'Touch the deck for the next one.'} />
    </group>
  )
}

// ---------------------------------------------------------------- the hand
// A carved wooden hand on the bar. British three: index, middle, ring. German
// three: thumb, index, middle. Hicox used the wrong one.
const FINGERS = [
  // [z along the palm, length, british up?, german up?]
  { z: 0.033, len: 0.078, uk: true, de: true },   // index
  { z: 0.011, len: 0.086, uk: true, de: true },   // middle
  { z: -0.011, len: 0.08, uk: true, de: false },  // ring
  { z: -0.032, len: 0.064, uk: false, de: false }, // little
]

function Hand({ german, wood }) {
  const fingers = useRef([])
  const thumb = useRef()
  const t = useRef(0)
  useFrame((_, dt) => {
    t.current = THREE.MathUtils.damp(t.current, german ? 1 : 0, 9, dt)
    FINGERS.forEach((f, k) => {
      const g = fingers.current[k]
      if (!g) return
      const upUK = f.uk ? 0 : 1, upDE = f.de ? 0 : 1
      g.rotation.z = 2.7 * (upUK + (upDE - upUK) * t.current)
    })
    // the thumb: tucked over the little finger (British), out and up (German)
    if (thumb.current) {
      thumb.current.rotation.x = THREE.MathUtils.lerp(-1.25, 0.35, t.current)
      thumb.current.rotation.z = THREE.MathUtils.lerp(-0.9, 0, t.current)
    }
  })
  return (
    <group scale={3.2}>
      {/* the wrist, on a little plinth */}
      <mesh position={[0, 0.04, 0]} material={wood}><cylinderGeometry args={[0.03, 0.036, 0.08, 16]} /></mesh>
      {/* the palm, facing the room (+x) */}
      <mesh position={[0, 0.12, 0]} material={wood}><boxGeometry args={[0.03, 0.09, 0.088]} /></mesh>
      {FINGERS.map((f, k) => (
        <group key={k} position={[0.004, 0.165, f.z]} ref={(el) => (fingers.current[k] = el)}>
          <mesh position={[0, f.len / 2, 0]} material={wood}><capsuleGeometry args={[0.0095, f.len - 0.018, 4, 10]} /></mesh>
        </group>
      ))}
      <group ref={thumb} position={[0.006, 0.1, 0.046]}>
        <mesh position={[0, 0.035, 0]} material={wood}><capsuleGeometry args={[0.011, 0.046, 4, 10]} /></mesh>
      </group>
    </group>
  )
}

function ThreeFingers() {
  const [german, setGerman] = useState(false)
  const wood = useMemo(() => {
    // lit a little from within so the count reads from across the bar
    const w = standardMat({ kind: 'wood', tint: '#9a6a3a', wear: 0.2, seed: 'ib-hand', roughness: 0.55 }).clone()
    w.emissive = new THREE.Color('#6a3a18'); w.emissiveIntensity = 0.6
    return w
  }, [])
  useEffect(() => {
    window.__basterdsHand = (v) => setGerman(v == null ? (g) => !g : !!v)
    return () => { delete window.__basterdsHand }
  }, [])
  const flip = () => {
    setGerman((g) => !g)
    window.dispatchEvent(new CustomEvent('basterds:hush', { detail: { seconds: 2 } }))
  }
  return (
    <group position={[-18.2, Y + 1.1, -3.3]}>
      <mesh position={[0, 0.02, 0]}><boxGeometry args={[0.2, 0.04, 0.26]} /><meshStandardMaterial color="#231710" roughness={0.6} /></mesh>
      <Touchable reach={2.4} foley="tick" anchor={[0, 0.55, 0]} onUse={flip}>
        <group position={[0, 0.04, 0]}><Hand german={german} wood={wood} /></group>
      </Touchable>
      {/* three glasses of whisky, ordered with the wrong hand */}
      {[0, 1, 2].map((k) => (
        <group key={k} position={[0.12, 0.0, -0.3 - k * 0.1]}>
          <mesh position={[0, 0.045, 0]} material={glassMat}><cylinderGeometry args={[0.03, 0.026, 0.09, 16]} /></mesh>
          <mesh position={[0, 0.025, 0]} material={whisky}><cylinderGeometry args={[0.026, 0.023, 0.04, 16]} /></mesh>
        </group>
      ))}
      <TentCard pos={[0.16, 0, 0.36]} ry={Math.PI / 2 + 0.3} w={0.3}
        text={german
          ? 'The German three: thumb, index, middle. That is the one he should have used.'
          : 'Hicox ordered three glasses with the wrong three fingers. Germans count from the thumb. The table went quiet, and then everyone at it died.'} />
    </group>
  )
}

// ---------------------------------------------------------------- the shoe
// One high heel, half under the table. Its pair is on her seat upstairs.
export function Shoe({ pos, ry = 0, tilt = 0, scale = 1.5 }) {
  const patent = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8e1410', roughness: 0.28, metalness: 0.15, emissive: '#3a0604', emissiveIntensity: 0.5 }), [])
  const lining = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b7867a', roughness: 0.8 }), [])
  return (
    <group position={pos} rotation={[0, ry, tilt]} scale={scale}>
      {/* the sole, rising from toe to heel */}
      <mesh position={[0.02, 0.03, 0]} rotation={[0, 0, 0.42]} material={patent}><boxGeometry args={[0.15, 0.012, 0.062]} /></mesh>
      <mesh position={[-0.07, 0.008, 0]} material={patent}><boxGeometry args={[0.07, 0.014, 0.068]} /></mesh>
      {/* the vamp over the toes */}
      <mesh position={[-0.075, 0.024, 0]} scale={[1.25, 0.6, 0.95]} material={patent}><sphereGeometry args={[0.036, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      {/* the heel cup, open */}
      <mesh position={[0.075, 0.07, 0]} rotation={[0, 0, Math.PI / 2]} material={patent}><cylinderGeometry args={[0.034, 0.034, 0.03, 16, 1, true, 0, Math.PI]} /></mesh>
      <mesh position={[0.07, 0.062, 0]} rotation={[0, 0, 0.42]} material={lining}><boxGeometry args={[0.05, 0.004, 0.05]} /></mesh>
      {/* the stiletto */}
      <mesh position={[0.086, 0.028, 0]} material={patent}><cylinderGeometry args={[0.006, 0.004, 0.075, 8]} /></mesh>
    </group>
  )
}

function Napkin() {
  const tex = usePainted(512, 512, paintNapkin, [])
  return (
    <mesh position={[TABLE.x - 0.28, TOP + 0.002, TABLE.z + 1.3]} rotation={[-Math.PI / 2, 0, 1.2]}>
      <planeGeometry args={[0.2, 0.2]} />
      <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.25} roughness={0.95} />
    </mesh>
  )
}

// ---------------------------------------------------------------- the dressing
function Chair({ pos, ry, wood }) {
  return (
    <group position={pos} rotation={[0, ry, 0]}>
      <mesh position={[0, 0.45, 0]} material={wood}><boxGeometry args={[0.42, 0.04, 0.42]} /></mesh>
      {[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(([x, z], k) => (
        <mesh key={k} position={[x, 0.225, z]} material={wood}><boxGeometry args={[0.035, 0.45, 0.035]} /></mesh>
      ))}
      <mesh position={[0, 0.72, 0.19]} material={wood}><boxGeometry args={[0.42, 0.5, 0.035]} /></mesh>
    </group>
  )
}

function Bottles() {
  const ref = useRef()
  const spots = useMemo(() => {
    const out = []
    for (let s = 0; s < 3; s++) for (let k = 0; k < 16; k++) out.push([-18.86, Y + 1.36 + s * 0.42, -9.2 + k * 0.42 + (s % 2) * 0.13, 0.8 + ((k * 7 + s * 3) % 5) * 0.12])
    return out
  }, [])
  const colors = useMemo(() => spots.map((_, k) => new THREE.Color(['#4f7a3a', '#8a4a1e', '#2f5a42', '#b08a3a', '#6a2626'][k % 5])), [spots])
  useEffect(() => {
    const m = new THREE.Matrix4()
    spots.forEach(([x, y, z, s], k) => {
      m.makeScale(1, s, 1).setPosition(x, y + 0.14 * s, z)
      ref.current.setMatrixAt(k, m)
      ref.current.setColorAt(k, colors[k])
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [spots, colors])
  return (
    <instancedMesh ref={ref} args={[null, null, spots.length]} frustumCulled={false}>
      <cylinderGeometry args={[0.045, 0.05, 0.3, 12]} />
      <meshStandardMaterial roughness={0.12} metalness={0.1} />
    </instancedMesh>
  )
}

function Clock() {
  const face = usePainted(256, 256, paintClock, [])
  const hour = useRef(), minute = useRef()
  useFrame(({ clock }) => {
    // it keeps time, slowly: a minute hand you can watch move
    const m = clock.elapsedTime / 60
    if (minute.current) minute.current.rotation.z = -m * Math.PI * 2 - 1.2
    if (hour.current) hour.current.rotation.z = -m * Math.PI * 2 / 12 - 5.4
  })
  return (
    <group position={[-15.8, Y + 1.95, -10.9]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.24, 0.24, 0.05, 32]} /><meshStandardMaterial color="#2a1a10" roughness={0.5} /></mesh>
      <mesh position={[0, 0, 0.027]}>
        <circleGeometry args={[0.21, 32]} />
        <meshStandardMaterial map={face} emissiveMap={face} emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>
      <group ref={hour} position={[0, 0, 0.03]}><mesh position={[0, 0.05, 0]}><boxGeometry args={[0.014, 0.11, 0.004]} /><meshStandardMaterial color="#1b1612" /></mesh></group>
      <group ref={minute} position={[0, 0, 0.034]}><mesh position={[0, 0.075, 0]}><boxGeometry args={[0.009, 0.16, 0.004]} /><meshStandardMaterial color="#1b1612" /></mesh></group>
    </group>
  )
}

function Banner() {
  const tex = usePainted(1600, 360, paintBanner, [])
  return (
    <group position={[-17.75, Y + 2.02, -6]} rotation={[0, Math.PI / 2, 0]}>
      <mesh>
        <planeGeometry args={[3.4, 0.76]} />
        <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.3} transparent alphaTest={0.3} side={THREE.DoubleSide} roughness={0.95} />
      </mesh>
    </group>
  )
}

function WilhelmsTable({ cast, wood }) {
  const tex = usePainted(512, 720, (c) => paintSeatCard(c, {
    ...WILHELM, id: 'wilhelm', chapter: 4, tag: 'THE NEXT TABLE', object: 'a napkin for his son',
  }, cast), [cast])
  return (
    <group position={[-13.3, Y, -2.3]}>
      <mesh position={[0, 0.74, 0]} material={wood}><cylinderGeometry args={[0.5, 0.5, 0.05, 28]} /></mesh>
      <mesh position={[0, 0.37, 0]} material={wood}><cylinderGeometry args={[0.06, 0.2, 0.74, 12]} /></mesh>
      {/* a round, drunk: beer steins */}
      {[[-0.2, 0.1], [0.15, 0.2], [0.05, -0.2], [0.25, -0.05]].map(([x, z], k) => (
        <group key={k} position={[x, 0.765, z]}>
          <mesh position={[0, 0.07, 0]} material={glassMat}><cylinderGeometry args={[0.045, 0.045, 0.14, 14]} /></mesh>
          <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.041, 0.041, 0.09, 14]} /><meshStandardMaterial color="#c88a2a" emissive="#6a3a08" emissiveIntensity={0.35} roughness={0.2} /></mesh>
        </group>
      ))}
      <mesh position={[-0.05, 0.99, -0.22]} rotation={[0, 0.5, 0]}>
        <planeGeometry args={[0.3, 0.42]} />
        <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.42} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {[0, 1.6, 3.4].map((a) => <Chair key={a} pos={[Math.sin(a) * 0.72, 0, Math.cos(a) * 0.72]} ry={a + Math.PI} wood={wood} />)}
    </group>
  )
}

// ---------------------------------------------------------------- the room
// The alcove under the Box. The cellar was authored in its own frame (bar on
// the far west wall, the way in from the east); turned half round and moved,
// it sits in the arch with the bar on the alcove's back wall, facing the house.
export const CELLAR_FRAME = { x: -4, z: -27 }

export default function Cellar() {
  const data = useVaultData()
  const cast = data?.cast?.['inglourious-basterds'] || null
  const wood = useMemo(() => standardMat({ kind: 'wood', tint: '#3a2416', wear: 0.35, seed: 'ib-cellar-wood', roughness: 0.6 }), [])
  const dark = useMemo(() => standardMat({ kind: 'wood', tint: '#24160e', wear: 0.3, seed: 'ib-cellar-bar', roughness: 0.45 }), [])
  const plaster = useMemo(() => standardMat({ kind: 'plaster', tint: '#6a4a30', wear: 0.5, seed: 'ib-cellar-vault' }), [])
  return (
    <group position={[CELLAR_FRAME.x, BAR_Y - CELLAR_Y, CELLAR_FRAME.z]} rotation={[0, Math.PI, 0]}>
      {/* the long table, the one in the corner where the game was played */}
      <mesh position={[TABLE.x, TOP - 0.03, TABLE.z]} material={wood}><boxGeometry args={[TABLE.w, 0.06, TABLE.d]} /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], k) => (
        <mesh key={k} position={[TABLE.x + a * 0.5, Y + 0.38, TABLE.z + b * 1.9]} material={wood}><boxGeometry args={[0.07, 0.76, 0.07]} /></mesh>
      ))}
      {/* five chairs: Hicox, Wicki, Stiglitz and Bridget, and the one the major pulled up */}
      <Chair pos={[TABLE.x - 0.85, Y, TABLE.z - 1.3]} ry={-Math.PI / 2} wood={wood} />
      <Chair pos={[TABLE.x - 0.85, Y, TABLE.z]} ry={-Math.PI / 2} wood={wood} />
      <Chair pos={[TABLE.x - 0.85, Y, TABLE.z + 1.3]} ry={-Math.PI / 2 + 0.2} wood={wood} />
      <Chair pos={[TABLE.x, Y, TABLE.z - 2.55]} ry={Math.PI} wood={wood} />
      <Chair pos={[TABLE.x + 0.1, Y, TABLE.z + 2.6]} ry={0.35} wood={wood} />
      {/* the bar along the west wall, with its back shelf */}
      <mesh position={[-18.4, Y + 0.55, -6]} material={dark}><boxGeometry args={[0.8, 1.1, 7]} /></mesh>
      <mesh position={[-18.4, Y + 1.12, -6]} material={brass}><boxGeometry args={[0.86, 0.03, 7.06]} /></mesh>
      {[0, 1, 2].map((s) => <mesh key={s} position={[-18.86, Y + 1.34 + s * 0.42, -6]} material={dark}><boxGeometry args={[0.24, 0.03, 7]} /></mesh>)}
      <Bottles />
      {/* the vaulted ceiling's beams */}
      {[-1.6, -3.6, -5.6, -7.6, -9.6].map((z) => (
        <mesh key={z} position={[-15.8, Y + 2.36, z]} material={plaster}><boxGeometry args={[6.4, 0.26, 0.24]} /></mesh>
      ))}
      {/* the lamp over the table */}
      <mesh position={[TABLE.x, Y + 2.1, TABLE.z]} material={brass}><cylinderGeometry args={[0.02, 0.24, 0.18, 20, 1, true]} /></mesh>
      <mesh position={[TABLE.x, Y + 2.02, TABLE.z]} material={bulbMat}><sphereGeometry args={[0.05, 12, 10]} /></mesh>
      <mesh position={[TABLE.x, Y + 2.3, TABLE.z]} material={brass}><cylinderGeometry args={[0.006, 0.006, 0.36, 6]} /></mesh>

      <Banner />
      <Clock />
      <WhoAmI cast={cast} />
      <ThreeFingers />
      <Napkin />
      <Shoe pos={[TABLE.x + 0.45, Y, TABLE.z + 1.75]} ry={2.0} />
      <TentCard pos={[TABLE.x + 0.85, Y, TABLE.z + 1.95]} ry={Math.PI / 2 - 0.2} w={0.26}
        text="She lost it getting out. Landa finds it. Her seat upstairs, chapter four's row, has the other one." />
      <WilhelmsTable cast={cast} wood={wood} />
    </group>
  )
}
