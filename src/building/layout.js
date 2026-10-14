// NO VACANCY, the building. Pure layout: films in, door positions out.
//
// Nothing here is authored per film. A film logged tonight gets a room
// number, a floor and a spot on the walkway from its score alone, which is
// plan ruling 11 ("film 48 must appear correctly with nobody opening an
// editor"). Both prototypes (the Court and the Strip) are laid out by the
// same two functions below so the comparison is about the building, not the
// placement code.

// One room = a door plus its window. Rooms that share a score stand
// shoulder to shoulder under one porch light (93A, 93B, ...); different
// scores keep a little more wall between them.
export const MODULE = 2.2 // metres, door to door inside a tie
export const CLUSTER_GAP = 2.8 // metres, door to door between two scores

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function shortDate(iso) {
  if (!iso) return ''
  const [, m, d] = iso.split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}`
}

// Room number = score x 10. Ties take letters in the order he watched them.
export function numberRooms(films) {
  const byScore = new Map()
  for (const f of films) {
    const k = Math.round(f.score * 10)
    if (!byScore.has(k)) byScore.set(k, [])
    byScore.get(k).push(f)
  }
  const rooms = []
  for (const [k, group] of byScore) {
    group.sort((a, b) => (a.watched || '').localeCompare(b.watched || '') || a.slug.localeCompare(b.slug))
    group.forEach((f, i) => {
      rooms.push({
        slug: f.slug,
        title: f.title,
        score: f.score,
        watched: f.watched,
        palette: f.palette || {},
        tenths: k,
        number: group.length > 1 ? `${k}${String.fromCharCode(65 + i)}` : `${k}`,
        tieIndex: i,
        tieSize: group.length,
      })
    })
  }
  return rooms
}

// Clusters along a 1D line. `target` is where the score says a cluster's
// centre belongs; the solver keeps order and minimum spacing and moves
// clusters as little as it can. Forward pass then backward pass, then the
// whole run is re-centred on its targets if it can be. Good enough for a
// few dozen clusters and fully deterministic.
export function solveLine(clusters, lo, hi) {
  const cs = clusters.slice().sort((a, b) => a.target - b.target)
  for (const c of cs) c.half = ((c.rooms.length - 1) * MODULE) / 2
  let prevEnd = -Infinity
  for (const c of cs) {
    const want = c.target - c.half
    const start = Math.max(want, lo, prevEnd + CLUSTER_GAP)
    c.center = start + c.half
    prevEnd = c.center + c.half
  }
  let nextStart = Infinity
  for (let i = cs.length - 1; i >= 0; i--) {
    const c = cs[i]
    const end = Math.min(c.center + c.half, hi, nextStart - CLUSTER_GAP)
    c.center = end - c.half
    nextStart = c.center - c.half
  }
  return cs
}

function clusterRooms(rooms) {
  const m = new Map()
  for (const r of rooms) {
    if (!m.has(r.tenths)) m.set(r.tenths, { tenths: r.tenths, rooms: [] })
    m.get(r.tenths).rooms.push(r)
  }
  return [...m.values()]
}

// ---------------------------------------------------------------- the Court
//
// A U of stucco around a courtyard, open to the road (+z). Each floor is a
// whole score band: the fives on the ground, the nines on top, and the two
// tens in a penthouse on the roof. Along a floor the walkway runs from the
// left tip, round the back, to the right tip, and x.0 to x.9 is spread over
// that run, so the wall between two doors is the gap between two numbers.

export const COURT = {
  xL: -20,
  xR: 20,
  zB: -14.4,
  zF: 10,
  walk: 2.4, // walkway depth in front of the doors
  depth: 8, // room depth behind the facade
  storey: 3.2,
  tipPad: 1.2,
  cornerPad: 1.0,
}

function courtSegments() {
  const { xL, xR, zB, zF } = COURT
  // Each segment: start point, unit direction along the walkway, door facing.
  return [
    { a: [xL, zF], dir: [0, -1], len: zF - zB, rotY: Math.PI / 2 },
    { a: [xL, zB], dir: [1, 0], len: xR - xL, rotY: 0 },
    { a: [xR, zB], dir: [0, 1], len: zF - zB, rotY: -Math.PI / 2 },
  ]
}

// Usable walkway, as intervals of path length with the corners and tips cut out.
function courtIntervals() {
  const segs = courtSegments()
  const out = []
  let s0 = 0
  segs.forEach((g, i) => {
    const lo = s0 + (i === 0 ? COURT.tipPad : COURT.cornerPad)
    const hi = s0 + g.len - (i === segs.length - 1 ? COURT.tipPad : COURT.cornerPad)
    out.push([lo, hi])
    s0 += g.len
  })
  return out
}

function usableLength() {
  return courtIntervals().reduce((t, [a, b]) => t + (b - a), 0)
}

// Usable coordinate u -> path length s -> world point + facing.
function courtPoint(u) {
  const ivs = courtIntervals()
  let s = ivs[ivs.length - 1][1]
  for (const [a, b] of ivs) {
    if (u <= b - a) { s = a + u; break }
    u -= b - a
  }
  const segs = courtSegments()
  let acc = 0
  for (const g of segs) {
    if (s <= acc + g.len + 1e-6) {
      const t = s - acc
      return { x: g.a[0] + g.dir[0] * t, z: g.a[1] + g.dir[1] * t, rotY: g.rotY }
    }
    acc += g.len
  }
  const g = segs[segs.length - 1]
  return { x: g.a[0] + g.dir[0] * g.len, z: g.a[1] + g.dir[1] * g.len, rotY: g.rotY }
}

export function layoutCourt(films) {
  const rooms = numberRooms(films)
  const minBand = Math.min(5, ...rooms.map((r) => Math.floor(r.tenths / 10)))
  const bands = []
  for (let b = minBand; b <= 9; b++) bands.push(b)
  const floors = bands.map((b, i) => ({ band: b, index: i, y: i * COURT.storey, rooms: [] }))
  const roof = { band: 10, index: bands.length, y: bands.length * COURT.storey, rooms: [] }

  const U = usableLength()
  for (const fl of floors) {
    const mine = rooms.filter((r) => Math.floor(r.tenths / 10) === fl.band)
    const clusters = clusterRooms(mine)
    // x.0 sits at u = 0 and x.9 at the far tip.
    for (const c of clusters) c.target = ((c.tenths % 10) / 9) * U
    for (const c of solveLine(clusters, 0, U)) {
      c.rooms.forEach((r, i) => {
        const u = c.center - c.half + i * MODULE
        const p = courtPoint(Math.max(0, Math.min(U, u)))
        fl.rooms.push({ ...r, floor: fl.index, x: p.x, y: fl.y, z: p.z, rotY: p.rotY, cluster: c.tenths })
      })
    }
  }

  // The tens: a penthouse on the roof over the back wing, doors to the road.
  const tens = rooms.filter((r) => r.tenths >= 100)
  const zPent = COURT.zB - 2.6
  tens.forEach((r, i) => {
    const x = (i - (tens.length - 1) / 2) * MODULE
    roof.rooms.push({ ...r, floor: roof.index, x, y: roof.y, z: zPent, rotY: 0, cluster: r.tenths })
  })

  return { kind: 'court', floors, roof, rooms: [...floors.flatMap((f) => f.rooms), ...roof.rooms], zPent }
}

// ---------------------------------------------------------------- the Strip
//
// One storey, one long row, doors to the parking lot. Highest score next to
// the office, then down the line. Every tenth of a point that NOBODY scored
// adds STRIP_STEP metres of blank wall, so the 5.4 to 6.7 hole is twelve
// empty tenths of stucco no matter how crowded the nines get.

export const STRIP_STEP = 2.2
export const STRIP_X0 = 3

export function layoutStrip(films) {
  const rooms = numberRooms(films)
  const clusters = clusterRooms(rooms).sort((a, b) => b.tenths - a.tenths)
  const out = []
  const ticks = []
  let x = STRIP_X0 + (100 - clusters[0].tenths) * STRIP_STEP
  let prev = null
  for (const c of clusters) {
    if (prev) {
      const empty = prev.tenths - c.tenths - 1
      const start = x
      x += CLUSTER_GAP + empty * STRIP_STEP
      // A whole point boundary crossed in this stretch gets a mark, placed
      // where it falls among the empty tenths.
      for (let s = Math.floor(prev.tenths / 10) * 10; s > c.tenths; s -= 10) {
        if (s > prev.tenths || s <= c.tenths) continue
        const k = prev.tenths - s + 0.5 // tenths walked past to reach the line
        ticks.push({ score: s / 10, x: start + (k / (prev.tenths - c.tenths)) * (x - start) })
      }
    }
    c.rooms.forEach((r, i) => {
      out.push({ ...r, floor: 0, x: x + i * MODULE, y: 0, z: 0, rotY: 0, cluster: c.tenths })
    })
    x += (c.rooms.length - 1) * MODULE
    prev = c
  }
  const xEnd = x + 6
  return { kind: 'strip', rooms: out, xEnd, ticks }
}
