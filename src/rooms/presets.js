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
export const PRESETS = {
  'mind-bender': {
    grade: { ambient: 0.14, fogDensity: 0.05, contrast: 0.05 },
    camera: { fov: 48 },
    place: {
      shell: 'box',
      shellParams: { w: 5, d: 5, h: 2.8, wallMat: 'flat' },
      props: [],
      systems: [],
    },
  },
  dread: {
    grade: { ambient: 0.1, fogDensity: 0.09, contrast: 0.08, sat: -0.15 },
    camera: { fov: 46 },
    place: {
      shell: 'box',
      shellParams: { w: 4.4, d: 4.4, h: 2.4, wallMat: 'plaster' },
      props: [],
      systems: [],
    },
  },
  momentum: {
    grade: { ambient: 0.2, fogDensity: 0.035, contrast: 0.04 },
    camera: { fov: 54 },
    place: {
      shell: 'box',
      shellParams: { w: 6, d: 6, h: 3, wallMat: 'steel' },
      props: [],
      systems: [],
    },
  },
  spectacle: {
    grade: { ambient: 0.22, fogDensity: 0.03, contrast: 0.06 },
    camera: { fov: 58, far: 400 },
    place: {
      shell: 'open',
      shellParams: { ground: 'concrete', horizon: true },
      props: [],
      systems: [],
    },
  },
  'intimate-tension': {
    grade: { ambient: 0.15, fogDensity: 0.045, contrast: 0.03 },
    camera: { fov: 44 },
    place: {
      shell: 'box',
      shellParams: { w: 4.2, d: 4.2, h: 2.6, wallMat: 'plaster' },
      props: [],
      systems: [],
    },
  },
  'weird-fable': {
    grade: { ambient: 0.2, fogDensity: 0.04, sat: 0.12, contrast: 0.02 },
    camera: { fov: 55 },
    place: {
      shell: 'open',
      shellParams: { ground: 'grass', horizon: true },
      props: [],
      systems: [],
    },
  },
}
