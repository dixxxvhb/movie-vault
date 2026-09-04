// The flash policy — one place that owns how fast anything in the Vault is
// allowed to blink. A leaf module (pointer.js pattern): no imports from the
// app, safe for rooms/* and systems/* to pull in without a cycle.
//
// Why this exists: DwellConcede was strobing a saturated red point light as
// a 3.5 Hz square wave, automatically, with no warning and no way off. That
// fails WCAG 2.3.1 twice over — the general flash threshold (more than three
// flashes a second) and the red flash threshold (a saturated red transition,
// where "saturated" is R/(R+G+B) >= 0.8; #c81010 measures 0.86). The Enemy
// room's 11 Hz opacity flicker sat in the same danger band on a smaller area.
//
// The rule this file encodes: the flash is content, the RATE is not. A room
// is still allowed to be violent — Malignant's back half is supposed to come
// apart, that IS the review — it just may not do it at a frequency that can
// trigger a seizure, and a visitor must be able to turn it down without
// losing the room.
//
// Three levels, because "off" is a worse answer than "calmer":
//   'full'    author's intent, still rate-capped at SAFE_HZ
//   'reduced' slow soft pulses, no hard edges (the default under
//             prefers-reduced-motion)
//   'none'    steady state, zero oscillation
//
// The safe ceiling is 2.5 Hz, deliberately under the 3 Hz guideline rather
// than at it, because a wave that peaks twice per cycle can read as double
// its nominal rate.

import { get, set, subscribe } from './settings.js'

export const SAFE_HZ = 2.5

const LEVELS = ['full', 'reduced', 'none']

// The level lives in the settings store (one profile, one key, one panel);
// it is cached in a module local because strobe() is called every frame from
// inside useFrame and must not walk an object path 60 times a second.
let level = get('flash.level') || 'full'
if (typeof window !== 'undefined') {
  subscribe(() => {
    const next = get('flash.level')
    if (LEVELS.indexOf(next) !== -1) level = next
  })
}

export function flashLevel() {
  return level
}

export function setFlashLevel(next) {
  if (LEVELS.indexOf(next) === -1) return
  level = next
  set('flash.level', next)
}

// strobe(t, opts) -> 0..1
//
// The one function a room should call instead of writing its own
// `Math.sin(t * 22) > 0.3 ? on : off`. Returns a 0..1 amount to drive an
// intensity, an opacity, a scale — whatever the effect is — already clamped
// to a safe rate and already softened out of square-wave territory.
//
//   hz      what the author WANTS. Clamped to SAFE_HZ. Pass the real number;
//           the cap is applied here so the intent stays readable in the room.
//   soft    0 = the hardest edge still allowed, 1 = a pure sine. Never a true
//           square: an instant full-range transition is the part that hurts.
//   floor   the value at the bottom of the swing (default 0). Raising it
//           shrinks the luminance delta, which is the other half of the
//           guideline — three flashes a second only counts as a flash if the
//           contrast swing is big enough.
export function strobe(t, { hz = SAFE_HZ, soft = 0.45, floor = 0 } = {}) {
  if (level === 'none') return floor
  const rate = Math.min(hz, SAFE_HZ) * (level === 'reduced' ? 0.4 : 1)
  const wave = Math.sin(t * rate * Math.PI * 2) * 0.5 + 0.5 // 0..1 sine
  // Shape the sine toward (but never onto) a square. tanh-ish via a power
  // curve keeps the transition continuous, so there is no single frame that
  // jumps the full range.
  const k = 1 + (1 - Math.max(0, Math.min(1, soft))) * 3
  const shaped = wave <= 0.5
    ? 0.5 * Math.pow(wave * 2, k)
    : 1 - 0.5 * Math.pow((1 - wave) * 2, k)
  const depth = level === 'reduced' ? 0.35 : 1
  return floor + (1 - floor) * shaped * depth
}

// Saturated red is its own WCAG threshold, so a room that wants an angry red
// gets one that sits off the boundary. Returns a hex string safe to hand to
// a light or a material. `heat` 0..1 walks from a deep brick toward the
// hottest red still under R/(R+G+B) = 0.8.
export function safeRed(heat = 1) {
  const h = Math.max(0, Math.min(1, heat))
  const r = Math.round(150 + 60 * h)   // 150 -> 210
  const g = Math.round(34 + 22 * h)    // 34  -> 56
  const b = Math.round(30 + 20 * h)    // 30  -> 50
  // r/(r+g+b) lands ~0.70 at heat 0 and ~0.66 at heat 1, clear of 0.8.
  const hex = (n) => n.toString(16).padStart(2, '0')
  return '#' + hex(r) + hex(g) + hex(b)
}

// For a one-shot flicker (a correction, a glitch, a cut) rather than a
// sustained strobe: a decaying oscillation over `dur` seconds. Settles to 1,
// never square, and collapses to an instant settle when flashing is off.
export function flicker(elapsed, dur = 0.7, { hz = SAFE_HZ, low = 0.15 } = {}) {
  if (elapsed >= dur) return 1
  if (level === 'none') return 1
  const rate = Math.min(hz, SAFE_HZ) * (level === 'reduced' ? 0.5 : 1)
  const decay = 1 - elapsed / dur
  const wave = Math.sin(elapsed * rate * Math.PI * 2) * 0.5 + 0.5
  const depth = (1 - low) * decay * (level === 'reduced' ? 0.4 : 1)
  return 1 - depth * (1 - wave)
}
