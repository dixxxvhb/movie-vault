// Colour maths for the per-film case file.
//
// Every Ledger film already carries an authored palette (film_ledger_panels
// .palette_css): bg / fg / sub / acc, designed as a pair — a dark bg always
// comes with a light fg and vice versa. That pair is the film's own look, so
// the case file is printed IN IT rather than in one generic cream. What this
// file does is keep the result readable and keep every sheet feeling like the
// same object: same paper treatment, different stock.

export function parse(hex) {
  const h = (hex || '#000000').replace('#', '')
  const s = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [
    parseInt(s.slice(0, 2), 16) || 0,
    parseInt(s.slice(2, 4), 16) || 0,
    parseInt(s.slice(4, 6), 16) || 0,
  ]
}

export const toHex = (rgb) =>
  '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')

export const rgba = (hex, a) => {
  const [r, g, b] = parse(hex)
  return `rgba(${r},${g},${b},${a})`
}

export function lum(hex) {
  const [r, g, b] = parse(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function mix(a, b, t) {
  const A = parse(a), B = parse(b)
  return toHex(A.map((v, i) => v + (B[i] - v) * t))
}

export const contrast = (a, b) => {
  const l1 = lum(a), l2 = lum(b)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

// Walk a colour toward black or white until it is legible on `on`. The accent
// is authored for a 236px card front, where it only ever sits next to large
// shapes; at 14px body scale some of them (Blade Runner's #F3CDB3 on cream)
// vanish. This is the guard, not a restyle: the hue survives.
export function legible(color, on, target = 3.4) {
  const dark = lum(on) > 0.4
  let out = color
  for (let i = 0; i < 24 && contrast(out, on) < target; i++) {
    out = mix(out, dark ? '#000000' : '#ffffff', 0.08)
  }
  return out
}

// The film's palette turned into a sheet of paper.
export function sheetOf(palette = {}) {
  const bg = palette.bg || '#F6EFE0'
  const dark = lum(bg) < 0.28

  // Paper is never the raw swatch: pulled a few percent toward warm pulp so a
  // saturated poster colour reads as printed stock rather than as a UI panel.
  const paper = mix(bg, dark ? '#0B0906' : '#FBF4E6', dark ? 0.34 : 0.30)
  const ink = palette.fg || (dark ? '#EDE6D6' : '#22201B')
  const acc = legible(palette.acc || ink, paper, 3.2)
  const sub = legible(palette.sub || mix(ink, paper, 0.45), paper, 2.5)

  return {
    dark,
    paper,
    // a second, slightly deeper stock for the fibre gradient
    paper2: mix(paper, dark ? '#000000' : '#C9B896', dark ? 0.28 : 0.16),
    ink,
    acc,
    sub,
    edge: rgba(dark ? '#ffffff' : '#3a2f1c', dark ? 0.1 : 0.16),
    glyph: palette.glyph || '',
  }
}
