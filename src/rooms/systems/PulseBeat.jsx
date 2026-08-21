import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// {bpm, targets, lightRef}: a rhythmic intensity pulse on lights/emissives
// (baby-driver stand-in, tdkr chant {bpm:40}). `targets` is descriptive only
// at this tier: GenericRoom passes its key pointLight's ref as `lightRef`
// when a config asks for PulseBeat, so the whole room's beat is driven off
// one light rather than every target re-deriving its own phase. The base
// intensity is captured on the light itself (`userData.base`, same pattern
// as Room.jsx's dim-on-inspect) so repeated mounts never compound.
export default function PulseBeat({ bpm = 100, depth = 0.4, lightRef, onPulse }) {
  const base = useRef(null)
  useFrame(({ clock }) => {
    const hz = bpm / 60
    const phase = (clock.elapsedTime * hz) % 1
    // sharp attack, soft decay — reads as a beat, not a sine wobble
    const v = Math.pow(1 - phase, 3)
    const factor = 1 - depth + depth * v
    if (onPulse) onPulse(factor)
    const light = lightRef?.current
    if (light) {
      if (base.current === null) base.current = light.intensity
      light.intensity = base.current * factor
    }
  })
  return null
}
