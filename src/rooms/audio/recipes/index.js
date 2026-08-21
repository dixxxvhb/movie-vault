// Phase 3: audio recipes for the 25 template-engine (Tier 2) rooms —
// GenericRoom's own recipe registry, keyed by slug, the same way
// registry.js's BESPOKE map keys Tier 1 rooms by slug. A slug not listed
// here (any bespoke slug, any archive print/drawer slug, anything not yet
// staged) simply gets no recipe — GenericRoom's useRoomAudio call passes
// `undefined` through, which engine.js's setRoomRecipe already no-ops on.
import { start as darkknight } from './darkknight.js'
import { start as tdkr } from './tdkr.js'
import { start as batman } from './batman.js'
import { start as poorthings } from './poorthings.js'
import { start as cmiyc } from './cmiyc.js'
import { start as bullettrain } from './bullettrain.js'
import { start as stardust } from './stardust.js'
import { start as coherence } from './coherence.js'
import { start as exmachina } from './exmachina.js'
import { start as niceguys } from './niceguys.js'
import { start as rogueOne } from './rogue-one.js'
import { start as maverick } from './maverick.js'
import { start as moon } from './moon.js'
import { start as sourceCode } from './source-code.js'
import { start as obsession } from './obsession.js'
import { start as triangle } from './triangle.js'
import { start as pressure } from './pressure.js'
import { start as minorityReport } from './minority-report.js'
import { start as sunshine } from './sunshine.js'
import { start as annihilation } from './annihilation.js'
import { start as oblivion } from './oblivion.js'
import { start as game } from './game.js'
import { start as silverlake } from './silverlake.js'
import { start as hereditary } from './hereditary.js'
import { start as malignant } from './malignant.js'

export const TEMPLATE_RECIPES = {
  darkknight,
  tdkr,
  batman,
  poorthings,
  cmiyc,
  bullettrain,
  stardust,
  coherence,
  exmachina,
  niceguys,
  'rogue-one': rogueOne,
  maverick,
  moon,
  'source-code': sourceCode,
  obsession,
  triangle,
  pressure,
  'minority-report': minorityReport,
  sunshine,
  annihilation,
  oblivion,
  game,
  silverlake,
  hereditary,
  malignant,
}
