import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// The Investigation: every authored bloodline in film_links, drawn as red
// string between the two Polaroids it connects.
//
// Dixon's own amendment to his red-string ban: the Thread is serial-killer red.
const THREAD = '#C42B2B'

// Physical string sags. A straight line between two pins reads as a laser and
// kills the whole conceit, so every run gets a catenary-ish dip proportional to
// its length, plus a small push off the wall so it casts away from the paper.
function makeCurve(a, b) {
  const A = new THREE.Vector3(a[0], a[1], a[2] + 0.012)
  const B = new THREE.Vector3(b[0], b[1], b[2] + 0.012)
  const span = A.distanceTo(B)
  const mid = A.clone().lerp(B, 0.5)
  mid.y -= span * 0.14
  mid.z += 0.035 + span * 0.02
  return new THREE.CatmullRomCurve3([A, mid, B])
}

function Thread({ curve, hot, weight }) {
  const mat = useRef()
  const geom = useMemo(
    () => new THREE.TubeGeometry(curve, 26, 0.0024 + weight * 0.0007, 5, false),
    [curve, weight]
  )
  useFrame((_, dt) => {
    if (!mat.current) return
    const want = hot ? 1.5 : 0.25
    mat.current.emissiveIntensity = THREE.MathUtils.damp(
      mat.current.emissiveIntensity, want, 9, dt
    )
    const o = hot ? 1 : 0.62
    mat.current.opacity = THREE.MathUtils.damp(mat.current.opacity, o, 9, dt)
  })
  return (
    <mesh geometry={geom}>
      <meshStandardMaterial
        ref={mat}
        color={THREAD}
        emissive={THREAD}
        emissiveIntensity={0.25}
        roughness={0.85}
        transparent
        opacity={0.62}
      />
    </mesh>
  )
}

export default function Strings({ links, positions, focus }) {
  const runs = useMemo(() => {
    const out = []
    for (const l of links) {
      const a = positions[l.from]
      const b = positions[l.to]
      if (!a || !b) continue
      out.push({
        key: l.from + '->' + l.to + ':' + l.relation,
        curve: makeCurve(a, b),
        weight: Math.min(l.weight || 1, 3),
        ends: [l.from, l.to],
      })
    }
    return out
  }, [links, positions])

  return (
    <group>
      {runs.map((r) => (
        <Thread
          key={r.key}
          curve={r.curve}
          weight={r.weight}
          hot={!!focus && r.ends.includes(focus)}
        />
      ))}
      {/* the pins the string is wound around */}
      {Object.entries(positions).map(([slug, p]) => (
        <mesh key={slug} position={[p[0], p[1] + 0.146, p[2] + 0.012]}>
          <sphereGeometry args={[0.0075, 10, 8]} />
          <meshStandardMaterial
            color="#8f2f2a"
            emissive="#8f2f2a"
            emissiveIntensity={focus === slug ? 1.4 : 0.35}
            roughness={0.4}
          />
        </mesh>
      ))}
    </group>
  )
}
