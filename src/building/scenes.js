import * as THREE from 'three'
import { Batch, frame, at } from './geo.js'
import { Atlas, drawPlate, drawCard, drawPaint, drawSign } from './atlas.js'
import { COURT, layoutCourt, shortDate } from './layout.js'

// The Court is built into five merged layers, one draw call each:
//   arch    lit stucco, slabs, rails, frames          (MeshStandard, vertex colour)
//   doors   the door panels, pickable                 (MeshStandard, vertex colour)
//   glow    windows, light under doors, bulbs         (unlit, bloom catches it)
//   pools   soft light on floors and walls            (additive)
//   words   numbers, cards, floor bands, the sign     (one atlas)

const C = {
  stucco: '#b8a487',
  stuccoDark: '#8f7e66',
  trim: '#e2d8c3',
  slab: '#8a847a',
  rail: '#d9d2c2',
  door: '#2f605b',
  roof: '#4b443b',
  court: '#56514a',
  asphalt: '#1e1d1c',
  road: '#151514',
  paint: '#d8cfb8',
  sodium: '#ffb35c',
  pool: '#2fb6c9',
}

export const EYE = 1.62
export const OFFICE_TAG = -2
const SURF = 0.2 // walkway slab top above a floor's datum

const BAND_NAMES = { 1: 'ONES', 2: 'TWOS', 3: 'THREES', 4: 'FOURS', 5: 'FIVES', 6: 'SIXES', 7: 'SEVENS', 8: 'EIGHTS', 9: 'NINES', 10: 'TENS' }
export function bandName(b) { return `THE ${BAND_NAMES[b] || b}` }

function warmMix(hex, t = 0.35) {
  const a = new THREE.Color(hex || '#c9b48a')
  return a.lerp(new THREE.Color('#ffcf8a'), t)
}

function newLayers() {
  return { arch: new Batch(), doors: new Batch(), glow: new Batch(), pools: new Batch(), words: new Batch(), atlas: new Atlas() }
}

// One room on a facade: door, frame, window, number, card, light.
function addRoom(L, room, idx, pending) {
  const { r, f } = frame(room.rotY)
  const base = [room.x, room.y + SURF, room.z]
  const up = [0, 1, 0]
  const acc = room.palette?.acc || '#c9b48a'

  // the door, set into the facade
  L.doors.box(at(base, r, f, 0, 1.03, 0.0), r, 0.9, 2.06, 0.08, C.door, { tag: idx })
  // frame
  L.arch.box(at(base, r, f, -0.5, 1.07, 0.03), r, 0.1, 2.14, 0.1, C.trim)
  L.arch.box(at(base, r, f, 0.5, 1.07, 0.03), r, 0.1, 2.14, 0.1, C.trim)
  L.arch.box(at(base, r, f, 0, 2.17, 0.03), r, 1.1, 0.1, 0.1, C.trim)
  // the window, lit from inside in the film's own colour
  const wx = 1.2
  L.glow.quad(at(base, r, f, wx, 1.42, 0.02), r, up, 1.0, 0.92, warmMix(acc, 0.3), undefined, -1, 0.95)
  L.arch.box(at(base, r, f, wx, 0.92, 0.06), r, 1.16, 0.08, 0.14, C.trim)
  L.arch.box(at(base, r, f, wx, 1.92, 0.04), r, 1.16, 0.06, 0.08, C.trim)
  L.arch.box(at(base, r, f, wx - 0.55, 1.42, 0.04), r, 0.06, 1.0, 0.08, C.trim)
  L.arch.box(at(base, r, f, wx + 0.55, 1.42, 0.04), r, 0.06, 1.0, 0.08, C.trim)
  // light leaking under the door
  L.glow.quad(at(base, r, f, 0, 0.025, 0.045), r, up, 0.86, 0.04, acc, undefined, -1, 2.2)
  // the floor pool it throws, and a wash on the stucco
  L.pools.quad(at(base, r, f, 0.55, 0.015, 1.1), r, f, 3.0, 2.4, acc, undefined, -1, 0.55)
  L.pools.quad(at(base, r, f, 0.55, 1.4, 0.035), r, up, 3.0, 2.6, warmMix(acc, 0.5), undefined, -1, 0.16)
  // number plate and window card, painted once into the atlas
  pending.push({ cell: L.atlas.add(160, 80, drawPlate(room.number)), c: at(base, r, f, 0, 1.62, 0.055), r, w: 0.3, h: 0.15 })
  pending.push({
    cell: L.atlas.add(256, 150, drawCard(room.title, `${room.number} · ${shortDate(room.watched)}`)),
    c: at(base, r, f, wx - 0.12, 1.16, 0.03), r, w: 0.62, h: 0.36,
  })
}

