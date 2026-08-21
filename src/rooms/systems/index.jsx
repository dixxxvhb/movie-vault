import ResetFlash from './ResetFlash.jsx'
import Duplicates from './Duplicates.jsx'
import SwarmEvent from './SwarmEvent.jsx'
import StreakLights from './StreakLights.jsx'
import AdvanceGlow from './AdvanceGlow.jsx'
import ScheduledCut from './ScheduledCut.jsx'
import PeripheralFigure from './PeripheralFigure.jsx'
import LookAwayGrow from './LookAwayGrow.jsx'
import PulseBeat from './PulseBeat.jsx'
import GlyphRain from './GlyphRain.jsx'
import RainField from './RainField.jsx'
import Assembler from './Assembler.jsx'
import CurtainReveal from './CurtainReveal.jsx'
import InkSpread from './InkSpread.jsx'
import DwellConcede from './DwellConcede.jsx'

// The system kit (IMMERSION-WAVEB-SPEC.md's 15). GenericRoom looks a config
// entry's `type` up here and renders `<Comp {...params}/>`. Every system is
// self-cleaning: no setInterval/setTimeout, clock-driven off useFrame so
// StrictMode's double-mount never leaves a stray timer running.
export const SYSTEMS = {
  ResetFlash,
  Duplicates,
  SwarmEvent,
  StreakLights,
  AdvanceGlow,
  ScheduledCut,
  PeripheralFigure,
  LookAwayGrow,
  PulseBeat,
  GlyphRain,
  RainField,
  Assembler,
  CurtainReveal,
  InkSpread,
  DwellConcede,
}

export function System({ type, ...rest }) {
  const Comp = SYSTEMS[type]
  if (!Comp) return null
  return <Comp {...rest} />
}
