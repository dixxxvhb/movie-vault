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
export const rakeAt = (z) => rake(0, z)

// The balcony and the projection booth in it
export const BOOTH_Y = 3.2
// La Louisiane: the bar alcove under the Box, level with the aisle beside it
export const BAR_Y = rake(0, -21)
// Kept for the cellar's own layout code (Cellar.jsx works in its own frame)
export const CELLAR_Y = -3.0

// THE TWO SCENES (docs/VAULT-TWO-SCENE-STANDARD.md). The street is the
// Arrival; everything else is ONE room, the auditorium on premiere night.
// The street doors are a threshold, not a walkway: touching them cuts you
// into the house (Basterds.jsx), so the two scenes share no footprint.
//
// Each footprint: id, zone, rect {minX, maxX, minZ, maxZ}, floor(x, z).
// Where footprints overlap, the first match wins, so doorway strips come first.
export const FOOTPRINTS = [
  // --- openings --------------------------------------------------------
  { id: 'door-bar', zone: 'bar', rect: { minX: 7.6, maxX: 8.6, minZ: -21.6, maxZ: -20.4 }, floor: flat(rake(0, -21)) },
  { id: 'gap-behindE', zone: 'behind', rect: { minX: 7.0, maxX: 7.9, minZ: -32.8, maxZ: -31.2 }, floor: flat(APRON_Y) },
  { id: 'gap-behindW', zone: 'behind', rect: { minX: -8.0, maxX: -7.1, minZ: -32.8, maxZ: -31.2 }, floor: flat(APRON_Y) },
  { id: 'door-booth', zone: 'booth', rect: { minX: 1.6, maxX: 2.4, minZ: -6.9, maxZ: -5.5 }, floor: flat(BOOTH_Y) },

  // --- the Arrival: the street ----------------------------------------
  { id: 'rue', zone: 'rue', rect: { minX: -10, maxX: 10, minZ: 0.6, maxZ: 10 }, floor: flat(0) },

  // --- the Room ---------------------------------------------------------
  // the back crossing, level with the doors, under the balcony front
  { id: 'crossing', zone: 'house', rect: { minX: -8.8, maxX: 9.8, minZ: -13.2, maxZ: -11.0 }, floor: flat(0) },
  // the stalls on their rake, down to the apron
  { id: 'stalls', zone: 'house', rect: { minX: -8.8, maxX: 8, minZ: -31.6, maxZ: -13.2 }, floor: rake },
  // the stair up the north-west corner to the balcony (0 at z -12.4, BOOTH_Y at z -6.2)
  { id: 'stair', zone: 'house', rect: { minX: -10, maxX: -8.8, minZ: -13.2, maxZ: -5.0 },
    floor: rampZ(-12.4, 0, -6.2, BOOTH_Y) },
  // the balcony across the back, with the booth in it
  { id: 'balcony', zone: 'balcony', rect: { minX: -8.8, maxX: 9.8, minZ: -11.0, maxZ: -5.0 }, floor: flat(BOOTH_Y) },
  // behind the screen: the wings and the nitrate
  { id: 'behind', zone: 'behind', rect: { minX: -8, maxX: 7.9, minZ: -34.6, maxZ: -32.6 }, floor: flat(APRON_Y) },
  // La Louisiane, in the alcove under the Box
  { id: 'bar', zone: 'bar', rect: { minX: 8.6, maxX: 15.0, minZ: -26.0, maxZ: -16.0 }, floor: flat(rake(0, -21)) },
]

// The booth, inside the balcony's back: its walls block, its door is the gap.
export const BOOTH = { minX: -3.0, maxX: 2.0, minZ: -7.4, maxZ: -5.0 }
export const ROOM_DOORS = { x: 0, z: -11.0, w: 2.2 }      // the double doors under the balcony front

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

// The lobby's pieces (LobbyProps.jsx reads these).
export const HATCH = { x0: -6.4, x1: -5.2, z0: -12.9, z1: -12.1 }   // glass in the crossing floor, chapter 1
export const VITRINE = { x: -6.22, z: -5.2, w: 0.55, d: 1.0, h: 1.0 }  // the ravine case, chapter 2
export const COUNTER = { x: 6.3, z0: -4.3, z1: -2.5, h: 1.0 }         // milk and strudel

