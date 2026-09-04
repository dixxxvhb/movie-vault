import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Touchable from './Touchable.jsx'
import { toggleHouse, houseLevel, houseTarget } from './houseLights.js'

// The motel that every film room is dressed over, plus the switch that shows
// it to you.
//
// Fixtures are IDENTICAL in every room and in the same place in every room.
// That is the whole point: after two rooms you know where the switch is
// without looking, and the fourth time you walk into a completely different
// film and find the same bent blinds and the same rattling wall unit, the
// building has told you something no label could. Sicario's border room has
// the blinds. Blade Runner's sea wall has the air conditioner. Memento is the
// joke, because Memento already is the room.
//
// Everything here is built from primitives and shares three materials, so the
// whole motel layer costs about six draw calls on top of whatever the film
// brought with it.

const SWITCH_H = 1.24          // light switches are 48 inches off the floor
const PLATE_W = 0.075
const PLATE_H = 0.12

// Where the switch and the fixtures go, derived from the shell rather than
// authored per room. Two reasons this is not a per-room config field. First,
// the whole mechanic depends on the switch being in the same place in every
// room, and a config field is an invitation to move it. Second, it has to work
// for film 48 without anybody opening an editor.
//
// The rule: the switch is on the wall BEHIND where you come in, at shoulder
// height, one hand's reach to the right of the spawn point, exactly where your
// hand goes when you walk into a dark room. The window is the wall on your
// left, the air conditioner under it, the pad on the right-hand wall.
export function motelAnchorsFor(shell, params, camera) {
  const spawn = camera?.pos || [0, 1.5, 1.4]
  const w = params.w ?? 4.2
  const d = params.d ?? 4.2

  if (shell === 'open' || shell === 'deck') {
    // No walls to put a switch on, so it stands on a conduit stub near the
    // spawn: a light switch on a pole in an open field, which is exactly the
    // sort of thing that is in a film's world and not in a motel's, and reads
    // as deliberate rather than as a bug.
    return {
      switch: [spawn[0] + 0.55, spawn[2] - 0.5, Math.PI],
    }
  }

  if (shell === 'corridor') {
    const halfW = (params.w ?? 2.4) / 2
    return {
      switch: [halfW - 0.06, spawn[2] - 0.35, -Math.PI / 2],
      ac: [-halfW + 0.13, 1.95, spawn[2] - 1.6, Math.PI / 2],
    }
  }

  // box: the common case
  const hw = w / 2
  const hd = d / 2
  const h = params.h ?? 2.4
  const backZ = spawn[2] > 0 ? hd : -hd     // the wall you came in through
  const facing = spawn[2] > 0 ? Math.PI : 0 // the switch faces into the room
  return {
    // The fixture the switch actually operates. Slightly off-centre, because
    // a motel ceiling light is never in the middle of the room.
    fixture: [0.18, h - 0.09, -0.12],
    switch: [Math.min(hw - 0.25, spawn[0] + 0.62), backZ - Math.sign(backZ) * 0.055, facing],
    // window on the left-hand wall, blinds hung inside it
    window: [-hw + 0.07, 1.62, 0, Math.PI / 2, Math.min(1.25, d * 0.32), 0.82],
    // the wall unit sits under the window, because it always does
    ac: [-hw + 0.14, 0.72, 0, Math.PI / 2],
    // the pad on the right-hand wall side, on a surface at bedside height
    pad: [hw - 0.42, 0.58, -hd + 0.55, 0.24],
  }
}

