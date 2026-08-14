import React, { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makeCardTexture, makeBackTexture } from './vaultTextures.js'
import { wasDrag } from './pointer.js'

// Real Polaroid is 8.8 x 10.7cm. These run about 2x life size: big enough to
// read across the room, small enough that a whole score band can sit side by
// side without running off the wall. Card size is now a constraint of the
// score-height layout, not a free choice.
export const CARD_W = 0.17
export const CARD_H = 0.21

// How far an inspected card comes off the wall, toward the room.
const LIFT = 0.30

// scratch colour, reused every frame so the lens costs no allocations
const DIM_TARGET = new THREE.Color()

export default function Polaroid({ film, position, rotation = 0, onSelect, onHover, selected, inspected, dimmed = false }) {
  const group = useRef()
  const front = useRef()
  const [tex, setTex] = useState(null)
  const [back, setBack] = useState(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    let live = true
    makeCardTexture(film).then((t) => { if (live) setTex(t) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film])

  // the back is only ever needed once a card is picked up
  useEffect(() => {
    if (inspected && !back) setBack(makeBackTexture(film))
  }, [inspected, back, film])

  useFrame((_, dt) => {
    if (!group.current) return
    const g = group.current
    const lift = (hovered || selected) && !dimmed ? 1 : 0

    // The lens: a film that does not carry the chosen vibe sinks back into the
    // wall rather than disappearing, because the shape of the whole hang is the
    // point and a wall with holes in it would lie about it. Emissive is what
    // actually reads here — the faces are lit almost entirely by their own
    // emissiveMap, so dropping that is what puts a card in shadow.
    const m = front.current
    if (m) {
      m.emissiveIntensity = THREE.MathUtils.damp(
        m.emissiveIntensity, dimmed ? 0.02 : 0.26, 6, dt
      )
      m.color.lerp(DIM_TARGET.set(dimmed ? 0.28 : 1, dimmed ? 0.28 : 1, dimmed ? 0.3 : 1), 1 - Math.exp(-6 * dt))
    }

    const targetZ = position[2] + (inspected ? LIFT : lift * 0.035)
    g.position.z = THREE.MathUtils.damp(g.position.z, targetZ, inspected ? 5 : 8, dt)

    // turning the card over IS the reveal — no flip-in-place, it rotates like
    // something held in a hand
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, inspected ? Math.PI : 0, 5, dt)
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, lift || inspected ? 0 : rotation, 8, dt)

    // barely enlarged: the card is brought to you by the camera, not by
    // scaling it into a billboard. At 1.5 it filled the frame and the room
    // disappeared, which defeats reading it "in place".
    const wantScale = inspected ? 1.08 : lift ? 1.07 : 1
    const s = THREE.MathUtils.damp(g.scale.x, wantScale, 6, dt)
    g.scale.setScalar(s)
  })

  return (
    <group
      ref={group}
      position={position}
      rotation={[0, 0, rotation]}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        onHover?.(film.slug)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => { setHovered(false); onHover?.(null); document.body.style.cursor = 'auto' }}
      onClick={(e) => { e.stopPropagation(); if (!wasDrag()) onSelect?.(film) }}
    >
      {/* contact shadow on the wallpaper — fades out as the card comes away */}
      {!inspected && (
        <mesh position={[0.006, -0.008, -0.003]}>
          <planeGeometry args={[CARD_W * 1.02, CARD_H * 1.02]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.32} />
        </mesh>
      )}

      {/* front */}
      <mesh>
        <planeGeometry args={[CARD_W, CARD_H]} />
        {/* key flips when the texture lands so three rebuilds the material WITH
            the map compiled in — swapping map on a live material never enables
            USE_MAP. This was the "blank white cards" bug. */}
        {tex
          ? <meshStandardMaterial
              key="mapped"
              ref={front}
              map={tex}
              emissiveMap={tex}
              emissive="#ffffff"
              emissiveIntensity={0.26}
              roughness={0.92}
              metalness={0}
              side={THREE.FrontSide}
            />
          : <meshStandardMaterial key="blank" color="#efe9dc" roughness={0.9} />}
      </mesh>

      {/* back — mounted facing the other way so the turn reveals it */}
      <mesh rotation={[0, Math.PI, 0]} position={[0, 0, -0.0012]}>
        <planeGeometry args={[CARD_W, CARD_H]} />
        {back
          ? <meshStandardMaterial
              key="backmapped"
              map={back}
              emissiveMap={back}
              emissive="#ffffff"
              emissiveIntensity={0.22}
              roughness={0.95}
            />
          : <meshStandardMaterial key="backblank" color="#e6ddc9" roughness={0.95} />}
      </mesh>

      {/* Pushpins — they stay on the wall when the card is taken down.
          A REWATCH gets a second one: he took this photo down, watched the
          film again, and put it back up. Four films on this wall carry two
          pins, and that is the only mark on the hang that is about time
          rather than score. */}
      {!inspected && (
        <mesh position={[film.rewatch ? -0.018 : 0, CARD_H / 2 - 0.016, 0.006]}>
          <sphereGeometry args={[0.007, 10, 8]} />
          <meshStandardMaterial color="#b4403a" roughness={0.35} metalness={0.1} />
        </mesh>
      )}
      {!inspected && film.rewatch && (
        <mesh position={[0.019, CARD_H / 2 - 0.021, 0.006]}>
          <sphereGeometry args={[0.0062, 10, 8]} />
          <meshStandardMaterial color="#8d6f2f" roughness={0.4} metalness={0.15} />
        </mesh>
      )}
    </group>
  )
}
