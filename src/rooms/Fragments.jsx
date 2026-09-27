import React, { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { houseLevel } from './houseLights.js'

// FRAGMENTS. The hot take stops being a card and becomes the room.
//
// Today every film room hangs its take on a floating self-lit rectangle at an
// authored coordinate, which means the whole review is legible from the
// doorway and there is no reason to walk anywhere. That single fact is what
// makes a room viewable rather than explorable, and every one of the six
// designers and the exploration research independently said the same thing:
// break the take into pieces and print them on the objects they are about, so
// reading it IS walking.
//
// The pieces are VERBATIM. Profanity and typos intact. A clause is never
// rewritten to fit a prop; the prop is chosen to fit the clause.
//
// AUTO-SPLIT, because film 48 must work with nobody opening a level file.
// A room may author `info.fragments` explicitly, and the good rooms will. A
// room that authors nothing gets its take split on clause boundaries and
// distributed across whatever props it has, ordered so the sharpest line lands
// furthest from the door. That is the museum rule (the frontline label is the
// one people read) inverted on purpose: here the payoff is for walking.

// ------------------------------------------------------------------ splitting
//
// Split on real punctuation, never mid-sentence, and never below four words,
// because a scrap reading "haha" stuck to a chair is a joke the room did not
// make. Long clauses stay whole: a fragment is a piece of writing, not a
// tweet.
const MAX_WORDS = 17

// Break a clause that is still too long to be a scrap, at the last natural
// joint before the limit. Commas and conjunctions only, never mid-phrase: a
// fragment that stops in the middle of a thought is not a fragment, it is a
// bug that looks like one.
function halve(piece) {
  const words = piece.split(/\s+/)
  if (words.length <= MAX_WORDS) return [piece]
  const joints = []
  words.forEach((w, i) => {
    if (i < 4 || i > words.length - 4) return
    // A word ending in punctuation is a joint you cut AFTER; a conjunction is
    // one you cut BEFORE. Getting that backwards splits `i gotta fuckin |
    // know"),` straight through the middle of a quote, which is what the first
    // version did to Sorry to Bother You.
    if (/[,;:]$/.test(w)) joints.push(i + 1)
    else if (/^(and|but|then|so|because|which|that)$/i.test(w)) joints.push(i)
  })
  if (!joints.length) return [piece]
  // the joint nearest the middle, so neither half is a runt
  const mid = words.length / 2
  const cut = joints.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a))
  if (cut < 3 || cut > words.length - 3) return [piece]
  return [
    words.slice(0, cut).join(' '),
    words.slice(cut).join(' '),
  ].flatMap(halve)
}

