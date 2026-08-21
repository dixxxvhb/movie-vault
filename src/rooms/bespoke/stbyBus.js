// A tiny local pub-sub so bespoke/Stby.jsx (the swerve's own on/off state)
// and audio/recipes/stby.js (the mix that hard-cuts between office air and
// the muffled party throb) can agree on which room you're currently in,
// without either file reaching into engine.js or gradeBus.js. Same
// module-level shape as sicarioBus.js/departedBus.js — the publisher (the
// room, deep in the R3F tree) and the subscriber (the audio recipe, a plain
// JS module with no React tree of its own) don't share one.
let listeners = new Set()
let current = false   // false = office, true = penthouse

// Called by Stby.jsx whenever the hard cut fires in either direction.
export function notifySwerve(inPenthouse) {
  current = inPenthouse
  listeners.forEach((fn) => fn(current))
}

// Called by the audio recipe on start; returns an unsubscribe fn for stop().
// Fires immediately with whatever state is already current, so a recipe that
// mounts mid-swerve (sound flipped on during the 8s window) picks up the
// right mix without waiting for the next cut.
export function subscribeSwerve(fn) {
  listeners.add(fn)
  fn(current)
  return () => listeners.delete(fn)
}
