// Wave M1: footstep events. gradeBus.js pattern again — CameraRig (which
// owns the walker) publishes here on every footfall; nothing subscribes yet
// in M1 (the audio engine picks this up in a later wave), so this is
// deliberately just a pipe.

let listeners = new Set()

export function publishWalkEvent(evt) {
  listeners.forEach((fn) => fn(evt))
}

// Returns an unsubscribe fn.
export function subscribeWalk(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
