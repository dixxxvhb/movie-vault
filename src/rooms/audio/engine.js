// The Vault's generative audio engine. Same discipline as roomTone.js, one
// level up: a single AudioContext for every room recipe to share (rooms come
// and go far more often than the motel's air handler does, so this is a
// singleton with a swap-the-recipe API rather than one context per room).
//
// It NEVER autoplays. No AudioContext exists until the user's first unmute —
// that click is the thing standing between this code and an autoplay-policy
// block, and it also means "the page makes sound" is never true unless a
// person asked for it, which is the whole rule.
import { useEffect } from 'react'
import { ONESHOTS } from './oneshots.js'
import { subscribeWalk } from '../walkBus.js'

const KEY = 'vault-sound'

let ctx = null
let master = null
let compressor = null
let mediaGraphReady = false

let pendingFactory = null   // (ctx, master, clock) -> stop
let activeStop = null

const RAMP = 0.08 // 80ms, per spec

function readPersisted() {
  try { return localStorage.getItem(KEY) } catch { return null }
}
function writePersisted(v) {
  try { localStorage.setItem(KEY, v) } catch { /* private mode */ }
}

// Sound is muted by default. Only an explicit 'on' in storage flips that —
// anything else (never set, private-mode read failure, a stray value) reads
// as muted, which is the safe default the brief asks for.
export function isSoundOn() {
  return readPersisted() === 'on'
}

function ensureContext() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 0

  // one compressor on the master bus so a recipe stacking a drone + plucks +
  // a swell can never clip, no matter how many voices a bespoke room adds
  compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -20
  compressor.knee.value = 14
  compressor.ratio.value = 6
  compressor.attack.value = 0.005
  compressor.release.value = 0.28

  master.connect(compressor)
  compressor.connect(ctx.destination)
  mediaGraphReady = true
  return ctx
}

function ramp(param, value, c) {
  const now = c.currentTime
  param.cancelScheduledValues(now)
  param.setValueAtTime(param.value, now)
  param.linearRampToValueAtTime(value, now + RAMP)
}

function startPending() {
  if (!pendingFactory || !ctx || activeStop) return
  try {
    activeStop = pendingFactory(ctx, master, { beatAt: undefined }) || null
  } catch {
    activeStop = null
  }
}

function stopActive() {
  if (!activeStop) return
  try { activeStop() } catch { /* already torn down */ }
  activeStop = null
}

// The one thing a HUD toggle needs to call. Persists, ramps the master gain
// (80ms, same as the rest of the app's fades), and lazily builds the
// AudioContext on the very first `true`.
export function setSoundOn(on) {
  writePersisted(on ? 'on' : 'off')
  if (on) {
    const c = ensureContext()
    if (!c) return
    if (c.state === 'suspended') c.resume()
    ramp(master.gain, 1, c)
    startPending()
  } else {
    if (!ctx) return // never constructed — nothing to ramp, nothing to stop
    ramp(master.gain, 0, ctx)
    // stop the recipe's own oscillators/timers rather than just riding the
    // master fade to zero — a muted room shouldn't keep burning a graph of
    // nodes nobody can hear (and it keeps the "stopped/disconnected on room
    // exit" rule true of "stopped/disconnected on mute" too).
    stopActive()
  }
}

// A room mounts a recipe with this. `factory(ctx, master, clockApi) -> stop`
// per recipes/kit.js's contract. If sound is already on, it starts right
// away; if muted, it waits — unmuting later (while the room is still
// mounted) is what calls it back in.
export function setRoomRecipe(factory) {
  stopActive()
  pendingFactory = factory
  if (ctx && isSoundOn()) startPending()
}

export function clearRoomRecipe() {
  stopActive()
  pendingFactory = null
}

// React convenience: mount a recipe for the lifetime of a component, torn
// down on unmount (StrictMode-safe — `stop()` from a mid-dev double-invoke
// is always safe to call, and starting again just re-registers cleanly).
export function useRoomAudio(factory) {
  useEffect(() => {
    setRoomRecipe(factory)
    return () => clearRoomRecipe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factory])
}

// Wave T: one-shot foley (Touchable's `foley` prop, and anything else that
// wants a short synthesized event without owning a whole room recipe). Same
// never-autoplay discipline as the rest of this file: a no-op unless the
// AudioContext already exists (built lazily, only from setSoundOn(true))
// AND the persisted flag says sound is actually on — a room can call this
// freely regardless of mute state, it just goes silent while muted rather
// than every call site having to check isSoundOn() itself.
export function playOneShot(name, opts) {
  if (!ctx || !master || !isSoundOn()) return
  const fn = ONESHOTS[name]
  if (!fn) return
  try { fn(ctx, master, opts) } catch { /* a malformed opts object is not worth crashing a room over */ }
}

// Wave T: footsteps. Subscribed once at module load — same "always
// listening, only ever audible once sound is really on" shape as the rest
// of this file (compare `window.__vaultWalk` in colliders.js, always
// published, nobody has to opt in to receive it). CameraRig publishes one
// `{type:'step', speed}` per footfall regardless of mute state; the no-op
// guard lives here so a muted walk around a room costs nothing beyond the
// subscription check. Alternates two very quiet tick variants (a real
// footfall isn't tonally identical left-right-left) and scales gain with
// how fast you're actually moving (`speed` is walkVel / room walk speed,
// 0..~1, published by CameraRig).
let footstepToggle = 0
subscribeWalk((evt) => {
  if (evt.type !== 'step') return
  if (!ctx || !master || !isSoundOn()) return
  const speed = evt.speed ?? 1
  const gain = 0.01 + Math.min(1, Math.max(0, speed)) * 0.018
  footstepToggle = footstepToggle ? 0 : 1
  try {
    ONESHOTS.tick(ctx, master, { freq: footstepToggle ? 820 : 640, gain })
  } catch { /* ignore */ }
})

// Exposed for structural verification / debugging only — recipes should go
// through setRoomRecipe, not reach in here directly.
export function _debugState() {
  return { hasContext: !!ctx, contextState: ctx?.state ?? null, mediaGraphReady, soundOn: isSoundOn() }
}
