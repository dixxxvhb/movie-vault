import { PRESETS } from '../presets.js'

// Wave C (VAULT-IMMERSION-BRIEF-v2.md §3, "the three states become three
// render treatments"). Neither archive container resolves through
// registry.js's getRoomConfig()/CONFIGS — a shoebox print has no per-film
// scene authored for it (that's the whole point of "uncertified"), and a
// drawer film has no score to grade a family off of at all. This file is the
// two archive configs: one genre-mapped and per-print (fadedConfigFor), one
// fixed and shared (hazyConfigFor).

// ---------------------------------------------------------------- genre map
// Every genre actually present in the archives (public/vault-data.json's
// shoebox+drawer arrays, checked 2026-08-21): Action, Adventure, Animation,
// Comedy, Crime, Drama, History, Horror, Music, Mystery, Romance, Science
// Fiction, TV Movie, Thriller, War. A few more (Fantasy, Family, Documentary,
// Western) are mapped anyway for whatever the archives grow into later.
const GENRE_FAMILY = {
  'Science Fiction': 'mind-bender',
  Mystery: 'mind-bender',
  Horror: 'dread',
  Thriller: 'dread',
  Crime: 'dread',
  Western: 'dread',
  Action: 'momentum',
  Adventure: 'momentum',
  War: 'momentum',
  Animation: 'weird-fable',
  Comedy: 'weird-fable',
  Fantasy: 'weird-fable',
  Family: 'weird-fable',
  Drama: 'intimate-tension',
  Romance: 'intimate-tension',
  Music: 'intimate-tension',
  History: 'intimate-tension',
  'TV Movie': 'intimate-tension',
  Documentary: 'intimate-tension',
}

// Checked in this fixed priority regardless of how a print's own genres
// array is ordered. Arrival is ["Drama","Science Fiction","Mystery"] —
// Drama listed first, but the print should read as mind-bender, not fall to
// the generic drama bucket just because the TMDB-style array happens to list
// the broadest genre first. "spectacle" never wins a genre match on today's
// data (no archived film reads as pure spectacle) — falls through to the
// intimate-tension default same as everything else unmapped.
const FAMILY_PRIORITY = ['mind-bender', 'dread', 'momentum', 'weird-fable', 'intimate-tension', 'spectacle']

export function familyForGenres(genres = []) {
  const present = new Set((genres || []).map((g) => GENRE_FAMILY[g]).filter(Boolean))
  for (const fam of FAMILY_PRIORITY) if (present.has(fam)) return fam
  return 'intimate-tension'
}

// -------------------------------------------------------- shoebox (faded)
// "Same geometry rendered FADED... memory in pencil" (brief §3): a shoebox
// print gets the SAME template engine every Ledger film goes through
// (GenericRoom + the family preset it maps to), just with the family's own
// grade pushed down instead of a per-film config narrowing it to a staged
// scene. That degradation, not a different shell, is what keeps a faded room
// reading as the same world seen faded rather than a different, broken one.
export function fadedConfigFor(print) {
  const family = familyForGenres(print?.genres)
  const preset = PRESETS[family] || PRESETS['intimate-tension']
  const pg = preset.grade || {}
  const pp = preset.place || {}
  const shellParams = pp.shellParams || {}

  return {
    family,
    grade: {
      // pencil-grey, not the family's own bg/fogColor — this is the one
      // place the preset's colour is deliberately overridden rather than
      // just dimmed, because "memory in pencil" (brief's own phrase) means
      // grey, not a darker version of whatever hue the family carries
      bg: '#8f8a7c',
      fogColor: '#96917f',
      // dustier than the Ledger equivalent at the same family — a memory,
      // not a clear room
      fogDensity: (pg.fogDensity ?? 0.05) * 1.55,
      key: '#a39d8a',
      // "dimmed ~0.4x" (brief §3), applied to the family's OWN level so a
      // naturally-bright spectacle room still reads brighter-than-dread
      // once faded, just both scaled down together
      keyIntensity: (pg.keyIntensity ?? 2.2) * 0.4,
      fill: '#6f6a5c',
      ambient: (pg.ambient ?? 0.16) * 0.4,
      // forced WAY down, not to a flat zero — a hair of the family's own
      // saturation left in is what keeps this the same world seen faded
      // rather than a different room the brief explicitly warns against
      sat: -0.94,
      contrast: (pg.contrast ?? 0) - 0.05,
      hue: 0,
    },
    camera: { pos: [0, 1.55, 3.2], look: [0, 1.3, 0], fov: preset.camera?.fov ?? 50 },
    place: {
      shell: pp.shell || 'box',
      shellParams,
      props: pp.props || [],
      systems: [
        ...(pp.systems || []),
        {
          type: 'DustDrift',
          density: 80,
          color: '#cdc7b2',
          area: [shellParams.w || shellParams.width || 4.5, 2.2, shellParams.d || shellParams.length || 4.5],
        },
      ],
    },
  }
}

