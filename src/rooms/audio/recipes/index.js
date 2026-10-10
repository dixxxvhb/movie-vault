// Phase 3: audio recipes for the 40 template-engine (Tier 2) rooms —
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
import { start as se7en } from './se7en.js'
import { start as spotlight } from './spotlight.js'
import { start as gladiator } from './gladiator.js'
import { start as theBigShort } from './the-big-short.js'
import { start as laConfidential } from './la-confidential.js'
import { start as fightClub } from './fight-club.js'
import { start as operationFinale } from './operation-finale.js'
import { start as valkyrie } from './valkyrie.js'
import { start as memoriesOfMurder } from './memories-of-murder.js'
import { start as frostNixon } from './frost-nixon.js'
import { start as insideMan } from './inside-man.js'
import { start as theTown } from './the-town.js'
import { start as theAmateur } from './the-amateur.js'
import { start as inTheGrey } from './in-the-grey.js'
import { start as oneBattleAfterAnother } from './one-battle-after-another.js'
import { start as dunkirk } from './dunkirk.js'
import { start as goneBabyGone } from './gone-baby-gone.js'
import { start as hotFuzz } from './hot-fuzz.js'
import { start as theDeathOfStalin } from './the-death-of-stalin.js'
import { start as upgrade } from './upgrade.js'
import { start as primalFear } from './primal-fear.js'
import { start as frailty } from './frailty.js'
import { start as terminator2 } from './terminator-2.js'

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
  se7en,
  spotlight,
  gladiator,
  'the-big-short': theBigShort,
  'la-confidential': laConfidential,
  'fight-club': fightClub,
  'operation-finale': operationFinale,
  valkyrie,
  'memories-of-murder': memoriesOfMurder,
  'frost-nixon': frostNixon,
  'inside-man': insideMan,
  'the-town': theTown,
  'the-amateur': theAmateur,
  'in-the-grey': inTheGrey,
  'one-battle-after-another': oneBattleAfterAnother,
  dunkirk,
  'gone-baby-gone': goneBabyGone,
  'hot-fuzz': hotFuzz,
  'the-death-of-stalin': theDeathOfStalin,
  upgrade,
  'primal-fear': primalFear,
  frailty,
  'terminator-2': terminator2,
}
