// A tiny local pub-sub so bespoke/Barbarian.jsx (which station you're
// standing at) and audio/recipes/barbarian.js (rain + house tone up top,
// a low room pressure once you're below) can agree on how deep you are,
// without either file reaching into engine.js or gradeBus.js. Same
// module-level shape as stbyBus.js/departedBus.js.
let listeners = new Set()
let current = -1 // -1 = living room, 0..2 = descending stations

// Called by Barbarian.jsx whenever the station changes.
export function notifyDepth(index) {
  current = index
  listeners.forEach((fn) => fn(current))
}

// Called by the audio recipe on start; fires immediately with whatever
// depth is already current, so a recipe mounted mid-descent (sound flipped
// on partway down) picks up the right mix without waiting for the next step.
export function subscribeDepth(fn) {
  listeners.add(fn)
  fn(current)
  return () => listeners.delete(fn)
}
