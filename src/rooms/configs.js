// Per-film room configs for the template engine (src/rooms/registry.js).
//
// Config shape (documented here; Wave B transcribes the 41 bespoke/staged
// entries from docs/VAULT-IMMERSION-BRIEF-v2.md section 5 into CONFIGS):
//
//   {
//     family: 'mind-bender' | 'dread' | 'momentum' | 'spectacle' |
//             'intimate-tension' | 'weird-fable',
//     grade: {
//       bg, fogColor,          // hex — the room's base color
//       fogDensity,            // 0-1ish; family components may ignore it
//       key, keyIntensity,     // the room's one accent light
//       fill,                  // cool/neutral counter-light
//       ambient,               // ambient light intensity
//       sat, contrast, hue,    // world-aware Post grade pass (App.jsx),
//                              // fed to HueSaturation + BrightnessContrast
//     },
//     camera: { pos: [x,y,z], look: [x,y,z], fov, far },  // far is optional;
//                                                          // undefined keeps 60
//     place: {},               // family-specific staging params (Wave B)
//     info: {                  // optional overrides, InfoSurfaces.jsx
//       hotTakePos, hotTakeRot, scorePos, metaPos,
//     },
//   }
//
// Wave A ships with zero bespoke entries. Every slug resolves through
// defaultConfigFor() below instead, derived straight from the film's own
// ledger palette (data/ledger_panels.json -> palette_css) — so every logged
// film already has somewhere to stand on day one, in its own colors, rather
// than a placeholder grey box.

export const CONFIGS = {
  // Wave B: 41 entries land here, one per slug.
}

const CAMERA = { pos: [0, 1.55, 3.2], look: [0, 1.3, 0], fov: 50, far: undefined }

const INFO = {
  hotTakePos: [0, 1.55, -1.7],
  hotTakeRot: [0, 0, 0],
  scorePos: [1.2, 2.05, -1.68],
  metaPos: [0, 0.78, -1.66],
}

export function defaultConfigFor(film) {
  const p = film?.palette || {}
  const bg = p.bg || '#0d1418'
  const key = p.acc || p.fg || '#4FB6D9'
  const fill = p.sub || '#22334a'

  return {
    family: 'default',
    grade: {
      bg,
      fogColor: bg,
      fogDensity: 0.065,
      key,
      keyIntensity: 2.4,
      fill,
      ambient: 0.16,
      sat: 0,
      contrast: 0,
      hue: 0,
    },
    camera: { ...CAMERA },
    place: {},
    info: { ...INFO },
  }
}
