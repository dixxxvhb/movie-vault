// The settings store. One versioned object, one localStorage key, one place
// every preference in the Vault lives.
//
// A leaf module on purpose (pointer.js / colliders.js pattern): no imports
// from the app, no React, safe for anything in src/ to pull in. It publishes
// through subscribe() so both React trees (the DOM overlay and the Canvas
// reconciler, which are separate roots) can read the same value without a
// context that only reaches one of them.
//
// Why this exists: before it, the entire preference system was three
// unrelated localStorage keys (vault.guide.seen.v1, vault-bob, vault-sound)
// and two toggles that only render inside a film room's HUD, which means a
// visitor standing in the motel could not reach either one. There was
// literally nowhere to put an accommodation. Defaults are the feature here;
// a panel of twenty switches whose defaults are all still hazardous has just
// moved the work onto the player.
//
// Three rules this file keeps:
//   1. prefers-reduced-motion sets DEFAULTS, it never locks a control. People
//      turn it on system-wide for reasons that have nothing to do with this
//      app and must be able to turn effects back on.
//   2. Every read and write is try/catch wrapped. Private windows, disabled
//      storage and quota errors are survivable; a thrown SecurityError on
//      boot is not.
//   3. Everything is reachable by URL parameter, so the screenshot harness
//      tests the REAL app rather than a fixture build, and so a configuration
//      is a link someone can send.

const KEY = 'vault-a11y'
const VERSION = 1

function media(q) {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  try {
    return window.matchMedia(q).matches
  } catch {
    return false
  }
}

// The OS has already been asked these questions. Honour the answers as the
// starting point rather than making someone re-answer them here.
const reduceMotion = () => media('(prefers-reduced-motion: reduce)')
const moreContrast = () => media('(prefers-contrast: more)')

function defaults() {
  const rm = reduceMotion()
  return {
    v: VERSION,

    motion: {
      // The 780ms camera flight between stations is the single largest
      // vestibular offender in the app, and it is motion the player did not
      // ask for. 'cut' replaces it with an instant reposition behind the
      // wash that already exists.
      travel: rm ? 'cut' : 'fly',
      headBob: !rm,
      sway: !rm,
      dust: !rm,
      // Narrowing the view while the camera translates is one of the few
      // mitigations with real evidence behind it. Labelled in the UI as
      // "narrow the view while moving", never as "vignette" — the room
      // already has an artistic vignette and calling both the same thing
      // makes the setting look broken.
      moveVignette: rm,
      coldOpen: !rm,
      // A multiplier on the responsive base fov, not a replacement, so it
      // composes with the portrait widening instead of fighting it.
      fovScale: 1,
      turn: 'smooth', // 'smooth' | 'snap'
      snapDegrees: 45,
      lookSpeed: 1,
    },

    vision: {
      textScale: 1, // 1 | 1.25 | 1.5 | 2 — scales DOM, world signage AND numerals
      highContrast: moreContrast(),
      keepSignage: false, // signage fades on approach by default; this pins it
      keepZoom: false, // hold the magnifier across stations instead of resetting
      focusRing: true,
      // The functional colours (thread, lens highlight, find marker, focus
      // ring) come from Okabe-Ito rather than from a room's art direction,
      // because they carry meaning and must survive every CVD type. The
      // room's own grade is untouched by this.
      cvdSafeFunctional: true,
    },

    // Owned by flashPolicy.js, mirrored here so one panel shows everything.
    flash: {
      level: rm ? 'reduced' : 'full', // 'full' | 'reduced' | 'none'
    },

    audio: {
      master: 0.8,
      ambience: 1,
      foley: 1,
      ui: 1,
      mono: false,
      // A low-key readout naming what is playing. The audio here is authored
      // per film and carries meaning, so it is content, not decoration.
      captions: false,
    },

    content: {
      // Films are already tagged and there is no progression, so opting out
      // of a room costs the player nothing but that room. Say so in the UI:
      // fear that skipping costs something is the main reason people do not
      // use content settings.
      skip: [], // slugs the player has chosen not to enter
      warnBefore: true, // show the per-room card before a flagged room
      roomEvents: true, // scheduled beats: cuts, resets, weather
      roomReactsToYou: true, // gaze and dwell systems. A different question.
    },

    reading: {
      plain: false, // swap the case file prose for the short plain summary
      speak: false, // speechSynthesis on the focused object and on arrival
    },

    input: {
      // Populated by the input layer when it lands. Kept here so a rebind
      // survives with the rest of the profile rather than in its own key.
      bindings: null,
      dwellMs: 0, // 0 = off. 400-3000 activates dwell selection.
      holdToToggle: false, // every hold in the app becomes a toggle
      invertY: false,
    },
  }
}

