// LE GAMAAR: the building, as data.
//
// Plan: docs/plans/2026-09-22-le-gamaar-basterds-room.md §3.
//
// The engine's collision world is 2D (x/z) with one floor height per point
// (colliders.js), so two walkable spaces can never share a footprint. This
// file is the whole building expressed that way: a list of FOOTPRINTS, each a
// rect with its own floor function (flat, ramp, rake). Everything else is
// derived from it:
//
//   floorAt(x, z)     the walker's floor (first footprint containing the point)
//   zoneAt(x, z)      which space you are in (drives mounting, grade, audio)
//   blockingRects()   the complement of the walkable union, rasterised at
//                     CELL metres and merged into strips, so walls never need a
//                     hand-placed collider. A doorway is simply two footprints
//                     that overlap.
//
// +z is toward the street. Units are metres. y = 0 is the lobby floor.

export const EYE = 1.55

// Floor helpers
const flat = (y) => () => y
// Linear ramp along z: y0 at z0, y1 at z1, clamped outside.
const rampZ = (z0, y0, z1, y1) => (x, z) => {
  const t = Math.min(1, Math.max(0, (z - z0) / (z1 - z0)))
  return y0 + (y1 - y0) * t
}

// The auditorium rake: the back row is at the entrance level, the floor falls
// 2.2 m toward the screen (stadium rake, so every row clears the one in
// front), then flattens for the apron.
export const RAKE_BACK_Z = -13
export const RAKE_FRONT_Z = -30
export const APRON_Y = -2.2
const rake = rampZ(RAKE_BACK_Z, 0, RAKE_FRONT_Z, APRON_Y)

// Booth / gallery level
export const BOOTH_Y = 3.2
// Cellar level
export const CELLAR_Y = -3.0

// Each footprint: id, zone, rect {minX, maxX, minZ, maxZ}, floor(x, z).
// Order matters only where footprints overlap (doorways): the first match
// wins, so doorway strips are listed before the rooms they join.
export const FOOTPRINTS = [
  // --- doorways (overlap both sides) -----------------------------------
  { id: 'door-street', zone: 'lobby', rect: { minX: -1.4, maxX: 1.4, minZ: -0.6, maxZ: 0.6 }, floor: flat(0) },
  { id: 'door-stairE', zone: 'lobby', rect: { minX: 6.6, maxX: 7.5, minZ: -2.2, maxZ: -1.1 }, floor: flat(0) },
  { id: 'door-stairW', zone: 'lobby', rect: { minX: -7.5, maxX: -6.6, minZ: -9.8, maxZ: -8.7 }, floor: flat(0) },
  { id: 'door-vestibule', zone: 'lobby', rect: { minX: -6.6, maxX: -3.4, minZ: -10.6, maxZ: -9.6 }, floor: flat(0) },
  { id: 'door-auditorium', zone: 'auditorium', rect: { minX: -6.6, maxX: -3.4, minZ: -13.6, maxZ: -12.6 }, floor: flat(0) },
  { id: 'door-gallery', zone: 'booth', rect: { minX: 7.1, maxX: 8.6, minZ: -10.8, maxZ: -9.9 }, floor: flat(BOOTH_Y) },
  { id: 'door-booth', zone: 'booth', rect: { minX: 1.6, maxX: 2.6, minZ: -12.4, maxZ: -10.6 }, floor: flat(BOOTH_Y) },
  { id: 'door-cellar', zone: 'cellar', rect: { minX: -9.2, maxX: -8.4, minZ: -2.6, maxZ: -1.2 }, floor: flat(CELLAR_Y) },
  { id: 'gap-behind', zone: 'behind', rect: { minX: 7.0, maxX: 7.9, minZ: -32.8, maxZ: -31.2 }, floor: flat(APRON_Y) },

  // --- the street --------------------------------------------------------
  { id: 'rue', zone: 'rue', rect: { minX: -10, maxX: 10, minZ: 0.2, maxZ: 10 }, floor: flat(0) },

  // --- the lobby ---------------------------------------------------------
  { id: 'lobby', zone: 'lobby', rect: { minX: -6.8, maxX: 6.8, minZ: -9.8, maxZ: -0.2 }, floor: flat(0) },

  // --- east stair up to the booth (0 at z -2.2, BOOTH_Y at z -8.6) -------
  { id: 'stairE', zone: 'lobby', rect: { minX: 7.3, maxX: 8.6, minZ: -10.0, maxZ: -1.1 },
    floor: rampZ(-2.2, 0, -8.6, BOOTH_Y) },
  // the gallery that runs west to the booth door
  { id: 'gallery', zone: 'booth', rect: { minX: 2.4, maxX: 8.6, minZ: -12.4, maxZ: -10.6 }, floor: flat(BOOTH_Y) },
  // the booth itself
  { id: 'booth', zone: 'booth', rect: { minX: -3.0, maxX: 1.8, minZ: -12.8, maxZ: -10.4 }, floor: flat(BOOTH_Y) },

  // --- west vestibule into the auditorium --------------------------------
  { id: 'vestibule', zone: 'lobby', rect: { minX: -6.8, maxX: -3.2, minZ: -12.8, maxZ: -10.4 }, floor: flat(0) },

  // --- the auditorium (raked) -------------------------------------------
  { id: 'auditorium', zone: 'auditorium', rect: { minX: -8, maxX: 8, minZ: -31.6, maxZ: -13.2 }, floor: rake },

  // --- behind the screen -------------------------------------------------
  { id: 'behind', zone: 'behind', rect: { minX: -8, maxX: 7.9, minZ: -34.6, maxZ: -32.6 }, floor: flat(APRON_Y) },

  // --- west stair down to the cellar (0 at z -8.8, CELLAR_Y at z -2.8) ---
  { id: 'stairW', zone: 'cellar', rect: { minX: -8.6, maxX: -7.3, minZ: -9.8, maxZ: -1.2 },
    floor: rampZ(-8.8, 0, -2.8, CELLAR_Y) },
  // La Louisiane
  { id: 'cellar', zone: 'cellar', rect: { minX: -19, maxX: -9.0, minZ: -11, maxZ: -1.0 }, floor: flat(CELLAR_Y) },
]

