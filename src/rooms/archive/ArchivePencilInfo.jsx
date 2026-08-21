import React, { useEffect, useState } from 'react'
import * as THREE from 'three'
import { makePencilScoreTexture, makePencilNoteTexture } from './archiveTextures.js'

// The faded room's own info surfaces (brief §3 / Wave C): the memory score
// styled IN PENCIL, plus the print's snap line and note. Deliberately not
// InfoSurfaces — that component's hot-take sheet and vibe-chip row assume a
// Ledger record (verbatim hot take, vibes[]) an archive print never carries,
// and rendering an empty/placeholder version of either would read as a
// broken Ledger room rather than the same world seen faded (the exact
// failure the brief warns against by name). GenericRoom takes this as its
// `InfoComponent` prop (see archive/FadedRoom.jsx) — same call shape as
// InfoSurfaces so it drops in without touching GenericRoom's own logic.
export default function ArchivePencilInfo({ film, config, visible = true }) {
  const [scoreTex, setScoreTex] = useState(null)
  const [noteTex, setNoteTex] = useState(null)

  useEffect(() => {
    let live = true
    const t = makePencilScoreTexture(film)
    if (live) setScoreTex(t)
    return () => { live = false; t.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug])

  useEffect(() => {
    let live = true
    const t = makePencilNoteTexture(film)
    if (live) setNoteTex(t)
    return () => { live = false; t.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [film.slug])

  if (!visible) return null

  const info = config.info || {}
  const notePos = info.hotTakePos || [0, 1.55, -1.7]
  const noteRot = info.hotTakeRot || [0, 0, 0]
  const scorePos = info.scorePos || [1.2, 2.0, -1.68]

  return (
    <group>
      <mesh position={notePos} rotation={noteRot}>
        <planeGeometry args={[1.2, 0.6]} />
        {noteTex
          ? <meshBasicMaterial key="mapped" map={noteTex} transparent opacity={0.92} toneMapped={false} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" transparent opacity={0} />}
      </mesh>

      <mesh position={scorePos}>
        <planeGeometry args={[0.46, 0.46]} />
        {scoreTex
          ? <meshBasicMaterial key="mapped" map={scoreTex} transparent depthWrite={false} opacity={0.85} side={THREE.DoubleSide} />
          : <meshBasicMaterial key="blank" transparent opacity={0} />}
      </mesh>
    </group>
  )
}
