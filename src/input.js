// The input layer. Devices produce ACTIONS; nothing downstream ever names a
// key again.
//
// Why this replaces walkKeys.js: that file was `const KEYS = { KeyW, KeyA,
// KeyS, KeyD }` with an arrow alias map. It works, and it is also the single
// structural thing standing between this project and every motor
// accessibility feature there is. Remapping, gamepad, keyboard turn, snap
// turn, hold-to-toggle, one-handed layouts and switch access are all the same
// feature underneath: something other than a hardcoded WASD object deciding
// what "forward" means. You cannot patch around it, so it is gone.
//
// A leaf module (pointer.js pattern). Listeners install once on first import,
// guarded by a module flag, because StrictMode double-invokes everything in
// dev and a double-registered keydown is a walker that moves at twice speed.
//
// The three device paths all converge on the same action state:
//   keyboard  -> bindings (rebindable, persisted in settings.input.bindings)
//   touch     -> the on-screen stick writes the move axis directly
//   gamepad   -> polled per frame; the Xbox Adaptive Controller enumerates as
//                a standard gamepad, so switch access comes free with this

import { get, set, subscribe } from './settings.js'

// The complete verb set. Anything the player can do has a name here, and the
// options panel renders this list, so adding an action makes it rebindable
// with no extra work.
export const ACTIONS = {
  moveForward: 'Walk forward',
  moveBack: 'Walk back',
  strafeLeft: 'Step left',
  strafeRight: 'Step right',
  turnLeft: 'Turn left',
  turnRight: 'Turn right',
  interact: 'Use what you are looking at',
  back: 'Step back / leave the room',
  find: 'Find a film',
  pause: 'Pause',
  options: 'Settings',
  zoomIn: 'Look closer',
  zoomOut: 'Look wider',
  toggleInfo: 'Hide the record',
  cycleNext: 'Next thing in this room',
  cyclePrev: 'Previous thing in this room',
}

// KeyboardEvent.code, so the binding is physical-position based and a player
// on AZERTY or Dvorak gets ZQSD/,AOE where their fingers already are rather
// than wherever the letters W A S D happen to have moved to.
const DEFAULT_BINDINGS = {
  KeyW: 'moveForward', ArrowUp: 'moveForward',
  KeyS: 'moveBack', ArrowDown: 'moveBack',
  KeyA: 'strafeLeft',
  KeyD: 'strafeRight',
  ArrowLeft: 'turnLeft', KeyQ: 'turnLeft',
  ArrowRight: 'turnRight', KeyE: 'turnRight',
  KeyF: 'interact', Enter: 'interact', Space: 'interact',
  Escape: 'back',
  Slash: 'find',
  KeyP: 'pause',
  KeyO: 'options',
  Equal: 'zoomIn', NumpadAdd: 'zoomIn',
  Minus: 'zoomOut', NumpadSubtract: 'zoomOut',
  KeyI: 'toggleInfo',
  Tab: 'cycleNext',
}

// Standard Gamepad mapping. Left stick is move, right stick is look (read by
// the controller, not here), face and shoulder buttons are verbs.
const PAD_BUTTONS = {
  0: 'interact',   // A / cross
  1: 'back',       // B / circle
  3: 'find',       // Y / triangle
  4: 'turnLeft',   // LB
  5: 'turnRight',  // RB
  6: 'zoomOut',    // LT
  7: 'zoomIn',     // RT
  9: 'pause',      // start
  8: 'options',    // select
  12: 'moveForward', 13: 'moveBack', 14: 'strafeLeft', 15: 'strafeRight', // d-pad
}

const PAD_DEADZONE = 0.22

function bindings() {
  return get('input.bindings') || DEFAULT_BINDINGS
}

export function defaultBindings() {
  return { ...DEFAULT_BINDINGS }
}

export function rebind(code, action) {
  const next = { ...bindings() }
  // One physical key does one thing. Clear any previous owner of this code,
  // then assign, so a rebind cannot silently leave a key doing two jobs.
  delete next[code]
  if (action) next[code] = action
  set('input.bindings', next)
}

export function resetBindings() {
  set('input.bindings', null)
}

// ---------------------------------------------------------------- state
// Two bags: `held` is what is down right now, `edges` counts presses that
// have not been consumed yet. Edge actions (interact, pause, find) are read
// with consume() so a single press fires exactly once no matter how many
// systems are watching and no matter what the framerate is.
const held = Object.create(null)
const edges = Object.create(null)
const heldSince = Object.create(null)

let stick = null       // touch joystick, overrides the keyboard move axis
let padIndex = null
let padPrev = []

function isTypingTarget(e) {
  const t = e.target
  if (!t) return false
  return t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable === true
}

function press(action) {
  if (!action) return
  if (!held[action]) {
    held[action] = true
    heldSince[action] = performance.now()
    edges[action] = (edges[action] || 0) + 1
  }
}

function release(action) {
  if (!action) return
  held[action] = false
  heldSince[action] = 0
}

function clearAll() {
  for (const k in held) held[k] = false
  for (const k in heldSince) heldSince[k] = 0
}

