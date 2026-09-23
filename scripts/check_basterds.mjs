// Le Gamaar walkability check: flood-fill the building from the street spawn
// on a 0.1 m grid, honouring the walker radius (0.28 m) and every blocking
// rect, and fail on (a) any spot that cannot be reached, (b) any floor step
// between neighbouring reachable cells bigger than a stair tread.
//   node scripts/check_basterds.mjs
import { footprintAt, floorAt, SPOTS, EXTENT, SEAT_BLOCKS, FURNITURE } from '../src/rooms/bespoke/basterds/zones.js'

const STEP = 0.1, R = 0.28, MAX_JUMP = 0.12
const blocks = [...SEAT_BLOCKS, ...FURNITURE]
const inR = (r, x, z, pad = 0) => x >= r.minX - pad && x <= r.maxX + pad && z >= r.minZ - pad && z <= r.maxZ + pad
// A walker centre is legal if the whole disc (sampled at 8 rim points + centre) is walkable.
const legal = (x, z) => {
  for (const [dx, dz] of [[0, 0], [R, 0], [-R, 0], [0, R], [0, -R], [R * .7, R * .7], [-R * .7, R * .7], [R * .7, -R * .7], [-R * .7, -R * .7]]) {
    if (!footprintAt(x + dx, z + dz)) return false
  }
  return !blocks.some((b) => inR(b, x, z, R))
}
const nx = Math.ceil((EXTENT.maxX - EXTENT.minX) / STEP), nz = Math.ceil((EXTENT.maxZ - EXTENT.minZ) / STEP)
const idx = (i, j) => j * nx + i
const X = (i) => EXTENT.minX + (i + 0.5) * STEP, Z = (j) => EXTENT.minZ + (j + 0.5) * STEP
const seen = new Uint8Array(nx * nz)
const start = [Math.round((0 - EXTENT.minX) / STEP), Math.round((7.5 - EXTENT.minZ) / STEP)]
const q = [start]; seen[idx(...start)] = 1
let jumps = [], reached = 0
while (q.length) {
  const [i, j] = q.pop(); reached++
  const y = floorAt(X(i), Z(j))
  for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const a = i + di, b = j + dj
    if (a < 0 || b < 0 || a >= nx || b >= nz || seen[idx(a, b)]) continue
    if (!legal(X(a), Z(b))) continue
    const dy = Math.abs(floorAt(X(a), Z(b)) - y)
    if (dy > MAX_JUMP) { jumps.push([X(a).toFixed(2), Z(b).toFixed(2), dy.toFixed(2)]); continue }
    seen[idx(a, b)] = 1; q.push([a, b])
  }
}
let ok = true
console.log('reachable cells:', reached, `(${(reached * STEP * STEP).toFixed(0)} m2)`)
for (const [name, s] of Object.entries(SPOTS)) {
  const i = Math.round((s.pos[0] - EXTENT.minX) / STEP - 0.5), j = Math.round((s.pos[2] - EXTENT.minZ) / STEP - 0.5)
  let hit = false
  for (let di = -3; di <= 3 && !hit; di++) for (let dj = -3; dj <= 3 && !hit; dj++) if (seen[idx(i + di, j + dj)]) hit = true
  console.log(hit ? '  ok  ' : '  FAIL', name.padEnd(11), s.pos.map((v) => v.toFixed(2)).join(', '))
  if (!hit) ok = false
}
if (jumps.length) { ok = false; console.log('FLOOR JUMPS (x, z, dy):', jumps.slice(0, 12)) }
console.log(ok ? 'PASS' : 'FAIL')
process.exit(ok ? 0 : 1)
