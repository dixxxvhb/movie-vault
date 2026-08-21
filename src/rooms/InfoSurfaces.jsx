import React, { useEffect, useState } from 'react'
import * as THREE from 'three'
import { makeHotTakeTexture, makeScoreTexture, makeMetaTexture } from './infoTextures.js'
import { sheetOf } from '../palette.js'

// Diegetic record: rating, hot take verbatim, watched date + context, vibe
// chips — rendered as objects IN the room rather than a DOM panel over it
// (brief 4.3). Every texture is procedural canvas (vaultTextures.js /
// Polaroid.jsx:27-32 is the precedent for the async-effect + material-key-flip
// pattern), and every texture is disposed on unmount — a new precedent here,
// since nothing else in the app builds and discards a texture on every visit.
export default function InfoSurfaces({ film, config, visible = true }) {
  const palette = sheetOf(film.palette)
  const [hotTakeTex, setHotTakeTex] = useState(null)
  const [scoreTex, setScoreTex] = useState(null)
  const [metaTex, setMetaTex] = useState(null)

  useEffect(() => {
    let live = true
    const t = makeHotTakeTexture(film, palette)
    if (live) setHotTakeTex(t)
    return () => { live = false; t.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug])

  useEffect(() => {
    let live = true
    const t = makeScoreTexture(film, palette)
    if (live) setScoreTex(t)
    return () => { live = false; t.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug])

  useEffect(() => {
    let live = true
    const t = makeMetaTexture(film, palette)
    if (live) setMetaTex(t)
    return () => { live = false; t.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug])

  if (!visible) return null

  const info = config.info || {}
  const hotTakePos = info.hotTakePos || [0, 1.55, -1.7]
  const hotTakeRot = info.hotTakeRot || [0, 0, 0]
  const scorePos = info.scorePos || [1.2, 2.05, -1.68]
  const metaPos = info.metaPos || [0, 0.78, -1.66]

  return (
    <group>
      {/* the hot take sheet: the centerpiece, given presence with an
          emissive map so it reads clean in a room this dark */}
      {/* QA sweep 2026-08-21: this sheet used to be a meshStandardMaterial
          with BOTH a map and an emissiveMap — in any room where the key
          light sits close by (most of them; see GenericRoom.jsx), that
          diffuse reflection stacked on top of the emissive glow and Bloom
          pushed the whole card to solid white, erasing the verbatim text
          (memento, enemy, stby, exmachina, niceguys, poorthings, br2049).
          The card is meant to be self-lit and legible regardless of the
          room around it, so it's unlit (meshBasicMaterial) now — the
          texture's own baked contrast is the only thing that reaches the
          screen, and Bloom can no longer double-count it. */}
      <mesh position={hotTakePos} rotation={hotTakeRot}>
        <planeGeometry args={[1.2, 0.75]} />
        {hotTakeTex
          ? <meshBasicMaterial key="mapped" map={hotTakeTex} toneMapped={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" color={palette.paper} toneMapped={false} side={THREE.DoubleSide} />}
      </mesh>

      {/* the score object */}
      <mesh position={scorePos}>
        <planeGeometry args={[0.5, 0.5]} />
        {scoreTex
          ? <meshBasicMaterial key="mapped" map={scoreTex} transparent depthWrite={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" transparent opacity={0} />}
      </mesh>

      {/* meta line + vibe chips */}
      <mesh position={metaPos}>
        <planeGeometry args={[1.2, 0.3]} />
        {metaTex
          ? <meshBasicMaterial key="mapped" map={metaTex} transparent depthWrite={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" transparent opacity={0} />}
      </mesh>
    </group>
  )
}
