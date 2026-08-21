// Wave M1: the walker's collision world. gradeBus.js pattern — a module-level
// bus that lives above the React tree so a room deep inside the Canvas and
// CameraRig (which sits alongside it, not above it) can share state without
// rooms/* ever importing App.jsx.
//
// Multiple owners can register at once (a room shell + its props + a bespoke
// overlay, later waves). Everything an owner registered is removed in one
// call on unmount — StrictMode double-mounts every effect in dev, so
// clearOwner MUST make re-registration idempotent (register, clear, register
// again leaves exactly one copy behind, never two).

const rectsByOwner = new Map()   // ownerId -> [{minX, minZ, maxX, maxZ, top?}]
const boundsByOwner = new Map()  // ownerId -> {kind:'rect', ...} | {kind:'circle', ...}
const floorByOwner = new Map()   // ownerId -> (x, z) => y

export function registerColliders(ownerId, rects) {
  rectsByOwner.set(ownerId, rects || [])
}

export function setBounds(ownerId, bounds) {
  if (bounds) boundsByOwner.set(ownerId, bounds)
  else boundsByOwner.delete(ownerId)
}

export function registerFloor(ownerId, fn) {
  if (fn) floorByOwner.set(ownerId, fn)
  else floorByOwner.delete(ownerId)
}

export function clearOwner(ownerId) {
  rectsByOwner.delete(ownerId)
  boundsByOwner.delete(ownerId)
  floorByOwner.delete(ownerId)
}

// Wave M3 (Predestination's real loop is the one caller): a single-slot
// pending teleport, consumed by CameraRig's walk branch once per frame,
// BEFORE that frame's normal movement is integrated — so the canonical
// walker position (CameraRig's `walkPos`) and camera.position both land on
// the teleported spot atomically, with no frame where they disagree and no
// leftover velocity direction fighting the new spot. This is the one engine
// touch the M3 spec authorizes; kept as a tiny primitive here (not
// Predestination-specific) so any future room with a real wraparound can
// reuse it the same way. `y` is left alone — every caller so far only wraps
// on the horizontal plane.
let pendingTeleport = null

export function teleportWalker(x, z) {
  pendingTeleport = { x, z }
}

// Called by CameraRig once per frame; returns the pending teleport (if any)
// and clears the slot so it fires exactly once.
export function consumeTeleport() {
  if (!pendingTeleport) return null
  const t = pendingTeleport
  pendingTeleport = null
  return t
}

function clampNum(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v
}

function allBlockingRects() {
  const out = []
  for (const rects of rectsByOwner.values()) {
    for (const r of rects) {
      // Ankle-height stuff (a rug, a low curb) is registered so a bespoke
      // room can still query it later, but the walker steps right over it.
      if (r.top !== undefined && r.top < 0.3) continue
      out.push(r)
    }
  }
  return out
}

// Move `orig` by `delta` along one axis, clamped against every rect it
// would otherwise pass through. `other` is the (already-resolved) position
// on the OTHER axis, held fixed for this pass — resolveStep calls this once
// for X (other = the ORIGINAL z) then once for Z (other = the now-resolved
// x), which is what makes sliding along a wall at an angle feel right
// instead of stopping dead the instant you touch it.
//
// Which SIDE of the rect a point is on comes from its position relative to
// the rect's own span on this axis (<=min is the near side, >=max is the
// far side) — not from `delta`'s sign or the rect's center. A wall spans
// the room's full width on purpose, so a point standing right at its near
// face (exactly at aMin, the common case for a station composed nose-to-
// wall) has to read as "on the near side" and stay free to walk away from
// it; comparing to the rect's center would put that same point "inside"
// the wall's span and block it in the wrong direction. Direction of travel
// (delta's sign) only decides whether THIS move is walking further into
// that side's barrier or away from it.
function pushAxis(orig, other, delta, radius, rects, isX) {
  let a = orig + delta
  if (delta === 0) return a
  for (const r of rects) {
    const bMin = isX ? r.minZ : r.minX
    const bMax = isX ? r.maxZ : r.maxX
    const closestOther = clampNum(other, bMin, bMax)
    if (Math.abs(other - closestOther) >= radius) continue // clear on the other axis entirely

    const aMin = isX ? r.minX : r.minZ
    const aMax = isX ? r.maxX : r.maxZ
    if (orig <= aMin) {
      // on (or touching) the near side — only moving further IN (delta>0)
      // can be blocked; moving away (delta<=0) is always free.
      if (delta > 0) {
        const limit = aMin - radius
        if (a > limit) a = limit
      }
    } else if (orig >= aMax) {
      if (delta < 0) {
        const limit = aMax + radius
        if (a < limit) a = limit
      }
    } else {
      // orig already sits inside the rect's span on this axis — a rare
      // already-penetrating state (an authored position too close to a
      // prop). Push toward whichever edge is nearer so it doesn't stay
      // stuck mid-object.
      const mid = (aMin + aMax) / 2
      a = orig < mid ? Math.min(a, aMin - radius) : Math.max(a, aMax + radius)
    }
  }
  return a
}

function applyBounds(x, z) {
  let bx = x
  let bz = z
  for (const b of boundsByOwner.values()) {
    if (b.kind === 'circle') {
      const dx = bx - b.cx
      const dz = bz - b.cz
      const dist = Math.hypot(dx, dz)
      if (dist > b.r && dist > 0) {
        const k = b.r / dist
        bx = b.cx + dx * k
        bz = b.cz + dz * k
      }
    } else {
      // rect (default kind)
      bx = clampNum(bx, b.minX, b.maxX)
      bz = clampNum(bz, b.minZ, b.maxZ)
    }
  }
  return { x: bx, z: bz }
}

// The solver. x/z is the walker's current position, dx/dz the proposed step
// this frame, radius the walker's collision radius. Not swept collision —
// deliberately not (per spec): at walking speed and frame-rate the cheap
// slide reads exactly as solid without the complexity of a real sweep.
export function resolveStep(x, z, dx, dz, radius) {
  const rects = allBlockingRects()
  const nx = pushAxis(x, z, dx, radius, rects, true)
  const nz = pushAxis(z, nx, dz, radius, rects, false)
  return applyBounds(nx, nz)
}

export function floorYAt(x, z) {
  // Highest registered floor wins, but the default 0 only applies when no
  // floor fn is registered at all — a room that descends (Sicario's tunnel
  // runs to negative y) must be allowed to report below zero.
  let y = -Infinity
  for (const fn of floorByOwner.values()) {
    const v = fn(x, z)
    if (v > y) y = v
  }
  return y === -Infinity ? 0 : y
}

// A tiny always-on export so scripts/shot.py (and anyone poking the console)
// can read the walker's live position without reaching into three's scene
// graph. CameraRig mutates this object's fields in place every frame rather
// than allocating a new one, per spec ("tiny, always on").
if (typeof window !== 'undefined' && !window.__vaultWalk) {
  window.__vaultWalk = { x: 0, z: 0 }
}
export function publishWalkPos(x, z) {
  if (typeof window === 'undefined') return
  if (!window.__vaultWalk) window.__vaultWalk = { x: 0, z: 0 }
  window.__vaultWalk.x = x
  window.__vaultWalk.z = z
}
