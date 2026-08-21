import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Prop, footprint } from './props.jsx'
import { System, SYSTEMS } from './systems/index.jsx'
import InfoSurfaces from './InfoSurfaces.jsx'
import DoorRow from './DoorRow.jsx'
import { registerColliders, setBounds, clearOwner, resolveStep } from './colliders.js'

// The one room. Every Tier-2 (and Tier-1-stand-in) slug renders through
// here: shell + props + systems + lighting, all driven by config (Wave B
// spec: "family is a preset, not a component"). families/Default.jsx stays
// as the safety net for any slug that never gets a CONFIGS entry.

/* --------------------------------------------------------------- surfaces */

const matCache = new Map()
function wallCanvas(kind, tint) {
  const key = kind + '|' + tint
  if (matCache.has(key)) return matCache.get(key)
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  let s = (kind.length * 977 + tint.charCodeAt(1)) >>> 0
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, S, S)
  if (kind === 'plaster') {
    ctx.globalAlpha = 0.06
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = r() > 0.5 ? '#fff' : '#000'
      ctx.fillRect(r() * S, r() * S, 2, 2)
    }
    ctx.globalAlpha = 1
  } else if (kind === 'steel') {
    ctx.globalAlpha = 0.08
    for (let y = 0; y < S; y += 6) {
      ctx.fillStyle = r() > 0.5 ? '#fff' : '#000'
      ctx.fillRect(0, y, S, 1)
    }
    ctx.globalAlpha = 1
  } else if (kind === 'wood') {
    ctx.globalAlpha = 0.14
    for (let x = 0; x < S; x += 3) {
      ctx.strokeStyle = r() > 0.5 ? '#000' : '#3a2a18'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + Math.sin(x * 0.05) * 6, 0)
      ctx.lineTo(x + Math.sin(x * 0.05 + 3) * 6, S)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  } else {
    // 'flat': faint noise only, still reads as a surface not a swatch
    ctx.globalAlpha = 0.035
    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = r() > 0.5 ? '#fff' : '#000'
      ctx.fillRect(r() * S, r() * S, 1.6, 1.6)
    }
    ctx.globalAlpha = 1
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  matCache.set(key, tex)
  return tex
}

function skyCanvas(top, bottom) {
  const key = 'sky|' + top + '|' + bottom
  if (matCache.has(key)) return matCache.get(key)
  const S = 512
  const c = document.createElement('canvas')
  c.width = 2
  c.height = S
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, S)
  g.addColorStop(0, top)
  g.addColorStop(1, bottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 2, S)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  matCache.set(key, tex)
  return tex
}

/* ------------------------------------------------------------------ shell */

