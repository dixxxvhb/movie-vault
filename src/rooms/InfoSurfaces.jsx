import React, { useEffect, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { makeHotTakeTexture, makeScoreTexture, makeMetaTexture } from './infoTextures.js'
import { sheetOf } from '../palette.js'

// Diegetic record: rating, hot take verbatim, watched date + context, vibe
// chips — rendered as objects IN the room rather than a DOM panel over it
// (brief 4.3). Every texture is procedural canvas (vaultTextures.js /
// Polaroid.jsx:27-32 is the precedent for the async-effect + material-key-flip
// pattern), and every texture is disposed on unmount — a new precedent here,
// since nothing else in the app builds and discards a texture on every visit.
// Portrait phones see about 60% of the width a laptop sees from the same
// spot (CameraRig widens the vertical fov, capped at 1.9x, so the room does
// not turn fisheye). Score and meta hung a metre off the view axis landed
// half off the right edge in about ten rooms (sweep, 2026-10-14). On a
// narrow screen each one slides sideways along its wall, toward the line of
// sight, until it fits inside the frame from the room's entry viewpoint.
// Desktop never moves: the slide is zero at 16/10.
const REF_ASPECT = 16 / 10
function fitToView(pos, halfW, cam, aspect) {
  if (!cam?.pos || !cam?.look || !aspect || aspect >= REF_ASPECT) return pos
  const [px, , pz] = cam.pos
  const [lx, , lz] = cam.look
  let fx = lx - px, fz = lz - pz
  const len = Math.hypot(fx, fz)
  if (len < 0.01) return pos
  fx /= len; fz /= len
  const fov = THREE.MathUtils.degToRad(cam.fov ?? 50)
  const widen = Math.min(REF_ASPECT / aspect, 1.9)
  const vHalf = Math.min(Math.atan(Math.tan(fov / 2) * widen), THREE.MathUtils.degToRad(42))
  const hTan = Math.tan(vHalf) * aspect * 0.86
  const ox = pos[0] - px, oz = pos[2] - pz
  const depth = ox * fx + oz * fz
  if (depth < 0.3) return pos
  const lat = ox * -fz + oz * fx
  const room = Math.max(0, depth * hTan - halfW)
  if (Math.abs(lat) <= room) return pos
  // slide along world X (every template wall that carries the record faces
  // the entry, so X is along the wall); solve for the lateral we want
  const want = Math.sign(lat) * room
  const dLat = want - lat
  if (Math.abs(fz) < 0.2) return pos
  return [pos[0] + dLat / -fz, pos[1], pos[2]]
}

export default function InfoSurfaces({ film, config, visible = true, takeOnProps = false }) {
  const aspect = useThree((st) => st.size.width / Math.max(1, st.size.height))
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
  const scorePos = fitToView(info.scorePos || [1.2, 2.05, -1.68], 0.25, config.camera, aspect)
  const metaPos = fitToView(info.metaPos || [0, 0.78, -1.66], 0.6, config.camera, aspect)

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
      {/* When Fragments.jsx has broken the take across the room's own props,
          this card must not also exist. Two copies of the same review, one of
          them legible from the doorway, would make the fragments decorative
          and hand the player back the exact reason not to walk anywhere. The
          score and the meta line stay: those are the record, not the writing. */}
      {!takeOnProps && (
        <mesh position={hotTakePos} rotation={hotTakeRot}>
          <planeGeometry args={[1.2, 0.75]} />
          {hotTakeTex
            ? <meshBasicMaterial key="mapped" map={hotTakeTex} toneMapped={false} side={THREE.DoubleSide} />
            : <meshBasicMaterial key="blank" color={palette.paper} toneMapped={false} side={THREE.DoubleSide} />}
        </mesh>
      )}

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