// A porch bulb over each run of rooms that share a score.
function addPorchLights(L, rooms) {
  const by = new Map()
  for (const rm of rooms) {
    const k = `${rm.floor}:${rm.cluster}`
    if (!by.has(k)) by.set(k, [])
    by.get(k).push(rm)
  }
  for (const group of by.values()) {
    const a = group[0]
    const b = group[group.length - 1]
    const { r, f } = frame(a.rotY)
    const mid = [(a.x + b.x) / 2, a.y + SURF, (a.z + b.z) / 2]
    // Midpoint between door centres; shift right by half a window so the bulb
    // sits over the run, not over the first door.
    const c = at(mid, r, f, 0.6, 2.5, 0.16)
    L.glow.box(c, r, 0.14, 0.18, 0.14, '#ffd9a0', {})
    L.pools.quad([c[0], c[1] - 0.4, c[2]], r, [0, 1, 0], 2.2, 1.6, '#ffc27a', undefined, -1, 0.22)
  }
}

function flushWords(L, pending) {
  L.atlas.build()
  for (const p of pending) {
    L.words.quad(p.c, p.r, p.up || [0, 1, 0], p.w, p.h, '#ffffff', p.cell.rect)
  }
}

function sodiumLight(L, x, y, z, r = [1, 0, 0], strength = 1) {
  L.glow.box([x, y, z], r, 0.5, 0.06, 0.18, C.sodium, {})
  L.pools.quad([x, y - 2.9, z], r, [0, 0, 1], 4.4, 4.4, C.sodium, undefined, -1, 0.3 * strength)
}

// --------------------------------------------------------------- the Court

