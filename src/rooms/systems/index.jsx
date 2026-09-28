import { useEffect, useState } from 'react'
import { get as getSetting, subscribe as subscribeSettings } from '../../settings.js'
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
import DustDrift from './DustDrift.jsx'

// The system kit (IMMERSION-WAVEB-SPEC.md's 15, +1 for Wave C). GenericRoom
// looks a config entry's `type` up here and renders `<Comp {...params}/>`.
// Every system is self-cleaning: no setInterval/setTimeout, clock-driven off
// useFrame so StrictMode's double-mount never leaves a stray timer running.
//
// DustDrift is new, not in the original fifteen — added for the shoebox
// print rooms' "drifting dust" (VAULT-IMMERSION-BRIEF-v2.md §3), which
// nothing in the original kit covers (see DustDrift.jsx's own header).
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
  DustDrift,
}

// The two Options switches that decide whether a system runs at all.
// ScheduledCut and ResetFlash read `content.roomEvents` themselves (they
// still need to settle the grade when it flips off mid-cut); the rest are
// simply not mounted. `content.roomReactsToYou` was stored and shown in the
// panel but read by nothing until this map existed.
const GATED_BY = {
  SwarmEvent: 'content.roomEvents',
  PeripheralFigure: 'content.roomReactsToYou',
  LookAwayGrow: 'content.roomReactsToYou',
  DwellConcede: 'content.roomReactsToYou',
}

function useSettingOn(path) {
  const [on, setOn] = useState(() => !path || getSetting(path) !== false)
  useEffect(() => {
    if (!path) return undefined
    const sync = () => setOn(getSetting(path) !== false)
    sync()
    return subscribeSettings(sync)
  }, [path])
  return on
}

export function System({ type, ...rest }) {
  const Comp = SYSTEMS[type]
  const on = useSettingOn(GATED_BY[type])
  if (!Comp || !on) return null
  return <Comp {...rest} />
}