let installed = false
function install() {
  if (installed || typeof window === 'undefined') return
  installed = true

  window.addEventListener('keydown', (e) => {
    if (e.isComposing || isTypingTarget(e)) return
    const action = bindings()[e.code]
    if (!action) return
    // Tab is bound to cycleNext for keyboard-only play, so it must not also
    // move DOM focus out of the canvas while the world has focus. Every other
    // bound key is safe to let through.
    if (e.code === 'Tab') e.preventDefault()
    press(action)
  })

  window.addEventListener('keyup', (e) => {
    const action = bindings()[e.code]
    release(action)
  })

  // Alt-tabbing with a key physically held would otherwise leave that action
  // on forever, since no keyup ever arrives: a walker marching into a wall in
  // a background tab.
  window.addEventListener('blur', clearAll)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearAll()
  })

  window.addEventListener('gamepadconnected', (e) => {
    if (padIndex === null) padIndex = e.gamepad.index
  })
  window.addEventListener('gamepaddisconnected', (e) => {
    if (padIndex === e.gamepad.index) {
      padIndex = null
      padPrev = []
      clearAll()
    }
  })

  // A rebind mid-session must not leave the old key stuck down.
  subscribe(clearAll)
}
install()

// Polled once per frame by the controller, before anything reads the state.
// Gamepads are not event-driven: navigator.getGamepads() returns a fresh
// snapshot and you have to diff it yourself.
export function pollDevices() {
  if (padIndex === null || typeof navigator === 'undefined' || !navigator.getGamepads) return
  const pad = navigator.getGamepads()[padIndex]
  if (!pad) return

  for (const i in PAD_BUTTONS) {
    const b = pad.buttons[i]
    const down = !!(b && (b.pressed || b.value > 0.5))
    if (down && !padPrev[i]) press(PAD_BUTTONS[i])
    else if (!down && padPrev[i]) release(PAD_BUTTONS[i])
    padPrev[i] = down
  }
}

// The analog left stick, read separately from the digital d-pad so a partial
// push is a slow walk rather than full speed.
function padAxis() {
  if (padIndex === null || typeof navigator === 'undefined' || !navigator.getGamepads) return null
  const pad = navigator.getGamepads()[padIndex]
  if (!pad || pad.axes.length < 2) return null
  const dz = (v) => (Math.abs(v) < PAD_DEADZONE ? 0 : (v - Math.sign(v) * PAD_DEADZONE) / (1 - PAD_DEADZONE))
  const x = dz(pad.axes[0])
  const z = -dz(pad.axes[1])
  if (x === 0 && z === 0) return null
  return { x, z }
}

// The right stick, for look. Returned raw; the controller owns sensitivity.
export function lookAxis() {
  if (padIndex === null || typeof navigator === 'undefined' || !navigator.getGamepads) return null
  const pad = navigator.getGamepads()[padIndex]
  if (!pad || pad.axes.length < 4) return null
  const dz = (v) => (Math.abs(v) < PAD_DEADZONE ? 0 : (v - Math.sign(v) * PAD_DEADZONE) / (1 - PAD_DEADZONE))
  const x = dz(pad.axes[2])
  const y = dz(pad.axes[3])
  if (x === 0 && y === 0) return null
  return { x, y: get('input.invertY') ? -y : y }
}

// ---------------------------------------------------------------- reads

export function isDown(action) {
  return !!held[action]
}

// How long an action has been held, in seconds. The controller uses this for
// accelerating keyboard turn; the interaction layer uses it for long-press.
export function heldFor(action) {
  if (!held[action]) return 0
  return (performance.now() - (heldSince[action] || 0)) / 1000
}

// consume() is how a one-shot verb is read: it returns true once per physical
// press and then forgets it. Never poll isDown() for interact, or a single
// press fires on every frame the key is down.
export function consume(action) {
  if (!edges[action]) return false
  edges[action] = 0
  return true
}

export function clearEdges() {
  for (const k in edges) edges[k] = 0
}

// The touch joystick writes here and wins over the keyboard while active.
export function setStickVec(v) {
  stick = v
}

// moveAxis() -> {x, z}, z = +1 forward, x = +1 right, normalised on the
// diagonal. Priority: touch stick, then analog pad, then keys.
export function moveAxis() {
  if (stick && (stick.x !== 0 || stick.z !== 0)) {
    const len = Math.hypot(stick.x, stick.z)
    return len > 1 ? { x: stick.x / len, z: stick.z / len } : { x: stick.x, z: stick.z }
  }
  const pad = padAxis()
  if (pad) return pad

  let x = 0
  let z = 0
  if (held.moveForward) z += 1
  if (held.moveBack) z -= 1
  if (held.strafeRight) x += 1
  if (held.strafeLeft) x -= 1
  if (x !== 0 && z !== 0) {
    const inv = Math.SQRT1_2
    x *= inv
    z *= inv
  }
  return { x, z }
}

// -1 / 0 / +1. Keyboard and shoulder-button turning, which is what makes the
// app playable with no mouse at all. The controller decides whether this is
// a smooth rate or a snap, from settings.motion.turn.
export function turnAxis() {
  return (held.turnRight ? 1 : 0) - (held.turnLeft ? 1 : 0)
}

export function anyMoveInput() {
  const a = moveAxis()
  return a.x !== 0 || a.z !== 0 || turnAxis() !== 0
}

// Back-compat shim so CameraRig and WalkStick keep working unchanged while
// the controller rewrite lands. Delete both of these once nothing imports
// walkKeys.js.
export const keyVec = moveAxis
export const anyWalkKey = anyMoveInput
