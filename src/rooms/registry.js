import { defaultConfigFor, CONFIGS } from './configs.js'
import { PRESETS } from './presets.js'
import Default from './families/Default.jsx'
import GenericRoom from './GenericRoom.jsx'
import Memento from './bespoke/Memento.jsx'
import Departed from './bespoke/Departed.jsx'
import BabyDriver from './bespoke/BabyDriver.jsx'
import Sting from './bespoke/Sting.jsx'
import Sicario from './bespoke/Sicario.jsx'
import Nightcrawler from './bespoke/Nightcrawler.jsx'
import Stby from './bespoke/Stby.jsx'
import Amadeus from './bespoke/Amadeus.jsx'
import Predestination from './bespoke/Predestination.jsx'
import Ncfom from './bespoke/Ncfom.jsx'
import Barbarian from './bespoke/Barbarian.jsx'
import Motu from './bespoke/Motu.jsx'
import DisclosureDay from './bespoke/DisclosureDay.jsx'

// Phase 2: bespoke rooms, keyed by slug rather than family — a hand-authored
// composition for a Tier 1 film that still resolves through the same
// getRoomConfig() (grade/camera/far), so FilmWorld's own plumbing (ambient
// light, camera.far restore, the develop wash) stays uniform whether a slug
// is bespoke or template-engine. Plain imports for now; if bespoke code
// grows past ~150KB gzip, switch these to per-room dynamic import() and note
// it here.
const BESPOKE = {
  memento: Memento,
  'the-departed': Departed,
  'baby-driver': BabyDriver,
  'the-sting': Sting,
  sicario: Sicario,
  nightcrawler: Nightcrawler,
  stby: Stby,
  amadeus: Amadeus,
  predestination: Predestination,
  ncfom: Ncfom,
  barbarian: Barbarian,
  'masters-of-the-universe-2026': Motu,
  'disclosure-day': DisclosureDay,
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

// ---------------------------------------------------------------- ARCHIVE
// Wave C (three-state treatments, VAULT-IMMERSION-BRIEF-v2.md §3): neither
// archive room resolves through the Ledger merge logic above — a shoebox
// print's room comes from a genre-mapped preset (archive/archiveConfig.js's
// fadedConfigFor), never a CONFIGS[slug] entry, and every drawer film shares
// the exact same room. Kept in its own section, at the bottom of the file,
// so it never touches BESPOKE/FAMILIES/getRoomConfig above — those are
// mid-edit for the Tier 1 bespoke-room pass landing alongside this one.
import FadedRoom from './archive/FadedRoom.jsx'
import Undeveloped from './archive/Undeveloped.jsx'

const ARCHIVE_ROOMS = {
  print: FadedRoom,
  hazy: Undeveloped,
}

export function getArchiveRoomComponent(kind) {
  return ARCHIVE_ROOMS[kind] || FadedRoom
}
