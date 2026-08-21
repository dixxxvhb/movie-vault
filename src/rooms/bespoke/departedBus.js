// A tiny local pub-sub so bespoke/Departed.jsx (the visual elevator-arrival
// timer) and audio/recipes/the-departed.js (the arrival chime) can agree on
// the exact moment the elevator opens, without either file reaching into
// engine.js or gradeBus.js (both outside this session's edit scope). Same
// "module-level, not context" shape as gradeBus.js — the publisher (the room,
// deep in the R3F tree) and the subscriber (the audio recipe, a plain JS
// module with no React tree of its own) don't share one.
let listeners = new Set()

// Called by Departed.jsx the instant the doors start sliding open.
export function notifyElevatorOpen() {
  listeners.forEach((fn) => fn())
}

// Called by the audio recipe on start; returns an unsubscribe fn for stop().
export function subscribeElevatorOpen(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