// ------------------------------------------------------------------ the switch
function Switch({ x, z, ry }) {
  const toggleRef = useRef()
  const glow = useRef()

  useFrame(() => {
    // The toggle physically flips. It is a 3mm rotation on a 2cm rocker and it
    // is the single most satisfying thing in the room, so it gets its own
    // damped value rather than snapping with the grade.
    const t = houseLevel()
    if (toggleRef.current) toggleRef.current.rotation.x = -0.42 + t * 0.84
    if (glow.current) {
      // the plate catches a little of whatever light is currently winning
      glow.current.material.emissiveIntensity = 0.05 + t * 0.16
    }
  })

  return (
    <group position={[x, SWITCH_H, z]} rotation={[0, ry, 0]}>
      <Touchable onUse={toggleHouse} reach={2.2} foley="switch" anchor={[0, 0, 0]}>
        {/* the plate */}
        <mesh ref={glow} position={[0, 0, 0.008]}>
          <boxGeometry args={[PLATE_W, PLATE_H, 0.006]} />
          <meshStandardMaterial
            color="#DCD3C4" roughness={0.62} metalness={0}
            emissive="#DCD3C4" emissiveIntensity={0.05}
          />
        </mesh>
        {/* the rocker */}
        <mesh ref={toggleRef} position={[0, 0, 0.016]}>
          <boxGeometry args={[0.022, 0.042, 0.014]} />
          <meshStandardMaterial color="#E6DED0" roughness={0.5} />
        </mesh>
        {/* the two screws, because a switch plate has two screws and their
            absence is the kind of thing you notice without noticing */}
        {[0.042, -0.042].map((y) => (
          <mesh key={y} position={[0, y, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 0.004, 8]} />
            <meshStandardMaterial color="#9C9484" roughness={0.5} metalness={0.6} />
          </mesh>
        ))}
      </Touchable>
    </group>
  )
}

// ------------------------------------------------------------------- fixtures
//
// All of these fade in with the house level. They exist in the film state too,
// unlit and unnoticed, because a room where furniture pops into being when you
// flick a switch is a menu, not a room. What changes is that the film's own
// rig was never pointing at them.

function Blinds({ x, y, z, ry, w, h, mat }) {
  // Bent. One slat in the middle is pushed out of line, which is what happens
  // to every motel blind that anyone has ever looked through.
  const slats = useMemo(() => {
    const n = Math.max(6, Math.floor(h / 0.055))
    return Array.from({ length: n }, (_, i) => {
      const bent = i === Math.floor(n * 0.42)
      return {
        y: h / 2 - (i + 0.5) * (h / n),
        tilt: bent ? 0.55 : 0.16 + (i % 3) * 0.012,
        z: bent ? 0.014 : 0,
      }
    })
  }, [h])

  return (
    <group position={[x, y, z]} rotation={[0, ry, 0]}>
      {slats.map((s, i) => (
        <mesh key={i} position={[0, s.y, s.z]} rotation={[s.tilt, 0, 0]} material={mat}>
          <boxGeometry args={[w, h / slats.length * 0.86, 0.004]} />
        </mesh>
      ))}
    </group>
  )
}

function WallUnit({ x, y, z, ry, mat, grillMat }) {
  // The air conditioner. It rattles. The rattle is the room's pulse in the
  // motel state and it is the only moving thing in here.
  const shell = useRef()
  useFrame(({ clock }) => {
    if (!shell.current) return
    const t = houseLevel()
    // a 9Hz buzz at a half-millimetre. Below the flash policy's concern (this
    // is translation, not luminance) and almost subliminal, which is right:
    // you feel a wall unit before you see it.
    shell.current.position.y = y + Math.sin(clock.elapsedTime * 9.1) * 0.0006 * t
  })
  return (
    <group ref={shell} position={[x, y, z]} rotation={[0, ry, 0]}>
      <mesh material={mat}>
        <boxGeometry args={[0.62, 0.36, 0.24]} />
      </mesh>
      {/* the grille, four bars */}
      {[-0.09, -0.03, 0.03, 0.09].map((gy) => (
        <mesh key={gy} position={[0, gy, 0.126]} material={grillMat}>
          <boxGeometry args={[0.5, 0.028, 0.006]} />
        </mesh>
      ))}
    </group>
  )
}