export function splitTake(take) {
  if (!take) return []
  // EVERY delimiter is a lookbehind, so the split consumes whitespace and
  // nothing else. The first version split on `\s+—\s+` and `\s+\.\.\.\s+`,
  // which ate the em dash and the ellipsis out of his writing: 11 of 47 takes
  // came back short. Hot takes render VERBATIM is a standing rule and it
  // covers punctuation, so the delimiter stays attached to the clause it
  // closed. Verified lossless across all 47.
  const raw = String(take)
    // sentence ends, ellipses, em dashes, and the point where he stops
    // reacting and starts diagnosing (a close-quote followed by a capital),
    // which is the most common shape in this data
    .split(/(?<=\.\.\.)\s+|(?<=[.!?])\s+|(?<=—)\s+|(?<=")\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean)

  const out = []
  for (const piece of raw) {
    const words = piece.split(/\s+/).length
    // Fold a runt into its neighbour rather than stranding it. A scrap
    // reading "haha" taped to a chair is a joke the room did not make.
    if (words < 4 && out.length) out[out.length - 1] += ' ' + piece
    else out.push(piece)
  }
  const pieces = out.flatMap(halve)
  // Seven scraps is already a lot for one room. Anything past that is folded
  // back into the last one rather than dropped, because a take that stops at
  // "then it gets SOOOO SATISFYING and" has been truncated mid-thought, and
  // losing the end of a review to a display cap is exactly the kind of quiet
  // dishonesty this whole thing exists not to do. The last scrap is allowed
  // to be long; it is the verdict.
  const MAX = 7
  if (pieces.length <= MAX) return pieces
  const head = pieces.slice(0, MAX - 1)
  head.push(pieces.slice(MAX - 1).join(' '))
  return head
}

// Which props can carry writing, and WHERE on each one. A fragment on a
// figure is a caption on a person, which is exactly the wrong register, and
// a fragment on a pool, a tree or a floor of paper is unreadable.
//
// The scrap used to go at carrier.pos + (0, 0.62, 0.02) for every carrier,
// whatever its shape. A slab's pos is its centre, so on a pillar or a house
// that is inside the solid, and a room whose every carrier was a slab (Catch
// Me If You Can, Coherence) showed no take at all. Each carrier kind now
// says where its writable surface is: tops take the scrap lying flat, boxes
// take it on the face that looks at the room, panels take it just proud of
// the glass.
const FLAT = -Math.PI / 2
const facing = (p) => (Array.isArray(p.rot) ? p.rot[1] || 0 : 0)
const sc = (p) => (Array.isArray(p.scale) ? p.scale[1] : p.scale ?? 1)
function onTop(p, top) {
  return { dx: 0, dz: 0, y: (p.pos[1] || 0) + top * sc(p) + 0.006, tilt: FLAT, ry: 0 }
}
function onFace(p, depth, y) {
  const ry = facing(p)
  const off = (depth / 2) * sc(p) + 0.012
  return { dx: Math.sin(ry) * off, dz: Math.cos(ry) * off, y, ry }
}
// The front face of a box whose pos is its centre. A box with no face at a
// readable height (a beam overhead, a kerb underfoot, a rail) is skipped.
function boxFace(p, h, d) {
  const k = sc(p)
  const cy = p.pos[1] || 0
  const lo = cy - (h * k) / 2, hi = cy + (h * k) / 2
  if (hi - lo < 0.12 || lo > 1.8 || hi < 0.3) return null
  const y = Math.min(hi - 0.07, Math.max(lo + 0.07, Math.min(1.6, cy + Math.min(0.2, (h * k) / 4))))
  return onFace(p, d, y)
}
const CARRIERS = {
  table: (p) => onTop(p, p.h ?? 0.75),
  counter: (p) => onTop(p, p.h ?? 0.95),
  bed: (p) => onTop(p, 0.51),
  podium: (p) => onTop(p, 1.1),
  vehicleMass: (p) => onTop(p, (p.h ?? 1.1) * 0.57),
  chairRow: (p) => {
    const n = p.count ?? 6
    const x = -((n - 1) / 2) * (p.spacing ?? 0.62)
    const ry = facing(p)
    const t = onTop(p, (p.seatH ?? 0.46) + 0.05)
    return { ...t, dx: Math.cos(ry) * x * sc(p), dz: -Math.sin(ry) * x * sc(p) }
  },
  slab: (p) => boxFace(p, (p.size || [1, 1, 1])[1], (p.size || [1, 1, 1])[2]),
  bevelBox: (p) => boxFace(p, p.h ?? 1, p.d ?? 1),
  screenPanel: (p) => onFace(p, 0, (p.pos[1] || 0) - (p.h ?? 0.6) * sc(p) * 0.32),
  frameOn: (p) => onFace(p, 0.04, (p.pos[1] || 0) - (p.h ?? 0.8) * sc(p) * 0.3),
  mirrorPlane: (p) => onFace(p, 0, (p.pos[1] || 0) - (p.h ?? 1.6) * sc(p) * 0.36),
  glassWall: (p) => onFace(p, 0.02, Math.min(1.5, (p.pos[1] || 0))),
}

// Order carriers by distance from the spawn point, furthest first, so the
// last clause of the take is the one you have to cross the room for.
export function planFragments(film, config) {
  const authored = config?.info?.fragments
  const clauses = splitTake(film?.hot_take)
  if (!clauses.length) return []

  if (authored && authored.length) {
    // An authored list shorter than the take (the take was edited after the
    // room was staged) folds the rest of the take into the last scrap rather
    // than quietly losing the verdict. index/of/state are filled the same way
    // the planner fills them, so a bare { pos, y } entry still works.
    const n = authored.length
    const texts = clauses.length > n
      ? [...clauses.slice(0, n - 1), clauses.slice(n - 1).join(' ')]
      : clauses
    return authored.map((f, i) => ({
      index: i,
      of: n,
      state: i === 0 || i === n - 1 ? 'film' : i % 2 ? 'motel' : 'film',
      ...f,
      text: f.text ?? texts[i] ?? '',
    })).filter((f) => f.text)
  }

  const props = (config?.place?.props || [])
    .map((p, i) => ({ p, i, at: CARRIERS[p.type] && Array.isArray(p.pos) ? CARRIERS[p.type](p) : null }))
    .filter(({ at }) => at)

  if (!props.length) return []

  const spawn = config?.camera?.pos || [0, 1.5, 2]
  props.sort((a, b) => {
    const da = Math.hypot(a.p.pos[0] - spawn[0], a.p.pos[2] - spawn[2])
    const db = Math.hypot(b.p.pos[0] - spawn[0], b.p.pos[2] - spawn[2])
    return da - db
  })

  // Nearest carrier gets the FIRST clause (the reaction, which is what you
  // would hear walking in) and the furthest gets the LAST (the verdict, which
  // is what he landed on). Reading the room in order is walking away from the
  // door.
  // More clauses than carriers: the tail folds into the last scrap, the
  // verdict, instead of being dropped off the end of the review.
  const n = Math.min(clauses.length, props.length)
  const texts = clauses.length > n
    ? [...clauses.slice(0, n - 1), clauses.slice(n - 1).join(' ')]
    : clauses
  return texts.map((text, k) => {
    const carrier = props[Math.floor((k / n) * props.length)]
    return {
      text,
      pos: carrier.p.pos,
      ...carrier.at,
      // Alternate which house state each fragment belongs to, so neither
      // state holds the whole take. The first and last always sit in the
      // film, because the opening reaction and the verdict are the film's.
      state: k === 0 || k === n - 1 ? 'film' : (k % 2 ? 'motel' : 'film'),
      index: k,
      of: n,
    }
  })
}

// ------------------------------------------------------------------ the scrap
//
// Motel stationery, torn, with his handwriting on it. Small: a fragment is
// always smaller than the object it is stuck to, the same rule the quotes
// already follow against their Polaroids.
function scrapTexture(text, palette, seed) {
  const W = 768
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')

  // paper
  ctx.fillStyle = '#EFE7D4'
  ctx.fillRect(0, 0, W, H)

  // a torn top edge, because a scrap is torn off a pad and a clean rectangle
  // reads as a UI element
  ctx.fillStyle = 'rgba(0,0,0,0)'
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  let x = 0
  let r = seed
  const rnd = () => {
    r = (r * 1103515245 + 12345) & 0x7fffffff
    return (r % 1000) / 1000
  }
  while (x < W) {
    const step = 26 + rnd() * 34
    ctx.lineTo(x, rnd() * 15)
    x += step
  }
  ctx.lineTo(W, 0)
  ctx.closePath()
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'

  // a fold and a little grime, so it has been in a pocket
  ctx.strokeStyle = 'rgba(120,108,84,0.16)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, H * 0.56)
  ctx.lineTo(W, H * 0.52)
  ctx.stroke()

  // the writing. His hand, so: cursive, uneven, and never cleaned up.
  const ink = palette?.acc && palette.acc !== '#000000' ? '#2B2620' : '#2B2620'
  ctx.fillStyle = ink
  const pad = 62
  let size = 62
  let lines = []
  const fontOf = (s) => `italic ${s}px "Segoe Script", "Bradley Hand", "Comic Sans MS", cursive`
  while (size >= 26) {
    ctx.font = fontOf(size)
    lines = []
    let line = ''
    for (const word of String(text).split(/\s+/)) {
      const t = line ? line + ' ' + word : word
      if (line && ctx.measureText(t).width > W - pad * 2) {
        lines.push(line)
        line = word
      } else line = t
    }
    if (line) lines.push(line)
    if (lines.length * size * 1.24 <= H - pad * 2) break
    size -= 4
  }
  ctx.font = fontOf(size)
  ctx.textBaseline = 'top'
  const blockH = lines.length * size * 1.24
  let y = (H - blockH) / 2
  lines.forEach((ln, i) => {
    // a hand does not write on a straight line
    const wobble = Math.sin((i + seed) * 1.7) * 3
    ctx.fillText(ln, pad + wobble, y)
    y += size * 1.24
  })

  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

function Scrap({ frag, palette }) {
  const mesh = useRef()
  const tex = useMemo(
    () => scrapTexture(frag.text, palette, (frag.index + 1) * 977),
    [frag.text, frag.index, palette]
  )
  useEffect(() => () => tex.dispose(), [tex])

  // Scrap size follows the text length, so a one-clause note is a note and a
  // long one is a page. Never bigger than 26cm: it is stationery.
  const w = Math.min(0.26, 0.13 + frag.text.length * 0.0016)
  const h = w * (512 / 768)

  useFrame(() => {
    if (!mesh.current) return
    const t = houseLevel()
    // A film fragment is legible while the film is on and fades as the room
    // comes up; a motel fragment is the reverse. Neither state holds the whole
    // take, which is the entire reason the switch exists.
    const want = frag.state === 'motel' ? t : frag.state === 'film' ? 1 - t : 1
    const m = mesh.current.material
    m.opacity = Math.max(0, want * 1.15 - 0.15)
    mesh.current.visible = m.opacity > 0.02
  })

  const [px, py, pz] = frag.pos || [0, 1, 0]
  return (
    <mesh
      ref={mesh}
      position={[px + (frag.dx ?? 0), (frag.y ?? py + 0.62), pz + (frag.dz ?? 0.02)]}
      rotation={[frag.tilt ?? -0.06, frag.ry ?? 0, frag.roll ?? (frag.index % 2 ? 0.035 : -0.028)]}
    >
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  )
}

export default function Fragments({ film, config, plan: given }) {
  const own = useMemo(() => (given ? null : planFragments(film, config)), [film, config, given])
  const plan = given || own
  if (!plan || !plan.length) return null
  return (
    <group>
      {plan.map((f, i) => (
        <Scrap key={i} frag={f} palette={config?.palette || film?.palette} />
      ))}
    </group>
  )
}
