// The hook every room uses to run the house lights.
//
// Returns { config, t } where `config` is the room's own config with its grade
// blended toward the motel state, and `t` is the damped 0..1 level so a room
// can also fade individual props in and out with it.
//
// It publishes to gradeBus for the same two-halves reason useRoomDevelop.js
// documents: the post-processing pass lives outside the Canvas and reads the
// bus, while GenericRoom's own point lights read config.grade directly. Both
// have to move or the switch only half works, and a room whose colour grade
// changes while its actual lights do not reads as a filter rather than a
// fixture.

import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { setGradeOverride, clearGradeOverride } from './gradeBus.js'
import {
  blendGrade, houseTarget, setHouseLevel, resetHouse, subscribeHouse,
} from './houseLights.js'

// ~700ms to travel, which is a fluorescent tube deciding to commit rather than
// a crossfade. Damping rather than a fixed tween so a second flick mid-travel
// turns around from where it actually is instead of snapping.
const RATE = 4.6

export function useHouseLights(config) {
  const [grade, setGrade] = useState(null)
  const t = useRef(0)
  const settled = useRef(true)

  // Every room mount starts in the film. The first watch has no Dixon in it,
  // and a visitor who flicked the switch in one room must not walk into the
  // next with the lights already up.
  useEffect(() => {
    resetHouse()
    t.current = 0
    settled.current = true
    setGrade(null)
    const unsub = subscribeHouse(() => { settled.current = false })
    return () => {
      unsub()
      resetHouse()
      clearGradeOverride()
    }
  }, [config])

  useFrame((_, dt) => {
    const want = houseTarget()
    if (settled.current && Math.abs(t.current - want) < 0.0005) return
    t.current = THREE.MathUtils.damp(t.current, want, RATE, dt)
    if (Math.abs(t.current - want) < 0.002) {
      t.current = want
      settled.current = true
    }
    setHouseLevel(t.current)
    const g = blendGrade(config.grade, t.current)
    setGradeOverride(g)
    setGrade(g)
  })

  return {
    config: grade ? { ...config, grade } : config,
    t: t.current,
  }
}

// A read-only companion for components that only need the level and should not
// own the animation (props fading in and out with the switch). Returns the
// live number without causing a re-render, so read it inside useFrame.
export { houseLevel } from './houseLights.js'