function CeilingFixture({ x, y, z }) {
  // The thing the switch actually operates, and the reason the motel state
  // reads as LIT rather than as a colour filter. A grade blend alone made the
  // room merely grey; a room needs a source. This is a dome of yellowed
  // plastic with a dead bulb's worth of dust in it, throwing hard shadows
  // straight down because that is what a single ceiling fixture does and it is
  // the least flattering light in the world.
  const lamp = useRef()
  const dome = useRef()
  useFrame(() => {
    const t = houseLevel()
    // GenericRoom scales its own authored keyIntensity by ~28x to read as LIT
    // at a staged room's 1.5-3m throw (its own comment, found empirically).
    // A fixture on the same scale has to be in the same units or it reads as
    // a nightlight.
    if (lamp.current) lamp.current.intensity = t * 62
    if (dome.current) {
      dome.current.material.emissiveIntensity = 0.05 + t * 2.6
      dome.current.material.opacity = 0.25 + t * 0.7
    }
  })
  return (
    <group position={[x, y, z]}>
      <pointLight
        ref={lamp} intensity={0} color="#FFEFC8"
        distance={7.5} decay={2} position={[0, -0.06, 0]}
      />
      <mesh ref={dome} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[0.13, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
        <meshStandardMaterial
          color="#EDDFB8" emissive="#FFEDC4" emissiveIntensity={0.05}
          roughness={0.85} transparent opacity={0.25} side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.02, 12]} />
        <meshStandardMaterial color="#C9C0AE" roughness={0.7} />
      </mesh>
    </group>
  )
}

function PadByThePhone({ x, y, z, ry, paperMat, penMat }) {
  // A motel notepad and a pen. In the film state it is a blank rectangle on a
  // surface. In the motel state it is where the night's note would go, and in
  // a room whose film he actually wrote something on, it carries it.
  return (
    <group position={[x, y, z]} rotation={[-Math.PI / 2, 0, ry]}>
      <mesh material={paperMat}>
        <boxGeometry args={[0.105, 0.148, 0.004]} />
      </mesh>
      <mesh position={[0.072, -0.02, 0.004]} rotation={[0, 0, -0.36]} material={penMat}>
        <cylinderGeometry args={[0.0035, 0.0035, 0.12, 6]} />
      </mesh>
    </group>
  )
}

// ------------------------------------------------------------------- the layer
export default function MotelUnderneath({ shell, anchors }) {
  const group = useRef()

  // Three shared materials for the whole layer. Cloned per mount because their
  // opacity is animated and a shared instance would leak the fade between
  // rooms.
  const mats = useMemo(() => {
    const make = (color, roughness, extra = {}) =>
      new THREE.MeshStandardMaterial({
        color, roughness, metalness: 0, transparent: true, opacity: 0, ...extra,
      })
    return {
      plastic: make('#D8D0BE', 0.72),
      metal: make('#8E8779', 0.42, { metalness: 0.5 }),
      paper: make('#EFE8D6', 0.9),
      pen: make('#2A2723', 0.5),
    }
  }, [])

  useFrame(() => {
    const t = houseLevel()
    // Fixtures do not appear, they become visible. Opacity rides the house
    // level with a slight lead so the room feels like it is being revealed
    // rather than assembled.
    const o = Math.min(1, t * 1.25)
    mats.plastic.opacity = o
    mats.metal.opacity = o
    mats.paper.opacity = o
    mats.pen.opacity = o
    if (group.current) group.current.visible = t > 0.004
  })

  const a = anchors || {}

  return (
    <>
      {/* The switch is NEVER hidden. It is the one thing that has to be
          findable in the film state, because it is how you learn the room has
          another one. */}
      <Switch x={a.switch?.[0] ?? 0} z={a.switch?.[1] ?? 0} ry={a.switch?.[2] ?? 0} />

      {/* The fixture is outside the faded group because its own light and
          emissive ride the level directly. A lamp that fades its opacity is a
          lamp made of glass; a lamp that fades its output is a lamp. */}
      {a.fixture && <CeilingFixture x={a.fixture[0]} y={a.fixture[1]} z={a.fixture[2]} />}

      <group ref={group} visible={false}>
        {a.window && (
          <Blinds
            x={a.window[0]} y={a.window[1]} z={a.window[2]} ry={a.window[3]}
            w={a.window[4] ?? 1.1} h={a.window[5] ?? 0.85} mat={mats.plastic}
          />
        )}
        {a.ac && (
          <WallUnit
            x={a.ac[0]} y={a.ac[1]} z={a.ac[2]} ry={a.ac[3]}
            mat={mats.plastic} grillMat={mats.metal}
          />
        )}
        {a.pad && (
          <PadByThePhone
            x={a.pad[0]} y={a.pad[1]} z={a.pad[2]} ry={a.pad[3] ?? 0}
            paperMat={mats.paper} penMat={mats.pen}
          />
        )}
      </group>
    </>
  )
}
