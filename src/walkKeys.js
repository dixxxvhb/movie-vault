// Wave M1: the walker's key-state leaf module (pointer.js pattern — its own
// file so CameraRig and WalkStick.jsx can both read it without a cycle).
//
// Module-level key state. window keydown/keyup listeners are installed once
// on first import, guarded by a module flag so StrictMode's double-invoke
// (dev double-mounts everything) never double-registers them.

const KEYS = { KeyW: false, KeyA: false, KeyS: false, KeyD: false }

// Arrows map straight onto WASD so both control schemes share one state bag.
const ARROW_MAP = {
  ArrowUp: 'KeyW',
  ArrowDown: 'KeyS',
  ArrowLeft: 'KeyA',
  ArrowRight: 'KeyD',
}

function codeFor(e) {
  if (e.code in KEYS) return e.code
  return ARROW_MAP[e.code] || null
}

function isTypingTarget(e) {
  const t = e.target
  if (!t) return false
  const tag = t.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable === true
}

function clearAll() {
  KEYS.KeyW = KEYS.KeyA = KEYS.KeyS = KEYS.KeyD = false
}

let installed = false
function install() {
  if (installed) return
  installed = true

  window.addEventListener('keydown', (e) => {
    if (e.isComposing || isTypingTarget(e)) return
    const code = codeFor(e)
    if (!code) return
    KEYS[code] = true
  })

  window.addEventListener('keyup', (e) => {
    const code = codeFor(e)
    if (!code) return
    KEYS[code] = false
  })

  // Alt-tabbing away with a key physically held would otherwise leave that
  // key "on" forever (no keyup ever arrives) — a runaway walker marching
  // into a wall while the tab is in the background.
  window.addEventListener('blur', clearAll)
}
install()

// A touch joystick (WalkStick.jsx) overrides the keyboard vector while active.
let stickVec = null
export function setStickVec(v) {
  stickVec = v
}

// keyVec() -> {x, z} where z=+1 is forward (W), x=+1 is strafe right (D),
// normalized if diagonal. Matches CameraRig's yaw convention (aim()'s
// forward = -Z).
export function keyVec() {
  if (stickVec && (stickVec.x !== 0 || stickVec.z !== 0)) {
    const len = Math.hypot(stickVec.x, stickVec.z)
    if (len > 1) return { x: stickVec.x / len, z: stickVec.z / len }
    return { x: stickVec.x, z: stickVec.z }
  }

  let x = 0
  let z = 0
  if (KEYS.KeyW) z += 1
  if (KEYS.KeyS) z -= 1
  if (KEYS.KeyD) x += 1
  if (KEYS.KeyA) x -= 1
  if (x !== 0 && z !== 0) {
    const inv = Math.SQRT1_2
    x *= inv
    z *= inv
  }
  return { x, z }
}

// HUD hinting — "any walk key held right now" (keyboard only; the stick has
// its own visible nub, it doesn't need a hint).
export function anyWalkKey() {
  return KEYS.KeyW || KEYS.KeyA || KEYS.KeyS || KEYS.KeyD
}
