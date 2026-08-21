// A one-way pipe for a room to reach up to App's Post grade pass without
// rooms/* ever importing App.jsx (P1's known sharp edge: that import cycle
// broke the dev server once). App subscribes once and merges whatever a room
// publishes on top of its own config.grade; a room that never publishes
// changes nothing.
//
// Module-level, not context, because the publisher (a room deep in the R3F
// tree, inside the Canvas) and the subscriber (App, outside the Canvas) do
// not share a React tree — Canvas mounts its children in a separate root.

let listeners = new Set()
let current = null

// Called every frame (or whenever it changes) by a room that wants to steer
// the grade — Memento's gaze-driven split, say. `partial` is merged onto the
// room's own config.grade by the subscriber, so a room only needs to publish
// the fields it wants to override.
export function setGradeOverride(partial) {
  current = partial
  listeners.forEach((fn) => fn(current))
}

// Called on unmount by any room that called setGradeOverride, so the next
// room (or the motel) doesn't inherit a stale split-grade.
export function clearGradeOverride() {
  current = null
  listeners.forEach((fn) => fn(current))
}

// App calls this once. Returns an unsubscribe fn.
export function subscribeGrade(fn) {
  listeners.add(fn)
  fn(current)
  return () => listeners.delete(fn)
}
