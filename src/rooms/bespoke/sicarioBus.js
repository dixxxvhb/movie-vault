// A tiny local pub-sub so bespoke/Sicario.jsx (the descent's own depth) and
// audio/recipes/sicario.js (the sub drone that thickens with it) can agree
// on how far down you are, without either file reaching into engine.js or
// gradeBus.js (both outside this session's edit scope). Same module-level
// shape as departedBus.js — the publisher (the room, deep in the R3F tree)
// and the subscriber (the audio recipe, a plain JS module with no React tree
// of its own) don't share one.
let listeners = new Set()
let current = 0   // 0 at the surface, 1 at the very bottom

// Called by Sicario.jsx whenever the station (and so the depth) changes.
export function notifyDepth(t) {
  current = t
  listeners.forEach((fn) => fn(current))
}

// Called by the audio recipe on start; returns an unsubscribe fn for stop().
// Fires immediately with whatever depth is already current, so a recipe
// that mounts mid-descent (sound flipped on partway down) doesn't have to
// wait for the next station change to pick up the right thickness.
export function subscribeDepth(fn) {
  listeners.add(fn)
  fn(current)
  return () => listeners.delete(fn)
}
