// THE SAVE FILE. The first thing in this project that remembers you were here.
//
// Until now nothing was stored except three preference flags, which meant the
// Vault could not know you had ever visited, so nothing could change because
// you had. Every visit was visit one. That is the single largest thing
// standing between this and a game: not fidelity, not framerate, memory.
//
// What it records is deliberately small. Which rooms you have stood in, when,
// and for how long. Nothing else. There is no score, no completion percentage,
// and there will not be one: a percentage would turn 223 tracked titles into
// 223 chores and a forty-minute wander into a sweep. What the record is FOR is
// the taste laws, which crystallise when you have walked the films they cite,
// and the read-back at the end, which describes your route rather than grading
// it.
//
// A leaf module, same shape as settings.js. Versioned, migration-ready, and
// every read and write wrapped, because a private window must not throw on
// boot and a corrupt entry must degrade to "you have not been here" rather
// than taking the room down.

const KEY = 'vault-visits'
const VERSION = 1

// A room counts as VISITED after this long inside it. Walking through a
// doorway and straight back out is not a visit, and a law that crystallises
// because you clipped the corner of a room is a law that lied to you.
const DWELL_MS = 6000

function load() {
  const empty = { v: VERSION, rooms: {}, first: null }
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return empty
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object' || !p.rooms) return empty
    if (p.v !== VERSION) return { ...empty, ...migrate(p) }
    return { ...empty, ...p }
  } catch {
    return empty
  }
}

function migrate(old) {
  // Nothing to migrate from yet. When there is, it lands here rather than
  // silently discarding somebody's record.
  return { v: VERSION, rooms: old.rooms || {}, first: old.first ?? null }
}

let state = typeof window === 'undefined'
  ? { v: VERSION, rooms: {}, first: null }
  : load()

const listeners = new Set()

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // quota or private mode. The session still remembers; the next one will not.
  }
}

function publish() {
  listeners.forEach((fn) => {
    try { fn(state) } catch { /* one bad subscriber must not stop the rest */ }
  })
}

export function subscribeVisits(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function visits() {
  return state
}

export function hasVisited(slug) {
  return !!(slug && state.rooms[slug])
}

export function visitedSlugs() {
  return Object.keys(state.rooms)
}

export function visitCount() {
  return Object.keys(state.rooms).length
}

// Add time to a room's record and bank it. Idempotent and additive, so it is
// safe to call on a heartbeat as well as on the way out.
function credit(slug, ms) {
  if (!slug || ms <= 0) return
  const prev = state.rooms[slug]
  const total = (prev?.ms || 0) + ms
  // Time accumulates even below the threshold, so three short looks at the
  // same room eventually count. Someone who keeps coming back to a room has
  // told you something about it.
  const seen = total >= DWELL_MS
  state = {
    ...state,
    first: state.first || new Date().toISOString().slice(0, 10),
    rooms: {
      ...state.rooms,
      [slug]: { ms: total, seen: seen || !!prev?.seen, at: prev?.at || Date.now() },
    },
  }
  persist()
  publish()
}

// The room the player is standing in, and when the clock last flushed.
let openSlug = null
let lastFlush = 0
let beat = null

function flush() {
  if (!openSlug) return
  const now = Date.now()
  credit(openSlug, now - lastFlush)
  lastFlush = now
}

// Call on entering a room. Returns the leave function, written so the caller
// cannot forget it: it is the effect cleanup.
//
// Time is banked on a HEARTBEAT, not only on the way out. The first version
// credited the visit purely in the unmount cleanup, which meant closing the
// tab or following a link out of the room lost it entirely: a real defect,
// caught by testing the actual navigation path rather than the test hook.
// pagehide covers the mobile case, where a backgrounded tab may be killed
// without ever running an unload handler.
export function enterRoom(slug) {
  if (!slug) return () => {}
  flush()
  openSlug = slug
  lastFlush = Date.now()

  if (typeof window !== 'undefined') {
    if (beat) clearInterval(beat)
    beat = setInterval(flush, 2000)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHide)
  }

  return () => {
    flush()
    openSlug = null
    if (beat) { clearInterval(beat); beat = null }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onHide)
    }
  }
}

function onHide() {
  if (document.hidden) flush()
  else lastFlush = Date.now() // do not credit time spent in a background tab
}

// A room only counts toward a law once it is properly seen.
export function seenSlugs() {
  return Object.keys(state.rooms).filter((s) => state.rooms[s]?.seen)
}

export function resetVisits() {
  state = { v: VERSION, rooms: {}, first: null }
  persist()
  publish()
}

// ------------------------------------------------------------------- the laws
//
// A law is earned when every film it cites has been properly seen. The
// citations are derived in emit_vault_data.py from the evidence prose he
// already wrote, so this needs no hand-authored table and keeps working for
// lesson 22.
//
// The one law that cites nothing (its only evidence is John Wick, a film he
// rejected and never scored, so it has no room) can never be earned by
// walking. That is honest and it stays: some things about a person are not
// provable from the rooms they built.
export function lawState(lesson) {
  const cites = lesson?.cites || []
  if (!cites.length) return { earned: false, have: 0, need: 0, unprovable: true }
  const seen = new Set(seenSlugs())
  const have = cites.filter((c) => seen.has(c)).length
  return { earned: have === cites.length, have, need: cites.length, unprovable: false }
}

if (typeof window !== 'undefined') {
  // Same reason houseLights exposes one: the harness has to be able to put the
  // world into a state worth screenshotting.
  window.__visits = {
    seen: seenSlugs,
    count: visitCount,
    reset: resetVisits,
    grant: (slug) => {
      state = {
        ...state,
        first: state.first || new Date().toISOString().slice(0, 10),
        rooms: { ...state.rooms, [slug]: { ms: DWELL_MS, seen: true, at: Date.now() } },
      }
      persist()
      publish()
    },
  }
}