const BAL_RAIL = 0.14
export const FURNITURE = [
  { minX: -8.25, maxX: -6.55, minZ: 6.55, maxZ: 8.25 },    // the Morris column
  { minX: 5.7, maxX: 6.1, minZ: 3.2, maxZ: 3.6 },          // the street lamp
  { minX: -8.95, maxX: -4.85, minZ: 3.45, maxZ: 5.15 },    // the staff car
  { minX: 3.55, maxX: 4.25, minZ: 0.6, maxZ: 1.6 },        // the ladder foot
  { minX: 4.7, maxX: 5.5, minZ: 1.0, maxZ: 1.6 },          // the letter crate
  { minX: -8.8, maxX: 9.8, minZ: -11.0 - BAL_RAIL, maxZ: -11.0 + BAL_RAIL },  // the balcony front (and the wall under it)
  { minX: -8.8 - BAL_RAIL / 2, maxX: -8.8 + BAL_RAIL / 2, minZ: -12.3, maxZ: -6.4 },  // the stair's balustrade
  // the booth's walls, all but its door
  { minX: BOOTH.minX, maxX: BOOTH.maxX, minZ: BOOTH.minZ - 0.08, maxZ: BOOTH.minZ + 0.08 },
  { minX: BOOTH.minX - 0.08, maxX: BOOTH.minX + 0.08, minZ: BOOTH.minZ, maxZ: BOOTH.maxZ },
  { minX: BOOTH.maxX - 0.08, maxX: BOOTH.maxX + 0.08, minZ: BOOTH.minZ, maxZ: -6.9 },
  { minX: -7.1, maxX: 1.1, minZ: -34.6, maxZ: -33.6 },    // the nitrate stack
  { minX: 7.9, maxX: 8.14, minZ: -24.5, maxZ: -21.6 },    // the rail across the bar arch
  { minX: 7.9, maxX: 8.14, minZ: -20.4, maxZ: -17.5 },
  { minX: 10.4, maxX: 11.6, minZ: -23.1, maxZ: -18.9 },   // La Louisiane's table
  { minX: 14.0, maxX: 15.0, minZ: -24.6, maxZ: -17.4 },   // its bar
  { minX: 8.7, maxX: 9.9, minZ: -25.3, maxZ: -24.1 },     // Wilhelm's table
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
  // the Arrival
  rue:        { pos: at(0, 9.2), look: [0, 5.2, 0] },
  morris:     { pos: at(-5.6, 5.9), look: [-7.4, 1.7, 7.4] },
  ladder:     { pos: at(3.6, 3.4), look: [4.4, 1.6, 0.6] },
  doors:      { pos: at(0, 2.6), look: [0, 1.6, 0] },
  // the Room
  house:      { pos: at(0, -11.7), look: [0, -0.6, -31] },
  hatch:      { pos: at(-4.6, -12.5, 0.1), look: [-5.8, -0.6, -12.5] },
  aisle:      { pos: at(0, -13.9), look: [0, -1.6, -30] },
  seats:      { pos: at(-0.2, -16.9), look: [-1.6, 0.3, -18.2] },
  'seats-reich': { pos: at(0.2, -16.9), look: [1.6, 0.3, -18.2] },
  cases:      { pos: at(-6.9, -14.0), look: [-8.8, 0.9, -21.0] },
  case2:      { pos: at(-6.95, -19.5), look: [-8.8, 1.6, -19.5] },
  screen:     { pos: at(0, -24), look: [0, -0.2, -31.5] },
  box:        { pos: at(0.4, -17.4), look: [6.2, 3.3, -21.4] },
  bridget:    { pos: at(-0.35, -23.0), look: [-1.84, -0.35, -23.55] },
  stair:      { pos: at(-7.6, -12.4), look: [-9.4, 2.4, -7] },
  rail:       { pos: at(0.4, -10.4), look: [0, -1.4, -26] },
  porthole:   { pos: at(0.85, -7.0), look: [0.2, -0.9, -30] },
  booth:      { pos: at(1.2, -6.0), look: [-2.4, 3.8, -6.8] },
  boothdoor:  { pos: at(3.6, -7.8), look: [2.0, 4.6, -6.2] },
  behind:     { pos: at(-1.2, -32.75), look: [-2.4, -1.2, -34.3] },
  cigarette:  { pos: at(2.6, -32.8), look: [3.2, -1.3, -34.1] },
  bar:        { pos: at(9.2, -21.0), look: [14, -0.6, -21] },
  deck:       { pos: at(9.75, -21.1, -0.15), look: [10.75, BAR_Y + 1.05, -21.05] },
  hand:       { pos: at(12.3, -24.4), look: [14.2, BAR_Y + 1.3, -23.7] },
  shoe:       { pos: at(9.2, -23.4), look: [10.55, BAR_Y + 0.1, -22.8] },
  table:      { pos: at(9.2, -19.0), look: [12.6, BAR_Y + 0.7, -22.4] },
  boxview:    { pos: at(0.4, -17.4), look: [6.2, 3.3, -21.4] },
}

// Where the threshold lands you, and where leaving puts you back.
export const ROOM_ENTRY = SPOTS.house
export const STREET_RETURN = { pos: at(0, 2.2), look: [0, 1.6, 9] }
