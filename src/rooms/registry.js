import { defaultConfigFor, CONFIGS } from './configs.js'
import Default from './families/Default.jsx'

// Wave B fills this with one component per family named in the brief
// (mind-bender, dread, momentum, spectacle, intimate-tension, weird-fable).
// Wave A has exactly one entry on purpose: every config resolves to
// 'default' until a film gets a bespoke config, so a slug with no entry in
// CONFIGS yet still has somewhere to go.
const FAMILIES = {
  default: Default,
}

// slug -> resolved room config. Never returns nothing: a film with no entry
// in CONFIGS resolves through defaultConfigFor(film), derived from the
// film's own ledger palette.
export function getRoomConfig(slug, film) {
  const base = defaultConfigFor(film)
  const over = CONFIGS[slug]
  if (!over) return base
  return {
    ...base,
    ...over,
    grade: { ...base.grade, ...over.grade },
    camera: { ...base.camera, ...over.camera },
    info: { ...base.info, ...over.info },
  }
}

export function getFamilyComponent(family) {
  return FAMILIES[family] || FAMILIES.default
}