function BoxShell({ grade, p }) {
  const w = p.w ?? 5, d = p.d ?? 5, h = p.h ?? 2.8
  const tex = useMemo(() => wallCanvas(p.wallMat || 'flat', grade.fill), [p.wallMat, grade.fill])
  const floorTex = useMemo(() => wallCanvas('flat', grade.bg), [grade.bg])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={floorTex} roughness={0.92} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, h, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={floorTex} roughness={0.96} />
      </mesh>
      <mesh position={[0, h / 2, -d / 2]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} roughness={0.88} />
      </mesh>
      <mesh position={[0, h / 2, d / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} roughness={0.88} />
      </mesh>
      <mesh position={[-w / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[d, h]} />
        <meshStandardMaterial map={tex} roughness={0.88} />
      </mesh>
      <mesh position={[w / 2, h / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[d, h]} />
        <meshStandardMaterial map={tex} roughness={0.88} />
      </mesh>
      {p.window && (
        <mesh position={[w / 2 - 0.01, h * 0.55, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[Math.min(d * 0.7, 3), h * 0.5]} />
          <meshBasicMaterial color={grade.key} transparent opacity={0.4} />
        </mesh>
      )}
      {p.doorGap && (
        <mesh position={[0, 0.9, d / 2 - 0.02]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[1, 1.8]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  )
}

function OpenShell({ grade, p }) {
  const groundTex = useMemo(() => wallCanvas(p.ground === 'grass' ? 'plaster' : 'steel', p.groundColor || '#1a1a1c'), [p.ground, p.groundColor])
  const sky = useMemo(() => skyCanvas(p.skyTop || grade.fogColor, p.skyBottom || grade.bg), [p.skyTop, p.skyBottom, grade.fogColor, grade.bg])
  const cityCount = p.distantCity ? (typeof p.distantCity === 'number' ? p.distantCity : 26) : 0
  const cityBoxes = useMemo(() => Array.from({ length: cityCount }, (_, i) => ({
    x: (Math.sin(i * 12.9898) * 0.5 + 0.5 - 0.5) * 60,
    z: -18 - (i % 6) * 6,
    h: 2 + (i % 7) * 1.4,
    w: 1.4 + (i % 3) * 0.6,
  })), [cityCount])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[40, 48]} />
        <meshStandardMaterial map={groundTex} roughness={0.95} />
      </mesh>
      <mesh rotation={[0, 0, 0]} position={[0, 0, -35]}>
        <sphereGeometry args={[80, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
        <meshBasicMaterial map={sky} side={THREE.BackSide} fog={false} />
      </mesh>
      {p.horizon && (
        <mesh rotation={[0, 0, 0]} position={[0, 1.2, -34]}>
          <planeGeometry args={[70, 2.4]} />
          <meshBasicMaterial color={grade.key} transparent opacity={0.22} />
        </mesh>
      )}
      {cityBoxes.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial color="#0d0d10" emissive={grade.key} emissiveIntensity={0.12} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

function CorridorShell({ grade, p }) {
  const len = p.length ?? 14, width = p.width ?? 2.6, h = p.height ?? 2.6
  const tex = useMemo(() => wallCanvas('steel', p.wallTint || grade.bg), [p.wallTint, grade.bg])
  const ribCount = p.ribs ?? 8
  const ribs = useMemo(() => Array.from({ length: ribCount }, (_, i) => -1 - (i / ribCount) * len), [ribCount, len])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -len / 2]}>
        <planeGeometry args={[width, len]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, h, -len / 2]}>
        <planeGeometry args={[width, len]} />
        <meshStandardMaterial map={tex} roughness={0.95} />
      </mesh>
      <mesh position={[-width / 2, h / 2, -len / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[len, h]} />
        <meshStandardMaterial map={tex} roughness={0.88} />
      </mesh>
      <mesh position={[width / 2, h / 2, -len / 2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[len, h]} />
        <meshStandardMaterial map={tex} roughness={0.88} />
      </mesh>
      {/* QA sweep 2026-08-21: these were a single solid box spanning the
          FULL width and height of the corridor — every rib was a wall
          plugging the tunnel outright, so the camera (sitting just inside
          the mouth) could only ever see the front face of the nearest one.
          That's what was reading as a black/one-color void in sicario,
          tdkr and batman: not a lighting bug, there was just a wall there.
          An open frame (two side struts + a top beam, no floor-level bar)
          reads as the same repeating structural rib without blocking the
          view down the shaft. */}
      {ribs.map((z, i) => (
        <group key={i} position={[0, 0, z]}>
          <mesh position={[-width / 2 - 0.03, h / 2, 0]}>
            <boxGeometry args={[0.1, h, 0.06]} />
            <meshStandardMaterial color="#151517" roughness={0.7} />
          </mesh>
          <mesh position={[width / 2 + 0.03, h / 2, 0]}>
            <boxGeometry args={[0.1, h, 0.06]} />
            <meshStandardMaterial color="#151517" roughness={0.7} />
          </mesh>
          <mesh position={[0, h - 0.05, 0]}>
            <boxGeometry args={[width + 0.16, 0.1, 0.06]} />
            <meshStandardMaterial color="#151517" roughness={0.7} />
          </mesh>
        </group>
      ))}
      {p.farLight !== false && (
        <mesh position={[0, h * 0.5, -len + 0.2]}>
          <planeGeometry args={[width * 0.8, h * 0.7]} />
          <meshBasicMaterial color={grade.key} transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  )
}

function DeckShell({ grade, p }) {
  const len = p.length ?? 10, width = p.width ?? 5
  const floorTex = useMemo(() => wallCanvas('steel', p.floorTint || '#2a2c2e'), [p.floorTint])
  // A backdrop sphere behind the fog wall, same as OpenShell — without it
  // the raw scene background bleeds straight through above the railing,
  // and that color is the film's card-front palette (often warm/bright),
  // not this room's own night grade.
  const sky = useMemo(() => skyCanvas(p.skyTop || grade.fogColor, p.skyBottom || grade.bg), [p.skyTop, p.skyBottom, grade.fogColor, grade.bg])
  return (
    <group>
      <mesh rotation={[0, 0, 0]} position={[0, 0, -len / 2 - 10]}>
        <sphereGeometry args={[40, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.6]} />
        <meshBasicMaterial map={sky} side={THREE.BackSide} fog={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, len]} />
        <meshStandardMaterial map={floorTex} roughness={0.85} metalness={0.1} />
      </mesh>
      {p.railing !== false && [-1, 1].map((side) => (
        <mesh key={side} position={[side * width / 2, 0.55, 0]}>
          <boxGeometry args={[0.06, 1.1, len]} />
          <meshStandardMaterial color="#1c1e20" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
      {p.fogWall !== false && (
        <mesh position={[0, 2, -len / 2 - 1]}>
          <planeGeometry args={[width + 6, 8]} />
          <meshBasicMaterial color={grade.fogColor} transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  )
}

const SHELLS = { box: BoxShell, open: OpenShell, corridor: CorridorShell, deck: DeckShell }

/* ------------------------------------------------------- shell colliders */
// Wave M1: one collider builder per shell, mirroring each Shell component's
// own geometry above closely enough that "where the walls are drawn" and
// "where the walker stops" never drift apart. Kept in this file (not
// colliders.js, which stays a generic leaf) because it reads SHELLS-shaped
// params directly.

const WALL_T = 0.15

function boxShellColliders(p) {
  const w = p.w ?? 5, d = p.d ?? 5
  const rects = [
    // north / south (the ±Z walls)
    { minX: -w / 2, maxX: w / 2, minZ: -d / 2 - WALL_T, maxZ: -d / 2 },
    // west / east (the ±X walls)
    { minX: -w / 2 - WALL_T, maxX: -w / 2, minZ: -d / 2, maxZ: d / 2 },
    { minX: w / 2, maxX: w / 2 + WALL_T, minZ: -d / 2, maxZ: d / 2 },
  ]
  if (p.doorGap) {
    // the south wall (z = +d/2) carries the gap — BoxShell only ever draws
    // it there (see BoxShell's own doorGap mesh above). Split into the two
    // segments flanking the ~1m opening rather than one solid rect.
    rects.push(
      { minX: -w / 2, maxX: -0.5, minZ: d / 2, maxZ: d / 2 + WALL_T },
      { minX: 0.5, maxX: w / 2, minZ: d / 2, maxZ: d / 2 + WALL_T },
    )
  } else {
    rects.push({ minX: -w / 2, maxX: w / 2, minZ: d / 2, maxZ: d / 2 + WALL_T })
  }
  const bounds = { kind: 'rect', minX: -w / 2 + 0.05, maxX: w / 2 - 0.05, minZ: -d / 2 + 0.05, maxZ: d / 2 - 0.05 }
  return { rects, bounds }
}

function corridorShellColliders(p) {
  const len = p.length ?? 14, width = p.width ?? 2.6
  const rects = [
    { minX: -width / 2 - WALL_T, maxX: -width / 2, minZ: -len, maxZ: 0 },
    { minX: width / 2, maxX: width / 2 + WALL_T, minZ: -len, maxZ: 0 },
    // far end; entry end (z=0) stays open
    { minX: -width / 2, maxX: width / 2, minZ: -len - WALL_T, maxZ: -len },
  ]
  const bounds = { kind: 'rect', minX: -width / 2 + 0.05, maxX: width / 2 - 0.05, minZ: -len + 0.05, maxZ: 1 }
  return { rects, bounds }
}

function deckShellColliders(p) {
  const len = p.length ?? 10, width = p.width ?? 5
  const rects = []
  if (p.railing !== false) {
    rects.push(
      { minX: -width / 2 - 0.06, maxX: -width / 2, minZ: -len / 2, maxZ: len / 2 },
      { minX: width / 2, maxX: width / 2 + 0.06, minZ: -len / 2, maxZ: len / 2 },
    )
  }
  if (p.fogWall !== false) {
    rects.push({ minX: -width / 2 - 3, maxX: width / 2 + 3, minZ: -len / 2 - 1.1, maxZ: -len / 2 - 0.9 })
  }
  const bounds = { kind: 'rect', minX: -width / 2 + 0.05, maxX: width / 2 - 0.05, minZ: -len / 2 + 0.05, maxZ: len / 2 - 0.05 }
  return { rects, bounds }
}

// open shell has no walls to walk into — just the horizon kept out of reach.
function openShellColliders() {
  return { rects: [], bounds: { kind: 'circle', cx: 0, cz: 0, r: 34 } }
}

function shellColliders(shell, p) {
  if (shell === 'box') return boxShellColliders(p)
  if (shell === 'corridor') return corridorShellColliders(p)
  if (shell === 'deck') return deckShellColliders(p)
  return openShellColliders()
}

/* -------------------------------------------------------------- door row */

// Bloodline doors (brief §6) get a sane default mount per shell type — not a
// per-config collision check against every prop in every one of Tier 2's 25
// configs, just a wall edge the shell's own typical staging tends to leave
// clear (props.jsx placements cluster toward the shell's -Z "front" wall,
// where InfoSurfaces' hot-take/score/meta trio already lives — see
// InfoSurfaces.jsx's own defaults). A bespoke room (Memento/Departed/Baby
// Driver) never calls this; it hand-picks its own mount instead.
function defaultDoorMount(place) {
  const shell = place.shell || 'box'
  const p = place.shellParams || {}
  if (shell === 'corridor') {
    // near the mouth, not deep in the shaft — CorridorShell's ribs start
    // right at the entry, so the doors sit just outside the tunnel's own
    // footprint, on the side wall nearest the camera's starting station.
    const width = p.width ?? 2.6
    return { position: [width / 2 + 0.55, 0, 0.4], rotationY: -Math.PI / 2, spacing: 0.85, scale: 0.85 }
  }
  if (shell === 'deck') {
    // the near rail-end, behind where the camera usually stands, rather
    // than out past the fog wall where DeckShell's own far dressing sits.
    const len = p.length ?? 10
    return { position: [0, 0, len / 2 - 1.2], rotationY: Math.PI, spacing: 1.05 }
  }
  if (shell === 'open') {
    // no walls to hang a door on — a standing frame a few meters out,
    // facing back toward the room's own entry station.
    return { position: [0, 0, 5.5], rotationY: Math.PI, spacing: 1.5 }
  }
  // box (default): the right wall — InfoSurfaces' own record (hot take,
  // score, meta) lives on the -Z front wall by default, so the doors take
  // the side wall instead, nudged toward the camera side of the room.
  const w = p.w ?? 5, d = p.d ?? 5
  return { position: [w / 2 - 0.04, 0, d * 0.14], rotationY: -Math.PI / 2, spacing: 1.0 }
}

/* ------------------------------------------------------------------- room */

// InfoComponent: Wave C's shoebox print rooms reuse this whole engine but
// need their own diegetic record (pencil score + snap/note, no hot take, no
// vibe chips — a print never carries either) instead of the Ledger's
// InfoSurfaces. Defaults to InfoSurfaces so every existing Ledger config is
// untouched; archive/FadedRoom.jsx is the only caller that overrides it.
export default function GenericRoom({ film, config, infoVisible, InfoComponent = InfoSurfaces, doors = [], onDoor }) {
  const { grade } = config
  const place = config.place || {}
  const Shell = SHELLS[place.shell] || SHELLS.box
  const props = place.props || []
  const systems = place.systems || []
  const doorMount = useMemo(() => defaultDoorMount(place), [place])

  // Wave M1: auto-colliders. One owner per room instance (film.slug is
  // stable for the room's lifetime; falls back to a constant so a caller
  // without a slug — none today — still registers under a fixed id rather
  // than silently registering nothing). Effect is keyed on `config` per the
  // spec: a config swap (a new slug) is exactly when the shell/props change.
  useEffect(() => {
    const ownerId = 'room:' + (film?.slug ?? 'generic')
    const shell = place.shell || 'box'
    const { rects: shellRects, bounds } = shellColliders(shell, place.shellParams || {})
    const propRects = props.flatMap((pp) => {
      const local = footprint(pp)
      // footprint() already reads pp.pos/pp.rot itself (world-space rects,
      // no extra transform needed — props sit in the same local group as
      // the shell, which is the walker's own coordinate frame).
      return local
    })
    registerColliders(ownerId, [...shellRects, ...propRects])
    setBounds(ownerId, bounds)

    if (import.meta.env.DEV) {
      const spawn = config.camera?.pos
      if (spawn) {
        const [sx, , sz] = spawn
        const probes = [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]
        const stuck = probes.every(([dx, dz]) => {
          const r = resolveStep(sx, sz, dx, dz, 0.28)
          return Math.hypot(r.x - sx, r.z - sz) < 0.02
        })
        if (stuck) {
          // eslint-disable-next-line no-console
          console.warn('[colliders] spawn point for "%s" looks boxed in by its own colliders', ownerId)
        }
      }
    }

    return () => clearOwner(ownerId)
  }, [config, film?.slug, place, props])

  // Duplicates and Assembler are the two systems that WRAP content (the
  // spec's own wording — "renders children twice", "props fly in ... becoming
  // complete") rather than sit beside it like a particle effect. A config
  // marks one with `wrapsProps: true` and it wraps the whole prop list;
  // everything else in `systems` renders as a sibling, unchanged.
  const wrapSystems = systems.filter((s) => s.wrapsProps && SYSTEMS[s.type])
  const flatSystems = systems.filter((s) => !(s.wrapsProps && SYSTEMS[s.type]))
  const keyLightRef = useRef()

  let propsNode = (
    <>
      {props.map((pp, i) => <Prop key={i} {...pp} />)}
    </>
  )
  wrapSystems.forEach((sys, i) => {
    const Comp = SYSTEMS[sys.type]
    propsNode = <Comp key={'wrap' + i} {...sys}>{propsNode}</Comp>
  })

  return (
    <group>
      {/* fogExp2, not linear fog: grade.fogDensity is authored as a small
          "0-1ish" coefficient (configs.js / presets.js), which is exactly
          what FogExp2 wants — a linear near/far pair computed from that same
          number was crushing every room to black a few meters out. */}
      <fogExp2 attach="fog" args={[grade.fogColor, grade.fogDensity ?? 0.045]} />

      {/* configs.js/presets.js keyIntensity values were transcribed at
          Default.jsx's "developing memory" scale (~2.4) — fine for that
          room's deliberately underlit void, but this renderer's physically-
          based lighting needs much bigger raw numbers to read as LIT at a
          staged room's typical 1.5-3m throw (verified empirically: 3.2x
          was still a near-black void, 200x blew out to solid white, ~28x is
          the readable middle). Scaled up here so config authors still only
          ever tune the one keyIntensity number.

          QA sweep 2026-08-21: 28x still blew multiple rooms to a solid
          color wash (memento, enemy, stby, exmachina, niceguys, poorthings,
          br2049) — the hot take sheet sits at a near-fixed default position
          only ~1m from this light in most configs, well inside the range
          where inverse-square falloff makes the 28x multiplier read as a
          flashbulb rather than a key light, and Bloom's mipmapBlur then
          smears that hotspot across the whole wall. Backed off to 16x/4x
          and pulled the key up-and-back slightly so it clears a typical
          ~2.5-2.8m box ceiling instead of sitting 0.2-0.3m under it (the
          same ceiling-hotspot bloom source in the box-shell rooms above).

          QA sweep 2026-08-21, round 2: tried pushing corridor/deck keys
          deeper down the shaft (z=-3) so they'd clear the camera — that
          instead dropped sicario/tdkr/batman to total black, and br2049
          (also a "deep" shell) was fine either way, so the win wasn't
          worth chasing further this pass. Reverted to the single fixed
          position; the three corridor rooms that ran too close to it now
          carry their own lower keyIntensity in configs.js instead. */}
      <pointLight ref={keyLightRef} position={[0, 2.0, -0.7]} intensity={(grade.keyIntensity ?? 2.2) * 16} color={grade.key} distance={16} decay={2} />
      <pointLight position={[0, 1.2, 2]} intensity={(grade.keyIntensity ?? 2.2) * 4} color={grade.fill} distance={12} decay={2} />

      <Shell grade={grade} p={place.shellParams || {}} />

      {propsNode}

      {flatSystems.map((sys, i) => (
        <System key={i} {...sys} lightRef={sys.type === 'PulseBeat' ? keyLightRef : undefined} />
      ))}

      <InfoComponent film={film} config={config} visible={infoVisible} />

      <DoorRow
        doors={doors}
        position={doorMount.position}
        rotationY={doorMount.rotationY}
        spacing={doorMount.spacing}
        scale={doorMount.scale}
        grade={grade}
        onDoor={onDoor}
      />
    </group>
  )
}
