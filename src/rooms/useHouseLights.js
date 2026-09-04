// The house-lights rig. One ticker, mounted once per room by FilmWorld.
//
// Why this is not a hook inside GenericRoom any more: the sixteen bespoke
// rooms do not route through GenericRoom, and the whole mechanic depends on
// the switch being in EVERY room. Driving the damp from FilmWorld, which every
// film room passes through, means a bespoke room gets the house lights without
// a single line changing in its own file.
//
// It also fixes a fight. Bespoke rooms publish their own grade overrides
// (Sorry to Bother You's swerve, Memento's split, Barbarian's smash cut) and a
// second writer on the same bus would stamp on them. So the house blend is not
// published to gradeBus at all: App applies it AFTER merging whatever the room
// published, which makes it a post-stage rather than a competitor. Flick the
// lights during Stby's penthouse cut and you get the penthouse with the lights
// on, which is both correct and funny.

import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { blendGrade, houseLevel, tickHouse } from './houseLights.js'

// Drives the damp. Returns nothing; everything reads houseLevel().
export function HouseRig() {
  useFrame((_, dt) => { tickHouse(Math.min(dt, 0.1)) })
  return null
}

// The room's config with its grade blended toward the motel state. FilmWorld
// hands the RESULT down as `config`, so every room's own key and fill lights
// move with the switch and not just the colour grade. A room whose grade
// changes while its actual fixtures do not reads as a filter, not a lamp.
//
// Recomputed only while the switch is travelling: `level` is quantised to
// 1/60 so a settled room stops producing new objects every frame and React
// stops re-rendering the whole room tree for nothing.
export function useLitConfig(config, level) {
  return useMemo(() => {
    if (level <= 0.001) return config
    return { ...config, grade: blendGrade(config.grade, level) }
  }, [config, level])
}

export { houseLevel }
