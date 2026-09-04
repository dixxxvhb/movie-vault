// THE HOUSE LIGHTS.
//
// Every film room in the Vault is, underneath, still a motel room. The film is
// dressed over it. There is a switch by the door, in the same place in every
// room, and flicking it drains the movie out and brings the motel back:
// the same walls, but lit by a bad overhead fixture instead of by a
// cinematographer, with the blinds and the wall air conditioner and the pad by
// the phone that were always there and that the film's own lighting hid.
//
// Why this is the mechanic worth building first. The measured problem with the
// rooms is not fidelity, it is that a room shows you everything it has from the
// doorway, so walking reveals nothing that standing did not. Concealment is the
// missing ingredient. One switch gives every room in the game a second complete
// state at the cost of zero new geometry, because half the writing is only
// legible in one of them. It doubles the content of forty-seven rooms with a
// light switch.
//
// The transform is deliberately the same shape as the archive's develop bloom
// (useRoomDevelop.js), which is already an invertible interpolation between two
// grades over one shared config. That one runs once and never reverts, because
// certifying is permanent. This one is a switch, so it runs both ways forever.
//
// Module-level bus rather than context, for the same reason every other bus in
// this codebase is: the publisher is a Touchable deep inside the Canvas and the
// subscriber includes App's post-processing pass, which lives outside it. They
// do not share a React tree.

let level = 0            // 0 = the film, 1 = the motel
let target = 0
let listeners = new Set()

export function houseLevel() {
  return level
}

export function houseTarget() {
  return target
}

export function setHouseTarget(v) {
  const next = Math.max(0, Math.min(1, v))
  if (next === target) return
  target = next
  listeners.forEach((fn) => fn(target))
}

export function toggleHouse() {
  setHouseTarget(target > 0.5 ? 0 : 1)
}

// The damping lives HERE rather than in a hook, because it has to run for
// every room, and bespoke rooms do not go through GenericRoom. One ticker
// (HouseRig, mounted by FilmWorld) drives this, and everything that needs the
// animated number reads houseLevel(). ~700ms to travel: a fluorescent tube
// deciding to commit, not a crossfade. Damped rather than tweened so a second
// flick mid-travel turns around from where it actually is.
const RATE = 4.6
const levelListeners = new Set()

export function tickHouse(dt) {
  if (Math.abs(level - target) < 0.0005) {
    if (level !== target) {
      level = target
      levelListeners.forEach((fn) => fn(level))
    }
    return false
  }
  level += (target - level) * (1 - Math.exp(-dt * RATE))
  if (Math.abs(level - target) < 0.002) level = target
  levelListeners.forEach((fn) => fn(level))
  return true
}

// For the post pass, which lives outside the Canvas and cannot read a frame
// loop. Fires only while the switch is actually moving.
export function subscribeLevel(fn) {
  levelListeners.add(fn)
  fn(level)
  return () => levelListeners.delete(fn)
}

// Every room mount starts in the film. A visitor who flicked the switch in
// Malignant should not walk into Sorry to Bother You with the lights already
// up: the first watch has no Dixon in it, and that goes for the motel too.
export function resetHouse() {
  level = 0
  target = 0
  listeners.forEach((fn) => fn(target))
  levelListeners.forEach((fn) => fn(level))
}

export function subscribeHouse(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// The screenshot harness cannot reliably click a 7cm switch plate it cannot
// see, and the whole point of this mechanic is that both states get looked at.
// Same shape as colliders.js's window.__vaultWalk: tiny, always on, so
// scripts/ can drive it and assert on both halves of a room.
if (typeof window !== 'undefined') {
  window.__house = (v) => setHouseTarget(v == null ? (target > 0.5 ? 0 : 1) : v)
}

// ------------------------------------------------------------------ the grade
//
// The motel state is DERIVED from the film's own grade rather than being one
// fixed look, because these are the same walls. Sicario's motel is a sodium-lit
// room with sand on the floor; Blade Runner's is the same room with the rain
// still on the window. If the motel were a constant, every room would resolve
// to the same beige box and the switch would read as "turn the game off",
// which is exactly the failure mode to avoid.
//
// What the motel does to any grade: kills the cinematographer. Saturation
// collapses toward neutral, contrast flattens, the key goes to the colour of a
// cheap warm bulb, the vignette opens up because a ceiling fixture does not
// vignette, the fog thins because fog was atmosphere and this is just a room,
// and bloom drops to almost nothing because nothing here is worth blooming.

const MOTEL_KEY = '#F0DCB4'   // a 2700K bulb behind a yellowed plastic diffuser
const MOTEL_FILL = '#3E362B'

function lerp(a, b, t) {
  return a + (b - a) * t
}

function lerpHex(a, b, t) {
  const pa = parseInt((a || '#000000').replace('#', ''), 16)
  const pb = parseInt((b || '#000000').replace('#', ''), 16)
  if (Number.isNaN(pa) || Number.isNaN(pb)) return b
  const c = (shift) => Math.round(lerp((pa >> shift) & 255, (pb >> shift) & 255, t))
  return '#' + [c(16), c(8), c(0)].map((v) => v.toString(16).padStart(2, '0')).join('')
}

export function motelGradeFor(grade) {
  const g = grade || {}
  return {
    ...g,
    key: MOTEL_KEY,
    fill: MOTEL_FILL,
    // A bare overhead is brighter than almost any authored film rig and much
    // worse, which is the joke. But it is a SPECIFIC brightness, not a
    // multiplier: the first version used max(0.42, ambient * 2.2), which took
    // Sorry to Bother You's already-fluorescent call floor to 1.1 ambient and
    // blew the walls to white. Clamped at both ends, so a pitch-dark room
    // comes up to a room and a bright one settles down to the same room.
    ambient: Math.min(0.5, Math.max(0.34, (g.ambient ?? 0.1) * 1.7)),
    keyIntensity: Math.min(1.5, Math.max(1.05, (g.keyIntensity ?? 1) * 1.05)),
    sat: -0.34,
    contrast: -0.16,
    grain: 0.035,
    vignette: 0.34,
    bloomIntensity: 0.05,
    fogDensity: (g.fogDensity ?? 0) * 0.25,
    fogColor: lerpHex(g.fogColor || g.bg, '#171410', 0.6),
    bg: lerpHex(g.bg, '#171308', 0.55),
  }
}

// Blend a room's authored grade toward its own motel state. `t` is the damped
// house level, so this is called every frame while the switch is moving and
// then stops changing once it settles.
export function blendGrade(filmGrade, t) {
  if (t <= 0.001) return filmGrade
  const m = motelGradeFor(filmGrade)
  if (t >= 0.999) return m
  const f = filmGrade || {}
  const num = (k, dflt) => lerp(f[k] ?? dflt, m[k] ?? dflt, t)
  return {
    ...f,
    key: lerpHex(f.key, m.key, t),
    fill: lerpHex(f.fill, m.fill, t),
    bg: lerpHex(f.bg, m.bg, t),
    fogColor: lerpHex(f.fogColor || f.bg, m.fogColor, t),
    ambient: num('ambient', 0.1),
    keyIntensity: num('keyIntensity', 1),
    sat: num('sat', 0),
    contrast: num('contrast', 0),
    grain: num('grain', 0.05),
    vignette: num('vignette', 0.6),
    bloomIntensity: num('bloomIntensity', 0.2),
    fogDensity: num('fogDensity', 0),
  }
}
