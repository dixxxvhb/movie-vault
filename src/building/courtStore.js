import { useSyncExternalStore } from 'react'
import { buildCourt, inArea } from './scenes.js'
import { frame } from './geo.js'

// The Court's own little state: where you are standing outside, and which
// door card is open. Shared by CourtWorld (inside the Canvas) and CourtHUD
// (the DOM over it) without either importing App, and it survives the Court
// unmounting while you are inside a room, so coming back out puts you on the
// walkway in front of the door you went in by.

let state = {
  mode: 'overview', // 'overview' | 'walk'
  level: 0,
  warp: null, // {x, z, yaw, pitch, t}: a cut to a spot, consumed by the rig
  selected: null, // a room whose card is open
  near: null, // the room you are standing in front of
  fade: false,
  ready: false, // signage font loaded
  orbit: 0, // overview orbit angle, kept so the arrival does not restart
}
const listeners = new Set()

export function getCourt() { return state }
export function setCourt(patch) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
  listeners.forEach((fn) => fn())
}
function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export function useCourt(sel) {
  return useSyncExternalStore(subscribe, () => sel(state))
}

// The building itself, built once per ledger.
let cache = { films: null, scene: null }
export function courtScene(films) {
  if (!films || !state.ready) return null
  if (cache.films !== films) {
    cache.scene?.dispose?.()
    cache = { films, scene: buildCourt(films) }
  }
  return cache.scene
}

// The signage is painted into a canvas once, so its face has to be loaded
// before the building is built.
let fontsAsked = false
export function ensureFonts() {
  if (fontsAsked) return
  fontsAsked = true
  const done = () => {
    setCourt({ ready: true })
    // a return asked for before the building existed (out of a room you
    // reached by a direct link) lands now
    if (pendingReturn) { const p = pendingReturn; pendingReturn = null; returnTo(p.films, p.slug) }
  }
  if (!document.fonts?.load) return done()
  const timeout = new Promise((r) => setTimeout(r, 2500))
  Promise.race([Promise.all(['500 40px Oswald', '600 40px Oswald'].map((f) => document.fonts.load(f))), timeout])
    .then(done, done)
}

// A cut (never a flight): wash to black, move, wash back.
export function cut(fn) {
  setCourt({ fade: true })
  setTimeout(() => { fn(); setTimeout(() => setCourt({ fade: false }), 60) }, 220)
}

export function walkIn(scene) {
  cut(() => setCourt({ mode: 'walk', level: scene.spawn.level, warp: { ...scene.spawn, t: Date.now() }, selected: null }))
}

export function goLevel(scene, i) {
  cut(() => setCourt({ mode: 'walk', level: i, warp: { ...scene.levels[i].landing, t: Date.now() }, selected: null }))
}

export function showWhole() {
  cut(() => setCourt({ mode: 'overview', selected: null }))
}

function frontOf(scene, rm, dist = 2.0) {
  const { f } = frame(rm.rotY)
  let x = rm.x + f[0] * dist + Math.cos(rm.rotY) * 0.6
  let z = rm.z + f[2] * dist - Math.sin(rm.rotY) * 0.6
  if (!inArea(scene.levels[rm.floor].area, x, z)) { x = rm.x + f[0] * 1.6; z = rm.z + f[2] * 1.6 }
  return { x, z, yaw: rm.rotY, pitch: -0.08, t: Date.now() }
}

export function walkTo(scene, rm) {
  cut(() => setCourt({ mode: 'walk', level: rm.floor, warp: frontOf(scene, rm), selected: null }))
}

// Out of a room (or the office) onto the Court, by slug. Works before the
// Court has ever been built: the stand waits for the signage font.
let pendingReturn = null
export function returnTo(films, slug) {
  if (!state.ready) {
    pendingReturn = { films, slug }
    ensureFonts()
    return
  }
  standAt(courtScene(films), slug)
}

// Coming back out of a room: no wash of our own, the room's develop wash
// already covers this.
export function standAt(scene, slug) {
  if (!scene) return
  if (slug === 'office') {
    setCourt({ mode: 'walk', level: 0, warp: { ...scene.officeDoor, t: Date.now() }, selected: null, near: null })
    return
  }
  const rm = scene.rooms.find((r) => r.slug === slug)
  if (!rm) return setCourt({ selected: null })
  // A step out and along the walkway, turned back toward the door, so you
  // see it shut behind you rather than standing with your nose on the plate.
  const { f } = frame(rm.rotY)
  const r = [Math.cos(rm.rotY), 0, -Math.sin(rm.rotY)]
  let warp = { x: rm.x + f[0] * 1.4 - r[0] * 1.8, z: rm.z + f[2] * 1.4 - r[2] * 1.8, yaw: rm.rotY - 0.9, pitch: -0.05, t: Date.now() }
  if (!inArea(scene.levels[rm.floor].area, warp.x, warp.z)) {
    warp = { x: rm.x + f[0] * 1.4 + r[0] * 1.8, z: rm.z + f[2] * 1.4 + r[2] * 1.8, yaw: rm.rotY + 0.9, pitch: -0.05, t: Date.now() }
  }
  if (!inArea(scene.levels[rm.floor].area, warp.x, warp.z)) warp = frontOf(scene, rm, 2.0)
  setCourt({ mode: 'walk', level: rm.floor, warp, selected: null, near: rm })
}