// The seating chart: rows are chapters (back = 1, front = 5), the centre
// aisle splits the sides. Seat blocks and furniture block walking.
export const ROWS = 14
export const ROW_Z0 = -15.2
export const ROW_PITCH = 0.95
export const SEAT_W = 0.56
export const BLOCKS = [[-6.6, -1.0], [1.0, 6.6]]
export const SEAT_BLOCKS = BLOCKS.map(([a, b]) => ({
  minX: a, maxX: b, minZ: ROW_Z0 - (ROWS - 1) * ROW_PITCH - 0.35, maxZ: ROW_Z0 + 0.35,
}))
// The street's fixtures (Rue.jsx reads these so a moved prop moves its collider).
export const MORRIS = { pos: [-7.4, 0, 7.4] }
export const LADDER = { pos: [3.9, 0, 1.05], ry: 0, crate: [5.1, 0, 1.3] }

export const FURNITURE = [
  { minX: -8.25, maxX: -6.55, minZ: 6.55, maxZ: 8.25 },    // the Morris column
  { minX: 5.7, maxX: 6.1, minZ: 3.2, maxZ: 3.6 },          // the street lamp
  { minX: -8.95, maxX: -4.85, minZ: 3.45, maxZ: 5.15 },    // the staff car
  { minX: 3.55, maxX: 4.25, minZ: 0.2, maxZ: 1.6 },        // the ladder foot
  { minX: 4.7, maxX: 5.5, minZ: 1.0, maxZ: 1.6 },          // the letter crate
  { minX: -15.7, maxX: -14.3, minZ: -8.2, maxZ: -3.8 },   // La Louisiane table
  { minX: -18.9, maxX: -17.9, minZ: -9.6, maxZ: -2.4 },   // the bar
  { minX: -7.1, maxX: 1.1, minZ: -34.6, maxZ: -33.6 },    // the nitrate stack
]

const inRect = (r, x, z) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ

export function footprintAt(x, z) {
  for (const f of FOOTPRINTS) if (inRect(f.rect, x, z)) return f
  return null
}