export function buildCourt(films) {
  const lay = layoutCourt(films)
  const L = newLayers()
  const pending = []
  const { xL, xR, zB, zF, walk, depth, storey } = COURT
  const nF = lay.floors.length
  const Htot = nF * storey

  // wings, full height
  L.arch.aabb(xL - depth, 0, zB, xL, Htot, zF, C.stucco, { top: C.roof })
  L.arch.aabb(xR, 0, zB, xR + depth, Htot, zF, C.stucco, { top: C.roof })
  L.arch.aabb(xL - depth, 0, zB - depth, xR + depth, Htot, zB, C.stucco, { top: C.roof })

  for (let i = 0; i <= nF; i++) {
    const y = i * storey
    const roofLevel = i === nF
    // walkway slab (the ground floor gets a low raised walk)
    const y0 = i === 0 ? 0 : y - 0.45
    const y1 = y + SURF
    L.arch.aabb(xL, y0, zB, xL + walk, y1, zF, C.slab)
    L.arch.aabb(xR - walk, y0, zB, xR, y1, zF, C.slab)
    L.arch.aabb(xL + walk, y0, zB, xR - walk, y1, zB + walk, C.slab)
    if (i === 0) continue
    // railings (a parapet on the roof)
    const rh = roofLevel ? 1.0 : 1.05
    const rail = (x0, z0, x1, z1) => {
      if (roofLevel) { L.arch.aabb(x0, y1, z0, x1, y1 + rh, z1, C.stuccoDark); return }
      L.arch.aabb(x0, y1 + rh - 0.06, z0, x1, y1 + rh, z1, C.rail)
      L.arch.aabb(x0, y1 + 0.45, z0, x1, y1 + 0.5, z1, C.rail)
    }
    rail(xL + walk - 0.06, zB + walk, xL + walk, zF)
    rail(xR - walk, zB + walk, xR - walk + 0.06, zF)
    rail(xL + walk, zB + walk - 0.06, xR - walk, zB + walk)
    if (!roofLevel) {
      for (let z = zB + walk + 1.4; z < zF; z += 1.4) {
        L.arch.aabb(xL + walk - 0.05, y1, z, xL + walk - 0.01, y1 + rh, z + 0.04, C.rail)
        L.arch.aabb(xR - walk + 0.01, y1, z, xR - walk + 0.05, y1 + rh, z + 0.04, C.rail)
      }
      for (let x = xL + walk + 1.4; x < xR - walk; x += 1.4) {
        L.arch.aabb(x, y1, zB + walk - 0.05, x + 0.04, y1 + rh, zB + walk - 0.01, C.rail)
      }
    }
  }
  // columns holding the walkways up
  for (let z = zB + walk; z <= zF; z += 6.1) {
    L.arch.aabb(xL + walk - 0.3, 0, z - 0.15, xL + walk, Htot, z + 0.15, C.trim)
    L.arch.aabb(xR - walk, 0, z - 0.15, xR - walk + 0.3, Htot, z + 0.15, C.trim)
  }
  for (let x = xL + walk + 6; x < xR - walk - 2; x += 6) {
    L.arch.aabb(x - 0.15, 0, zB + walk - 0.3, x + 0.15, Htot, zB + walk, C.trim)
  }
  // stair towers at the two tips
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? xL - 0.4 : xR - walk
    const x1 = sx < 0 ? xL + walk : xR + 0.4
    L.arch.aabb(x0, 0, zF, x1, Htot + 1.4, zF + 3, C.stuccoDark, { top: C.roof })
    for (let i = 0; i < nF; i++) {
      pending.push({
        cell: L.atlas.add(256, 72, drawPaint(`STAIRS ${lay.floors[i].band}`, { color: '#efe4cc', spacing: 3 })),
        c: [(x0 + x1) / 2, i * storey + 2.2, zF + 3.02], r: [1, 0, 0], w: 1.7, h: 0.48,
      })
    }
  }

  // floor bands, painted on the fascia above each walkway, facing the yard
  lay.floors.forEach((fl, i) => {
    const label = `${bandName(fl.band)}   ${fl.band}.0 TO ${fl.band}.9   ${fl.rooms.length} ${fl.rooms.length === 1 ? 'ROOM' : 'ROOMS'}`
    for (const x of [0]) {
      pending.push({
        cell: L.atlas.add(1024, 64, drawPaint(label, { spacing: 6 })),
        c: [x, (i + 1) * storey - 0.13, zB + walk + 0.02], r: [1, 0, 0], w: 9.6, h: 0.6,
      })
    }
    // walkway lights, a bank per floor
    const y = (i + 1) * storey - 0.48
    for (let z = zB + walk + 3; z < zF - 1; z += 7) {
      sodiumLight(L, xL + walk / 2, y, z, [0, 0, 1], 0.8)
      sodiumLight(L, xR - walk / 2, y, z, [0, 0, 1], 0.8)
    }
    for (let x = xL + walk + 4; x < xR - walk - 2; x += 7) sodiumLight(L, x, y, zB + walk / 2, [1, 0, 0], 0.8)
  })

  // the roof: penthouse for the tens, deck, the rooftop name
  const zP = lay.zPent
  const pentW = Math.max(8, lay.roof.rooms.length * 2.2 + 4)
  L.arch.aabb(-pentW / 2, Htot + SURF, zP - 6, pentW / 2, Htot + 3.5, zP, '#c9b89c', { top: C.roof })
  L.arch.aabb(-pentW / 2 - 0.3, Htot + 3.5, zP - 6.3, pentW / 2 + 0.3, Htot + 3.75, zP + 1.6, C.trim)
  pending.push({
    cell: L.atlas.add(1024, 64, drawPaint(`${bandName(10)}   10.0   ${lay.roof.rooms.length} ROOMS`, { spacing: 6 })),
    c: [0, Htot + 3.62, zP + 1.61], r: [1, 0, 0], w: 6.4, h: 0.4,
  })
  pending.push({
    cell: L.atlas.add(1024, 256, drawPaint('THE VAULT', { color: '#f3e7c9', weight: 700, font: 'Georgia, serif', spacing: 18 })),
    c: [0, Htot + 6.2, zP - 4], r: [1, 0, 0], w: 13, h: 3.2,
  })
  L.arch.aabb(-6, Htot + 3.75, zP - 4.2, -5.8, Htot + 4.7, zP - 4.0, C.stuccoDark)
  L.arch.aabb(5.8, Htot + 3.75, zP - 4.2, 6, Htot + 4.7, zP - 4.0, C.stuccoDark)
  L.pools.quad([0, Htot + 6.2, zP - 4.05], [1, 0, 0], [0, 1, 0], 16, 6, '#ffe2b0', undefined, -1, 0.18)

  // courtyard: concrete, the pool, the lot out front, the road
  L.arch.aabb(xL + walk, -0.05, zB + walk, xR - walk, 0, zF + 3, C.court)
  L.arch.aabb(-60, -0.1, zF + 3, 60, -0.02, zF + 16, C.asphalt)
  L.arch.aabb(-60, -0.12, zF + 16, 60, -0.03, zF + 26, C.road)
  for (let x = -58; x < 60; x += 6) L.arch.aabb(x, -0.03, zF + 20.9, x + 3, -0.02, zF + 21.1, '#c9b48a')
  const pool = { x0: -7, x1: 7, z0: -6, z1: 2 }
  L.arch.aabb(pool.x0 - 0.5, 0, pool.z0 - 0.5, pool.x1 + 0.5, 0.12, pool.z0, C.trim)
  L.arch.aabb(pool.x0 - 0.5, 0, pool.z1, pool.x1 + 0.5, 0.12, pool.z1 + 0.5, C.trim)
  L.arch.aabb(pool.x0 - 0.5, 0, pool.z0, pool.x0, 0.12, pool.z1, C.trim)
  L.arch.aabb(pool.x1, 0, pool.z0, pool.x1 + 0.5, 0.12, pool.z1, C.trim)
  L.glow.quad([0, 0.03, (pool.z0 + pool.z1) / 2], [1, 0, 0], [0, 0, -1], pool.x1 - pool.x0, pool.z1 - pool.z0, C.pool, undefined, -1, 0.55)
  L.pools.quad([0, 0.05, (pool.z0 + pool.z1) / 2], [1, 0, 0], [0, 0, -1], 26, 18, C.pool, undefined, -1, 0.18)

  // the pole sign by the road
  const sp = [xR + 6, 0, zF + 9]
  L.arch.aabb(sp[0] - 0.18, 0, sp[2] - 0.18, sp[0] + 0.18, 9, sp[2] + 0.18, '#3d3a36')
  pending.push({ cell: L.atlas.add(640, 420, drawSign('The Vault', 'MOTOR COURT')), c: [sp[0], 10.6, sp[2] + 0.2], r: [1, 0, 0], w: 6, h: 3.95 })
  L.arch.aabb(sp[0] - 3.1, 8.55, sp[2] - 0.2, sp[0] + 3.1, 12.65, sp[2] + 0.15, '#22272b')
  L.pools.quad([sp[0], 10.6, sp[2] + 0.25], [1, 0, 0], [0, 1, 0], 9, 6, '#fff0cf', undefined, -1, 0.12)

  // The office, Room 4: the motel room that was always here, with the wall
  // of Polaroids inside it. Out front by the road, door to the lot, the
  // first door a visitor reaches.
  const office = { x0: xL - depth - 3, x1: xL - 1.2, z0: zF + 0.8, z1: zF + 5.5, h: 3.8 }
  L.arch.aabb(office.x0, 0, office.z0, office.x1, office.h, office.z1, '#c4b090', { top: C.roof })
  L.arch.aabb(office.x0 - 0.3, office.h, office.z0 - 0.3, office.x1 + 0.3, office.h + 0.25, office.z1 + 1.6, C.trim)
  const od = { x: office.x1 - 2.2, z: office.z1 }
  {
    const r = [1, 0, 0]
    const f = [0, 0, 1]
    const base = [od.x, 0, od.z]
    L.doors.box(at(base, r, f, 0, 1.03, 0), r, 0.9, 2.06, 0.08, '#6b2f2a', { tag: OFFICE_TAG })
    L.arch.box(at(base, r, f, -0.5, 1.07, 0.03), r, 0.1, 2.14, 0.1, C.trim)
    L.arch.box(at(base, r, f, 0.5, 1.07, 0.03), r, 0.1, 2.14, 0.1, C.trim)
    L.arch.box(at(base, r, f, 0, 2.17, 0.03), r, 1.1, 0.1, 0.1, C.trim)
    L.glow.quad(at(base, r, f, 0, 0.025, 0.045), r, [0, 1, 0], 0.86, 0.04, '#ffd28f', undefined, -1, 2.2)
    // the big office window, lit, with the wall's own count in it
    L.glow.quad(at(base, r, f, -3.4, 1.55, 0.02), r, [0, 1, 0], 4.2, 1.7, '#ffd28f', undefined, -1, 1.0)
    L.arch.box(at(base, r, f, -3.4, 0.66, 0.06), r, 4.4, 0.1, 0.14, C.trim)
    pending.push({ cell: L.atlas.add(160, 80, drawPlate('4')), c: at(base, r, f, 0, 1.62, 0.055), r, w: 0.3, h: 0.15 })
    pending.push({
      cell: L.atlas.add(256, 150, drawCard('The wall', `4 · ${lay.rooms.length} films`)),
      c: at(base, r, f, -2.2, 1.1, 0.03), r, w: 0.62, h: 0.36,
    })
    pending.push({ cell: L.atlas.add(512, 96, drawPaint('OFFICE', { color: '#f6ead0', spacing: 14 })), c: [od.x - 2.2, office.h - 0.4, office.z1 + 0.02], r, w: 3.2, h: 0.6 })
    L.pools.quad([od.x - 2, 0.02, office.z1 + 2.2], r, f, 9, 5, '#ffcf8a', undefined, -1, 0.4)
  }

  lay.rooms.forEach((rm, i) => addRoom(L, rm, i, pending))
  addPorchLights(L, lay.rooms)
  flushWords(L, pending)

  // ---- where you can stand
  const ground = {
    allow: [
      [xL + 0.35, xR - 0.35, zB + 0.35, zF + 15],
      [xL - depth - 6, xR + depth + 6, zF + 3.4, zF + 15],
    ],
    block: [
      [pool.x0 - 0.5, pool.x1 + 0.5, pool.z0 - 0.5, pool.z1 + 0.5],
      [xL - 0.6, xL + walk + 0.3, zF - 0.1, zF + 3.3],
      [xR - walk - 0.3, xR + 0.6, zF - 0.1, zF + 3.3],
      [sp[0] - 0.5, sp[0] + 0.5, sp[2] - 0.5, sp[2] + 0.5],
      [office.x0 - 0.3, office.x1 + 0.3, office.z0 - 0.3, office.z1 + 0.3],
    ],
  }
  const upper = {
    allow: [
      [xL + 0.35, xL + walk - 0.3, zB + 0.35, zF - 0.35],
      [xR - walk + 0.3, xR - 0.35, zB + 0.35, zF - 0.35],
      [xL + 0.35, xR - 0.35, zB + 0.35, zB + walk - 0.3],
    ],
    block: [],
  }
  const roofArea = { allow: [[xL + 0.6, xR - 0.6, zP + 0.35, zB + walk - 0.4]], block: [] }
  const levels = [
    ...lay.floors.map((fl, i) => ({
      label: `${bandName(fl.band)}`, sub: `${fl.band}.0 to ${fl.band}.9`, y: i * storey + SURF, area: i === 0 ? ground : upper,
      landing: i === 0 ? { x: 0, z: zF + 8, yaw: 0 } : { x: xL + walk / 2, z: zF - 1, yaw: 0 },
    })),
    { label: bandName(10), sub: '10.0', y: Htot + SURF, area: roofArea, landing: { x: 0, z: zB + 1.2, yaw: 0 } },
  ]

  return {
    kind: 'court',
    layers: L,
    rooms: lay.rooms,
    levels,
    fog: 0.0105,
    overview: { kind: 'orbit', target: [0, Htot * 0.45, -6], width: 62, elev: 0.36 },
    spawn: { level: 0, x: xL + 7, z: zF + 13, yaw: 0.12 },
    officeDoor: { x: od.x + 2.5, z: od.z + 4.5, yaw: 0.45 },
    stats: lay.floors.map((fl) => ({ band: fl.band, n: fl.rooms.length })).concat([{ band: 10, n: lay.roof.rooms.length }]),
  }
}

export function inArea(area, x, z) {
  const inside = (b) => x >= b[0] && x <= b[1] && z >= b[2] && z <= b[3]
  return area.allow.some(inside) && !area.block.some(inside)
}