// Merge a stored profile onto the current defaults rather than trusting it
// wholesale, so a key added in a later version appears for someone whose
// saved profile predates it, and a corrupted branch degrades to the default
// instead of taking the app down.
function merge(base, saved) {
  if (!saved || typeof saved !== 'object') return base
  const out = { ...base }
  for (const k of Object.keys(base)) {
    const b = base[k]
    const s = saved[k]
    if (b && typeof b === 'object' && !Array.isArray(b)) {
      out[k] = merge(b, s)
    } else if (s !== undefined && typeof s === typeof b) {
      out[k] = s
    }
  }
  return out
}

function migrate(saved) {
  if (!saved || saved.v === VERSION) return saved
  // v0: the three loose keys that predate this file. Fold them in so nobody
  // loses a choice they already made, then never look at them again.
  if (!saved.v) {
    const out = { v: VERSION, motion: {}, audio: {} }
    try {
      if (window.localStorage.getItem('vault-bob') === '0') out.motion.headBob = false
      if (window.localStorage.getItem('vault-sound') === '1') out.audio.master = 0.8
    } catch {
      // nothing to recover; defaults stand
    }
    return out
  }
  return saved
}

function load() {
  const base = defaults()
  let saved = null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) saved = migrate(JSON.parse(raw))
  } catch {
    // unparseable or unreadable — start clean rather than half-broken
    saved = null
  }
  return merge(base, saved)
}

let state = typeof window === 'undefined' ? defaults() : load()
const listeners = new Set()

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // quota, private mode, storage disabled. The session still honours the
    // choice; it just will not be here next time.
  }
}

function publish() {
  listeners.forEach((fn) => {
    try {
      fn(state)
    } catch {
      // one bad subscriber must not stop the rest from updating
    }
  })
}

export function settings() {
  return state
}

// get('motion.travel') -> 'fly'
export function get(path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), state)
}

// set('motion.travel', 'cut'). Writes a new object at every level on the
// path so a subscriber comparing by reference sees the change.
export function set(path, value) {
  const parts = path.split('.')
  const last = parts.pop()
  let node = { ...state }
  state = node
  for (const k of parts) {
    node[k] = { ...node[k] }
    node = node[k]
  }
  if (node[last] === value) return
  node[last] = value
  persist()
  publish()
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function resetAll() {
  state = defaults()
  persist()
  publish()
}

// The four presets. Presets outperform a wall of toggles: each one is a
// named starting point that then reveals the full panel, so nobody has to
// understand twenty switches to make the Vault usable. The names come from
// the content rather than from a spec.
export const PRESETS = {
  'calm-room': {
    label: 'Calm room',
    hint: 'No flashing, no hard cuts, nothing jumps at you.',
    apply: {
      'flash.level': 'none',
      'motion.travel': 'cut',
      'motion.coldOpen': false,
      'content.roomEvents': false,
      'content.roomReactsToYou': false,
      'vision.keepSignage': true,
    },
  },
  'steady-view': {
    label: 'Steady view',
    hint: 'For motion sickness. The camera cuts instead of flying and never bobs.',
    apply: {
      'motion.travel': 'cut',
      'motion.headBob': false,
      'motion.sway': false,
      'motion.dust': false,
      'motion.moveVignette': true,
      'motion.turn': 'snap',
    },
  },
  'clear-reading': {
    label: 'Clear reading',
    hint: 'Bigger text, higher contrast, signs that stay up.',
    apply: {
      'vision.textScale': 1.5,
      'vision.highContrast': true,
      'vision.keepSignage': true,
      'vision.keepZoom': true,
      'reading.plain': true,
    },
  },
  'no-mouse': {
    label: 'Keyboard only',
    hint: 'Look and move without dragging. Every object reachable by key.',
    apply: {
      'motion.turn': 'snap',
      'input.holdToToggle': true,
      'vision.focusRing': true,
    },
  },
}

export function applyPreset(name) {
  const p = PRESETS[name]
  if (!p) return
  Object.entries(p.apply).forEach(([path, value]) => set(path, value))
}

// URL parameters, so the screenshot harness drives the real app rather than
// a fixture build, and so a working configuration is a link. Same spirit as
// the ?film= / ?nocold / ?noguide params that already exist.
//   ?a11y=calm-room            apply a preset
//   ?set=motion.travel:cut,vision.textScale:1.5
// Session-only by design: a link someone was sent must not silently rewrite
// their saved profile.
export function applyUrlOverrides(search) {
  let params
  try {
    params = new URLSearchParams(search ?? window.location.search)
  } catch {
    return
  }
  const preset = params.get('a11y')
  if (preset && PRESETS[preset]) applyPreset(preset)

  const raw = params.get('set')
  if (!raw) return
  raw.split(',').forEach((pair) => {
    const i = pair.indexOf(':')
    if (i < 1) return
    const path = pair.slice(0, i)
    let value = pair.slice(i + 1)
    if (value === 'true') value = true
    else if (value === 'false') value = false
    else if (value !== '' && !Number.isNaN(Number(value))) value = Number(value)
    if (get(path) === undefined) return // never invent a key from a URL
    set(path, value)
  })
}
