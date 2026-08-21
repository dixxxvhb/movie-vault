import { defaultConfigFor, CONFIGS } from './configs.js'
import { PRESETS } from './presets.js'
import Default from './families/Default.jsx'
import GenericRoom from './GenericRoom.jsx'
import Memento from './bespoke/Memento.jsx'

// Phase 2: bespoke rooms, keyed by slug rather than family — a hand-authored
// composition for a Tier 1 film that still resolves through the same
// getRoomConfig() (grade/camera/far), so FilmWorld's own plumbing (ambient
// light, camera.far restore, the develop wash) stays uniform whether a slug
// is bespoke or template-engine. Plain imports for now; if bespoke code
// grows past ~150KB gzip, switch these to per-room dynamic import() and note
// it here.
const BESPOKE = {
  memento: Memento,
}

// Wave B: "family" is a PRESET, not a component — the six families named in
// the brief (mind-bender, dread, momentum, spectacle, intimate-tension,
// weird-fable) all route through the one GenericRoom, driven entirely by
// config (presets.js + configs.js). 'default' stays mapped to Default.jsx —
// the safety net for any slug that hasn't earned a CONFIGS entry yet.
const FAMILIES = {
  default: Default,
  'mind-bender': GenericRoom,
  dread: GenericRoom,
  momentum: GenericRoom,
  spectacle: GenericRoom,
  'intimate-tension': GenericRoom,
  'weird-fable': GenericRoom,
}

// slug -> resolved room config. Merge order: DEFAULT (film palette) <-
// preset[family] <- per-film override. Never returns nothing: a film with no
// entry in CONFIGS resolves through defaultConfigFor(film) alone (family
// 'default', no preset layer), so a slug with no entry yet still has
// somewhere to go.
export function getRoomConfig(slug, film) {
  const base = defaultConfigFor(film)
  const over = CONFIGS[slug]
  if (!over) return base
  const preset = PRESETS[over.family] || {}
  return {
    ...base,
    ...preset,
    ...over,
    grade: { ...base.grade, ...preset.grade, ...over.grade },
    camera: { ...base.camera, ...preset.camera, ...over.camera },
    info: { ...base.info, ...preset.info, ...over.info },
    place: {
      ...preset.place,
      ...over.place,
      shellParams: { ...(preset.place?.shellParams), ...(over.place?.shellParams) },
      props: over.place?.props ?? preset.place?.props ?? [],
      systems: over.place?.systems ?? preset.place?.systems ?? [],
    },
  }
}

export function getFamilyComponent(family) {
  return FAMILIES[family] || FAMILIES.default
}

// What FilmWorld actually renders for a given slug: a bespoke room if one
// exists, otherwise whatever the family resolves to. Bespoke is a slug-level
// override, not a family — a slug with a BESPOKE entry never touches
// GenericRoom at all.
export function getRoomComponent(slug, family) {
  return BESPOKE[slug] || getFamilyComponent(family)
}
