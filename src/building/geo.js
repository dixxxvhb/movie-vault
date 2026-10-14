import * as THREE from 'three'

// A batch of boxes and quads merged into ONE BufferGeometry with vertex
// colours, so a whole motel is a handful of draw calls (plan §5: collapse
// toward a few draws per space). `tag` lets a caller map a picked triangle
// back to whatever it belongs to (the door panels use it for the room).

const _c = new THREE.Color()

export class Batch {
  constructor() {
    this.pos = []
    this.nrm = []
    this.col = []
    this.uv = []
    this.tags = [] // one per triangle
  }

  // A quad centred on c, spanning r (right) and u (up) half-extents.
  // r and u are unit vectors; normal is r x u.
  quad(c, r, u, w, h, color, uvRect = [0, 0, 1, 1], tag = -1, intensity = 1) {
    const hw = w / 2
    const hh = h / 2
    const n = [r[1] * u[2] - r[2] * u[1], r[2] * u[0] - r[0] * u[2], r[0] * u[1] - r[1] * u[0]]
    const p = (sx, sy) => [c[0] + r[0] * sx * hw + u[0] * sy * hh, c[1] + r[1] * sx * hw + u[1] * sy * hh, c[2] + r[2] * sx * hw + u[2] * sy * hh]
    const v = [p(-1, -1), p(1, -1), p(1, 1), p(-1, 1)]
    const [u0, v0, u1, v1] = uvRect
    const uvs = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]
    _c.set(color).multiplyScalar(intensity)
    for (const i of [0, 1, 2, 0, 2, 3]) {
      this.pos.push(...v[i])
      this.nrm.push(...n)
      this.col.push(_c.r, _c.g, _c.b)
      this.uv.push(...uvs[i])
    }
    this.tags.push(tag, tag)
  }

  // A box centred on c with local axes r (right), up (+y), f (forward),
  // sizes along each. Bottom face skipped when `noBottom` (nothing sees it).
  box(c, r, sx, sy, sz, color, { noBottom = true, tag = -1, top = null } = {}) {
    const up = [0, 1, 0]
    const f = [-r[2], 0, r[0]] // r x up, flipped: the face the box shows forward
    const add = (o, s) => [c[0] + o[0] * s, c[1] + o[1] * s, c[2] + o[2] * s]
    const neg = (a) => [-a[0], -a[1], -a[2]]
    // front / back
    this.quad(add(f, sz / 2), r, up, sx, sy, color, undefined, tag)
    this.quad(add(f, -sz / 2), neg(r), up, sx, sy, color, undefined, tag)
    // left / right
    this.quad(add(r, sx / 2), neg(f), up, sz, sy, color, undefined, tag)
    this.quad(add(r, -sx / 2), f, up, sz, sy, color, undefined, tag)
    // top
    this.quad(add(up, sy / 2), r, neg(f), sx, sz, top || color, undefined, tag)
    if (!noBottom) this.quad(add(up, -sy / 2), r, f, sx, sz, color, undefined, tag)
  }

  // Axis-aligned box from min/max corners. Most of the architecture.
  aabb(x0, y0, z0, x1, y1, z1, color, opts) {
    this.box([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [1, 0, 0], x1 - x0, y1 - y0, z1 - z0, color, opts)
  }

  geometry() {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2))
    g.computeBoundingSphere()
    return g
  }
}

// Door-local frame: right and forward for a door facing rotY.
export function frame(rotY) {
  const r = [Math.cos(rotY), 0, -Math.sin(rotY)]
  const f = [Math.sin(rotY), 0, Math.cos(rotY)]
  return { r, f }
}

export function at(p, r, f, dx, dy, dz) {
  return [p[0] + r[0] * dx + f[0] * dz, p[1] + dy, p[2] + r[2] * dx + f[2] * dz]
}

// Soft round light pool, white, used with vertex colour + additive blending.
export function radialTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.35, 'rgba(255,255,255,0.45)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