// -------------------------------------------------------- drawer (hazy)
// "Room exists UNDEVELOPED... no info surfaces (no score exists)" (brief
// §3). One config, unconditionally — every drawer slug gets the exact same
// room (Undeveloped.jsx), because there is no per-film data to stage it
// from.
const HAZY_ENTRY = { pos: [0, 1.55, 2.8], look: [0, 1.3, -3.4], fov: 50 }
const HAZY_CLOSER = { pos: [0, 1.5, -0.6], look: [0, 1.3, -5.2], fov: 46 }

export function hazyConfigFor() {
  return {
    family: 'hazy',
    grade: {
      bg: '#050506',
      fogColor: '#08080a',
      fogDensity: 0.16,
      key: '#141418',
      keyIntensity: 0.4,
      fill: '#0a0a0c',
      ambient: 0.05,
      sat: -1,
      contrast: -0.05,
      hue: 0,
    },
    camera: { ...HAZY_ENTRY },
    place: {},
  }
}

export { HAZY_ENTRY, HAZY_CLOSER }

// -------------------------------------------------- develop (bloom) target
// Phase 3, "certify-develops-the-room" (brief §3: "a rewatch is the
// chemical bath"). The grade a print's faded room blooms TOWARD once
// triggered (useRoomDevelop.js) — reconstructed by undoing fadedConfigFor's
// own 0.4x/1.55x/flat-sat transform above on the same family preset it
// degraded from, plus a small per-family tone standing in for real color. A
// shoebox print has no per-film palette the way a Ledger film does (there
// is no staged CONFIGS[slug] scene to promote into, just the family's own
// preset waking up), so this is a deliberate approximation, not the actual
// eventual Ledger room — the visual point (wireframe/pencil blooming into
// graded color) reads the same either way.
const FAMILY_TONE = {
  'mind-bender': { key: '#5ab0d0', fill: '#22334a', bg: '#10161c' },
  dread: { key: '#8a3a3a', fill: '#241418', bg: '#120c0c' },
  momentum: { key: '#e8c060', fill: '#241f14', bg: '#141008' },
  spectacle: { key: '#e8b060', fill: '#3a2e22', bg: '#1a140c' },
  'intimate-tension': { key: '#c98a4a', fill: '#2a3038', bg: '#120e0a' },
  'weird-fable': { key: '#4fc8d6', fill: '#2a1c4a', bg: '#0e0c1a' },
}

export function developedGradeFor(print) {
  const family = familyForGenres(print?.genres)
  const preset = PRESETS[family] || PRESETS['intimate-tension']
  const pg = preset.grade || {}
  const tone = FAMILY_TONE[family] || FAMILY_TONE['intimate-tension']
  return {
    bg: tone.bg,
    fogColor: tone.bg,
    fogDensity: pg.fogDensity ?? 0.05,
    key: tone.key,
    keyIntensity: pg.keyIntensity ?? 2.2,
    fill: tone.fill,
    ambient: pg.ambient ?? 0.16,
    sat: pg.sat ?? 0,
    contrast: pg.contrast ?? 0,
    hue: 0,
    grain: pg.grain ?? 0.05,
    vignette: pg.vignette ?? 0.55,
    bloomIntensity: pg.bloomIntensity ?? 0.22,
  }
}
