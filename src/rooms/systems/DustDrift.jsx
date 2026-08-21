import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// Not in the Wave B fifteen (IMMERSION-WAVEB-SPEC.md's system kit) — flagged
// per that spec's own rule ("add a system ONLY if nothing fits"). RainField
// falls and hits a floor; nothing in the kit wanders in place, which is what
// the Wave C brief's shoebox treatment asks for ("drifting dust", §3). New,
// small, self-cleaning system rather than bending RainField's falling model
// to do something it isn't shaped for.
//
// {density, color, area, speed}: slow drifting dust motes — the one tell,
// besides the grade, that a faded print room is being disturbed rather than
// lit. Unlike RainField's particles (reset from a fixed top edge once they
// hit the floor) these wander: gentle sinusoidal drift on x/z, a slow rise on
// y that wraps back to the floor, so the cloud never reads as a hard loop.
export default function DustDrift({ density = 70, color = '#c9c3ae', area = [4, 2.4, 4], speed = 0.12 }) {
  const ref = useRef()
  const count = Math.min(density, 220)
  const { positions, base, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * area[0]
      positions[i * 3 + 1] = Math.random() * area[1]
      positions[i * 3 + 2] = (Math.random() - 0.5) * area[2]
      seeds[i * 3] = Math.random() * Math.PI * 2
      seeds[i * 3 + 1] = Math.random() * Math.PI * 2
      seeds[i * 3 + 2] = 0.4 + Math.random() * 0.6
    }
    return { positions, base: positions.slice(), seeds }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, area[0], area[1], area[2]])

  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    const p = g.geometry.attributes.position.array
    const t = clock.elapsedTime * speed
    for (let i = 0; i < count; i++) {
      const ix = i * 3
      const phaseX = seeds[ix]
      const phaseZ = seeds[ix + 1]
      const rate = seeds[ix + 2]
      p[ix] = base[ix] + Math.sin(t * rate + phaseX) * (area[0] * 0.14)
      p[ix + 1] = ((base[ix + 1] + t * rate * 0.35) % area[1] + area[1]) % area[1]
      p[ix + 2] = base[ix + 2] + Math.cos(t * rate + phaseZ) * (area[2] * 0.14)
    }
    g.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref} key={count}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.014} color={color} transparent opacity={0.4} sizeAttenuation depthWrite={false} />
    </points>
  )
}
