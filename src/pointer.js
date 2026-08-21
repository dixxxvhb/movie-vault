// How far the pointer travelled during the last press.
//
// Every click handler in the room consults this so that "drag to look around"
// never also counts as "click whatever was behind the cursor". It lives in its
// own module rather than in CameraRig because room objects (which CameraRig
// imports geometry from) need it too, and the resulting import cycle would
// break the dev server even though the bundler happened to hoist past it.

let lastDragDistance = 0

export const setDragDistance = (d) => { lastDragDistance = d }
export const wasDrag = () => lastDragDistance > 6

// Wave M2: pointer lock. Lives here rather than a new leaf because it is the
// same kind of thing wasDrag is — "what did the pointer just do" state shared
// between CameraRig (drives the look + the click raycast override) and App
// (owns Esc and the crosshair). One `pointerlockchange` listener, attached to
// `document` once at module load — module-level rather than component-level
// so it survives StrictMode's double-mount without double-attaching (guarded
// by a flag on `document` itself, which only ever exists once).
let locked = false
let lastUnlockAt = -Infinity
const lockListeners = new Set()

if (typeof document !== 'undefined' && !document.__vaultPointerLockHooked) {
  document.__vaultPointerLockHooked = true
  document.addEventListener('pointerlockchange', () => {
    const was = locked
    locked = document.pointerLockElement != null
    if (was && !locked) lastUnlockAt = performance.now()
    lockListeners.forEach((fn) => fn(locked))
  })
}

export const isPointerLocked = () => locked
// React (App's crosshair) subscribes to lock changes; returns an unsubscribe.
export const subscribeLock = (fn) => { lockListeners.add(fn); return () => lockListeners.delete(fn) }
// Esc sharp edge (M2 spec): the browser's own Esc-to-unlock can also reach our
// keydown listener. An Esc arriving within ~250ms of an unlock event was that
// release, not a second press asking to exit the room — swallow it.
export const recentPointerUnlock = () => performance.now() - lastUnlockAt < 250
export const requestPointerLock = (el) => { try { el?.requestPointerLock?.() } catch { /* not available / not allowed right now */ } }
export const exitPointerLock = () => {
  try { if (typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock() } catch { /* ignore */ }
}