export function floorAt(x, z) {
  const f = footprintAt(x, z)
  return f ? f.floor(x, z) : 0
}

export function zoneAt(x, z) {
  const f = footprintAt(x, z)
  return f ? f.zone : 'rue'
}

// The whole building's extent, used for the one bounds rect and the raster.
export const EXTENT = FOOTPRINTS.reduce((e, f) => ({
  minX: Math.min(e.minX, f.rect.minX), maxX: Math.max(e.maxX, f.rect.maxX),
  minZ: Math.min(e.minZ, f.rect.minZ), maxZ: Math.max(e.maxZ, f.rect.maxZ),
}), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity })

// Rasterise the complement of the walkable union into blocking strips.
// CELL 0.2 m over roughly 29 x 45 m is ~33k cells, done once per mount. Runs
// along x are merged per row, then identical runs in consecutive rows are
// merged vertically, which keeps the list to a few hundred rects.
const CELL = 0.2
export function blockingRects(extra = []) {
  const x0 = EXTENT.minX - CELL, x1 = EXTENT.maxX + CELL
  const z0 = EXTENT.minZ - CELL, z1 = EXTENT.maxZ + CELL
  const nx = Math.ceil((x1 - x0) / CELL), nz = Math.ceil((z1 - z0) / CELL)
  const open = (i, j) => {
    const x = x0 + (i + 0.5) * CELL, z = z0 + (j + 0.5) * CELL
    return footprintAt(x, z) !== null && !extra.some((r) => inRect(r, x, z))
  }
  let prev = new Map()        // "i0:i1" -> rect being grown along z
  const out = []
  for (let j = 0; j < nz; j++) {
    const row = new Map()
    let i = 0
    while (i < nx) {
      if (open(i, j)) { i++; continue }
      const s = i
      while (i < nx && !open(i, j)) i++
      const key = s + ':' + i
      const grown = prev.get(key)
      if (grown) { grown.maxZ = z0 + (j + 1) * CELL; row.set(key, grown) }
      else {
        const r = { minX: x0 + s * CELL, maxX: x0 + i * CELL, minZ: z0 + j * CELL, maxZ: z0 + (j + 1) * CELL }
        out.push(r); row.set(key, r)
      }
    }
    prev = row
  }
  return out
}

// Named places. ?spot=<name> lands the walker here; the preview and the
// Dailies aim at these. pos is the camera (eye already added), look a target.
const at = (x, z, dy = 0) => [x, floorAt(x, z) + EYE + dy, z]
export const SPOTS = {
  rue:        { pos: at(0, 9.2), look: [0, 5.2, 0] },
  morris:     { pos: at(-5.6, 5.9), look: [-7.4, 1.7, 7.4] },
  ladder:     { pos: at(3.6, 3.4), look: [4.4, 1.6, 0.6] },
  lobby:      { pos: at(0, -1.2), look: [0, 1.6, -9] },
  floorboard: { pos: at(-4.4, -1.4), look: [-5.6, 0, -2.2] },
  vitrine:    { pos: at(-4.6, -4.2), look: [-6.6, 1.2, -4.8] },
  auditorium: { pos: at(-5, -13.8), look: [0, -0.4, -30] },
  box:        { pos: at(7.4, -17.2), look: [7.0, 3.3, -21.5] },
  porthole:   { pos: at(-0.6, -12.3), look: [-0.6, 0.6, -26] },
  booth:      { pos: at(1.2, -11.2), look: [-2.4, 3.8, -11.8] },
  behind:     { pos: at(6.2, -33.6), look: [-4, 0.2, -33.4] },
  cellar:     { pos: at(-9.8, -1.8), look: [-16, -2.2, -6] },
  table:      { pos: at(-12.5, -4.8), look: [-15, -2.4, -6.2] },
  stair:      { pos: at(4.6, -1.6), look: [8, 1.8, -6] },
  cards:      { pos: at(-4.2, -5.2), look: [-6.7, 1.75, -5.2] },
  'cards-east': { pos: at(4.2, -6.7), look: [6.7, 1.75, -6.7] },
}
