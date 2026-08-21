// Certify-develops-the-room (brief §3, Phase 3). Two ways to fire the
// develop bloom (useRoomDevelop.js) on a print's own room:
//
//  1. `?develop=<slug>` in the URL, read once — the debug entry point this
//     wave's own gate verifies against (combine with `?printroom=<slug>` to
//     land straight in that print's room, same convention every other
//     room-shaped query param in App.jsx already follows).
//  2. `triggerDevelop(slug)`, a plain exported function. Nothing in this
//     wave calls it yet — it's the natural trigger hook the brief asks for,
//     ready for whenever a future data-refresh path notices a film's
//     certified flag flipped true while that film's print room happens to
//     be open, and wants the visit to bloom rather than just silently
//     start returning the Ledger room on the next load.
//
// Neither path is required. A print with nothing listening for its slug
// (the overwhelmingly common case — this only ever fires for the one print
// actually being certified) just renders its ordinary faded state,
// byte-identical to before this file existed.
const listeners = new Set()

export function subscribeDevelop(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function triggerDevelop(slug) {
  listeners.forEach((fn) => fn(slug))
}

// Read once, not on every call — the query string doesn't change mid-visit,
// and re-parsing location.search from inside a per-frame hook would be a
// silly cost to pay for a debug flag.
let queryChecked = false
let queryValue = null
export function developQuerySlug() {
  if (queryChecked) return queryValue
  queryChecked = true
  try {
    queryValue = new URLSearchParams(window.location.search).get('develop')
  } catch {
    queryValue = null
  }
  return queryValue
}
