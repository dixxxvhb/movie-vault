// A tiny local pub-sub so bespoke/Motu.jsx's lightning (which freezes into a
// new jagged pose every few seconds rather than continuously flickering)
// can cue audio/recipes/motu.js's thunder rumble + organ stab at the exact
// moment a new pose lands. Same module-level shape as stbyBus.js/
// barbarianBus.js/departedBus.js.
let listeners = new Set()

// Called by Motu.jsx every time the lightning swaps to a new held pose.
export function notifyPose() {
  listeners.forEach((fn) => fn())
}

export function subscribePose(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
