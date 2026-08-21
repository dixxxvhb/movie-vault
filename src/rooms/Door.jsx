import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { makeDoorPlaqueTexture } from './doorTextures.js'

// The one shared door primitive every bloodline door renders through
// (VAULT-IMMERSION-BRIEF-v2.md §6): frame + panel + a small plaque, styled
// automatically from the ROOM's own material language (config.grade —
// grade.key/grade.fill/grade.acc) rather than one hand-style per film.
//
// `spec` comes from rooms/doors.js: {kind: 'ledger'|'archive'|'locked',
// targetSlug, targetTitle, targetYear, note}. A locked door (the far end is
// a queue title, a drawer film, or anything the vault never developed) gets
// a dark panel and no handle; clicking it never calls `onDoor` — just a
// subtle dim pulse, the refusal the brief asks for. A working door calls
// `onDoor(spec)`, which the room got as a plain prop from FilmWorld (which
// got it from App) — no import back up to App.jsx anywhere in this chain.
export default function Door({ position, rotationY = 0, scale = 1, grade, spec, onDoor }) {
  const locked = spec.kind === 'locked'
  const panelRef = useRef()
  const overlayRef = useRef()
  const pulseRef = useRef(0) // 0..1, decays after a locked click; 0 = idle

  const DOOR_W = 0.9
  const DOOR_H = 2.05
  const FRAME_T = 0.08

  const plaqueTex = useMemo(
    () => makeDoorPlaqueTexture(spec, grade),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spec.id]
  )
  useEffect(() => () => plaqueTex?.dispose(), [plaqueTex])

  const frameColor = grade?.key || '#8a7a5a'
  const panelColor = locked ? '#0f0c09' : (grade?.fill || '#2c2418')
  const trimColor = grade?.acc || grade?.key || '#5a4a30'

  useFrame((_, dt) => {
    if (pulseRef.current <= 0) return
    pulseRef.current = Math.max(0, pulseRef.current - dt * 1.6)
    if (overlayRef.current) overlayRef.current.opacity = pulseRef.current * 0.4
    if (panelRef.current) {
      const s = 1 - Math.sin(pulseRef.current * Math.PI) * 0.02
      panelRef.current.scale.set(s, s, 1)
    }
  })

  const handleClick = (e) => {
    e.stopPropagation()
    if (locked) { pulseRef.current = 1; return }
    onDoor?.(spec)
  }

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* frame: two jambs + a lintel */}
      <mesh position={[-DOOR_W / 2 - FRAME_T / 2, DOOR_H / 2, 0]}>
        <boxGeometry args={[FRAME_T, DOOR_H + FRAME_T, FRAME_T * 1.5]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>
      <mesh position={[DOOR_W / 2 + FRAME_T / 2, DOOR_H / 2, 0]}>
        <boxGeometry args={[FRAME_T, DOOR_H + FRAME_T, FRAME_T * 1.5]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>
      <mesh position={[0, DOOR_H + FRAME_T / 2, 0]}>
        <boxGeometry args={[DOOR_W + FRAME_T * 2, FRAME_T, FRAME_T * 1.5]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>

      {/* panel — the click target */}
      <mesh
        ref={panelRef}
        position={[0, DOOR_H / 2, 0]}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = locked ? 'not-allowed' : 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        <boxGeometry args={[DOOR_W, DOOR_H, 0.05]} />
        <meshStandardMaterial color={panelColor} roughness={locked ? 0.98 : 0.55} metalness={locked ? 0 : 0.12} />
      </mesh>

      {/* the refusal overlay — a thin black plane that briefly dims the
          panel when a locked door is clicked, then fades. Idle at opacity 0,
          invisible and inert otherwise. */}
      <mesh position={[0, DOOR_H / 2, 0.028]}>
        <planeGeometry args={[DOOR_W, DOOR_H]} />
        <meshBasicMaterial ref={overlayRef} color="#000000" transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* handle — working doors only */}
      {!locked && (
        <mesh position={[DOOR_W / 2 - 0.09, DOOR_H * 0.5, 0.05]}>
          <boxGeometry args={[0.03, 0.16, 0.03]} />
          <meshStandardMaterial color={trimColor} roughness={0.4} metalness={0.5} />
        </mesh>
      )}

      {/* the plaque: the link's note verbatim + the other film's title.
          Held well clear of the panel face (0.09m) so no viewing angle can
          clip it into the door the way a near-coplanar sheet clipped into
          the Baby Driver facade (that room's own QA note is the precedent
          for this exact bug class) — every word has to actually render. */}
      <mesh position={[0, DOOR_H * 0.58, 0.09]}>
        <planeGeometry args={[DOOR_W * 0.86, 0.38]} />
        {plaqueTex
          ? <meshBasicMaterial map={plaqueTex} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial transparent opacity={0} />}
      </mesh>
    </group>
  )
}
