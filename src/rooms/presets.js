// The six family presets (IMMERSION-WAVEB-SPEC.md). "Family" is a preset, not
// a component — every film in CONFIGS resolves through the single
// GenericRoom, and a preset just supplies sensible family-wide defaults for
// grade/camera/shell/systems that a per-film config in configs.js then
// narrows down to an actual staged scene. Merge order (registry.js):
// DEFAULT (film palette) <- preset[family] <- per-film config.
//
// `place` here is the shape GenericRoom reads:
//   place: {
//     shell: 'box' | 'open' | 'corridor' | 'deck',
//     shellParams: {...},   // per-shell params, see GenericRoom.jsx header
//     props: [ { type, pos, rot, scale, ...propParams } ],  // props.jsx kit
//     systems: [ { type, ...systemParams } ],                // systems/ kit
//   }
//
// Wave P2 (IMMERSION-V2-POLISH-SPEC.md's own section): the template engine
// lift. Every preset below now also carries:
//   - shellParams.mat        materials.js surface kinds for box shells (the
//                             two open-shell families, spectacle/weird-fable,
//                             skip it — OpenShell has no wall/floor mat hook,
//                             it reads ground/sky params instead)
//   - shellParams.trim       baseboard on box shells, on by default
//   - lights                 a full key/practicals/bounce(/rim) rig, so all
//                             25 template rooms upgrade off the two hard-
//                             coded point lights without 25 hand edits. A
//                             per-film config that sets its own `lights`
//                             block (darkknight) fully replaces this — see
//                             registry.js's shallow top-level merge.
//   - place.atmosphere        a low-density DustField default for box/
//                             corridor-shaped presets (spec #5: "skip open
//                             daylight rooms" — spectacle/weird-fable are
//                             both `open` shell, so shell==='box' is exactly
//                             the right gate here).
//   - grade.grain/vignette/bloomIntensity   the P1 baseline triplet per
//                             family, colorist-tuned per film in configs.js
//                             the same way darkknight already overrides it.
//
// Light intensities are authored small (the same "how bright does this feel"
// units lightRig.js's own SCALE table expects — see that file's header
// comment) and roughly matched to what GenericRoom's old fixed fallback pair
// put out at each family's typical box size, so the P2 lift reads as MORE
// layered, not just differently bright.
export const PRESETS = {
  'mind-bender': {
    grade: { ambient: 0.14, fogDensity: 0.05, contrast: 0.05, grain: 0.05, vignette: 0.55, bloomIntensity: 0.22 },
    camera: { fov: 48 },
    place: {
      shell: 'box',
      shellParams: {
        w: 5, d: 5, h: 2.8, wallMat: 'flat',
        mat: { walls: 'plaster', floor: 'wood', ceiling: 'plaster', wallWear: 0.32, floorWear: 0.4 },
        trim: { color: '#241d16' },
      },
      props: [],
      systems: [],
      atmosphere: [
        { type: 'DustField', density: 26, size: 0.011, opacity: 0.18, area: [4.4, 2.6, 4.4], color: '#c9c3ae' },
      ],
    },
    lights: {
      key: { pos: [0, 2.05, -0.6], intensity: 1.5, distance: 9, decay: 2 },
      practicals: [{ pos: [-1.9, 1.5, 1.5], intensity: 0.85, distance: 6, color: '#e8b070', decay: 2 }],
      bounce: [{ pos: [0, 0.4, -2], intensity: 0.7, distance: 7, color: '#3a4658', decay: 2 }],
    },
  },
  dread: {
    grade: { ambient: 0.1, fogDensity: 0.09, contrast: 0.08, sat: -0.15, grain: 0.09, vignette: 0.68, bloomIntensity: 0.16 },
    camera: { fov: 46 },
    place: {
      shell: 'box',
      shellParams: {
        w: 4.4, d: 4.4, h: 2.4, wallMat: 'plaster',
        mat: { walls: 'concrete', floor: 'concrete', ceiling: 'concrete', wallWear: 0.5, floorWear: 0.55 },
        trim: { color: '#0e0e10' },
      },
      props: [],
      systems: [],
      atmosphere: [
        { type: 'DustField', density: 34, size: 0.013, opacity: 0.22, area: [3.8, 2.2, 3.8], color: '#8a8474', speed: 0.09 },
      ],
    },
    lights: {
      key: { pos: [0, 1.9, -0.5], intensity: 0.95, distance: 7, decay: 2, color: '#8fa0ac' },
      practicals: [{ pos: [1.7, 1.3, 1.3], intensity: 0.5, distance: 5, color: '#5a4030', decay: 2 }],
      bounce: [{ pos: [0, 0.3, -1.8], intensity: 0.4, distance: 5.5, color: '#1c242c', decay: 2 }],
    },
  },
  momentum: {
    grade: { ambient: 0.2, fogDensity: 0.035, contrast: 0.04, grain: 0.04, vignette: 0.42, bloomIntensity: 0.28 },
    camera: { fov: 54 },
    place: {
      shell: 'box',
      shellParams: {
        w: 6, d: 6, h: 3, wallMat: 'steel',
        mat: { walls: 'metal', floor: 'asphalt', ceiling: 'metal', wallWear: 0.4, floorWear: 0.5 },
        trim: { color: '#1c1e22' },
      },
      props: [],
      systems: [],
      atmosphere: [
        { type: 'DustField', density: 18, size: 0.01, opacity: 0.13, area: [5.2, 2.8, 5.2] },
      ],
    },
    lights: {
      key: { pos: [0, 2.4, -1], intensity: 1.7, distance: 11, decay: 2 },
      practicals: [{ pos: [-2.3, 1.6, 1.8], intensity: 0.9, distance: 7, color: '#e8c060', decay: 2 }],
      bounce: [{ pos: [0, 0.5, -2.4], intensity: 0.75, distance: 8, color: '#4a4a30', decay: 2 }],
    },
  },
  spectacle: {
    grade: { ambient: 0.22, fogDensity: 0.03, contrast: 0.06, grain: 0.03, vignette: 0.35, bloomIntensity: 0.34 },
    camera: { fov: 58, far: 400 },
    place: {
      shell: 'open',
      shellParams: { ground: 'concrete', horizon: true },
      props: [],
      systems: [],
      // open shells are daylight/big-sky rooms by default — spec #5 says
      // skip DustField there; no shellParams.mat either, OpenShell has no
      // wall/floor mat hook (ground/sky params only).
    },
    lights: {
      key: { type: 'directional', pos: [0, 10, -5], intensity: 1.0, color: '#fff2e0' },
      bounce: [{ pos: [0, 1.2, 4], intensity: 0.6, distance: 16, color: '#334452', decay: 2 }],
    },
  },
  'intimate-tension': {
    grade: { ambient: 0.15, fogDensity: 0.045, contrast: 0.03, grain: 0.05, vignette: 0.6, bloomIntensity: 0.22 },
    camera: { fov: 44 },
    place: {
      shell: 'box',
      shellParams: {
        w: 4.2, d: 4.2, h: 2.6, wallMat: 'plaster',
        mat: { walls: 'plaster', floor: 'carpet', ceiling: 'plaster', wallWear: 0.3, floorWear: 0.35 },
        trim: { color: '#201c16' },
      },
      props: [],
      systems: [],
      atmosphere: [
        { type: 'DustField', density: 22, size: 0.011, opacity: 0.16, area: [3.6, 2.4, 3.6] },
      ],
    },
    lights: {
      key: { pos: [0, 2.05, -0.6], intensity: 1.3, distance: 8, decay: 2 },
      practicals: [{ pos: [-1.7, 1.4, 1.3], intensity: 0.7, distance: 5.5, color: '#e0a868', decay: 2 }],
      bounce: [{ pos: [0, 0.4, -1.8], intensity: 0.55, distance: 6, color: '#334048', decay: 2 }],
      rim: { pos: [1.7, 1.6, -1.1], intensity: 0.5, distance: 5, color: '#8fa8bc', decay: 2 },
    },
  },
  'weird-fable': {
    grade: { ambient: 0.2, fogDensity: 0.04, sat: 0.12, contrast: 0.02, grain: 0.03, vignette: 0.3, bloomIntensity: 0.3 },
    camera: { fov: 55 },
    place: {
      shell: 'open',
      shellParams: { ground: 'grass', horizon: true },
      props: [],
      systems: [],
    },
    lights: {
      key: { type: 'directional', pos: [0, 9, -4], intensity: 0.95, color: '#ffe8c0' },
      bounce: [{ pos: [0, 1, 3.5], intensity: 0.55, distance: 15, color: '#4a5a3a', decay: 2 }],
    },
  },
}
