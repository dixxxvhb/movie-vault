// No Country for Old Men's own recipe: wind, and ONLY wind, in this room —
// no drone, no pluck, nothing else in the mix.
//
// The brief's own joke/thesis for this slug: "the mute toggle is disabled
// here." The shared engine (src/rooms/audio/engine.js) has no per-room
// escape hatch for that — `setSoundOn(false)` ramps the ONE shared master
// gain to 0 and tears down whatever recipe is mounted through it, and the
// HUD button that calls it lives in App.jsx, out of this session's edit
// scope (src/rooms/bespoke/*, src/rooms/audio/recipes/*, registry.js's
// BESPOKE lines, configs.js's four new entries — engine.js/App.jsx are not
// in that list). Greying the button out or swapping its label cleanly both
// require touching App.jsx, so per this session's own fallback instruction
// this recipe instead ignores mute-off gracefully: it owns a SECOND,
// independent AudioContext + gain graph that the shared engine's `master`
// bus never touches, so toggling the HUD's "sound" button in this room has
// no audible effect — the wind stays regardless of what the button reports.
// Ncfom.jsx mounts this directly in its own effect (NOT via useRoomAudio /
// setRoomRecipe, which would route it straight back through the mute gate
// this file is built to ignore).
import { noiseWash } from './kit.js'

export function startWind() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return () => {}

  const ctx = new AC()
  if (ctx.state === 'suspended') {
    // by the time this room is mounted the player has already clicked
    // through the Vault wall and into the film, so the page already has the
    // gesture a fresh context needs to resume — this just claims it.
    ctx.resume().catch(() => {})
  }

  // straight to destination, deliberately bypassing the shared engine's
  // master/compressor bus — that bus is exactly what the HUD toggle reaches.
  const wash = noiseWash(ctx, ctx.destination, {
    color: 'brown', lfoRate: 0.045, gain: 0.05, cutoff: 1500,
  })

  let stopped = false
  return function stop() {
    if (stopped) return
    stopped = true
    wash.stop()
    setTimeout(() => { try { ctx.close() } catch { /* already closed */ } }, 900)
  }
}
