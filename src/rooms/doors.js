// Bloodline doors (VAULT-IMMERSION-BRIEF-v2.md §6). Each `film_links` row
// touching a ledger film becomes one physical door in that film's room.
// `from`/`to` in vault-data.json's `links` array are already slugs (verified
// against the shipped data — every current link resolves straight through
// as a slug, not a title), but a link COULD point at a title that never
// made it past the shoebox/drawer/queue — that's what makes a door LOCKED
// rather than a working connection into another room.
//
// Kept as its own module rather than folded into registry.js/configs.js:
// both of those are mid-edit elsewhere this session for the bespoke-room
// pass, and door specs don't need either file — they resolve purely off
// vault-data.json's own arrays (films/shoebox/drawer/queue).

const MAX_DOORS = 5 // brief §6 cap, weight descending

function slugify(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// What a link's other end actually is, and therefore what its door does:
//   'ledger'  — a live film room, the door works, lands you inside it.
//   'archive' — a shoebox print, the door works, lands you in its faded room.
//   'locked'  — a drawer film, a queue title, or anything not catalogued at
//               all. The connection exists, the memory does not (brief's own
//               words) — the door stands, but never opens.
function resolveTarget(rawSlug, data) {
  const film = (data.films || []).find((f) => f.slug === rawSlug)
  if (film) return { kind: 'ledger', title: film.title, year: film.year }

  const print = (data.shoebox || []).find((a) => a.slug === rawSlug)
  if (print) return { kind: 'archive', title: print.title, year: print.year }

  const drawer = (data.drawer || []).find((a) => a.slug === rawSlug)
  if (drawer) return { kind: 'locked', title: drawer.title, year: drawer.year }

  // queue entries carry no slug of their own (title only) — match on a
  // slugified title as a defensive fallback for a link authored against one
  const queued = (data.queue || []).find((q) => slugify(q.title) === rawSlug)
  if (queued) return { kind: 'locked', title: queued.title, year: queued.year }

  // never catalogued anywhere this app knows about — still a locked door,
  // labelled with whatever the link itself called it
  return { kind: 'locked', title: rawSlug, year: null }
}

// One door spec per link touching `slug` (from either end — a link's
// directionality is about narrative attribution, not which side gets a
// door: brief §6 says "each link renders as a physical door in BOTH rooms").
// Capped at MAX_DOORS by weight descending.
export function doorsForSlug(slug, data) {
  if (!slug || !data?.links?.length) return []
  const touching = data.links.filter((l) => l.from === slug || l.to === slug)
  const specs = touching.map((l) => {
    const otherSlug = l.from === slug ? l.to : l.from
    const target = resolveTarget(otherSlug, data)
    return {
      id: slug + '|' + otherSlug + '|' + l.relation,
      targetSlug: otherSlug,
      relation: l.relation,
      note: l.note,
      weight: l.weight ?? 1,
      kind: target.kind,
      targetTitle: target.title,
      targetYear: target.year,
    }
  })
  specs.sort((a, b) => b.weight - a.weight)
  return specs.slice(0, MAX_DOORS)
}

export const DOOR_CAP = MAX_DOORS
