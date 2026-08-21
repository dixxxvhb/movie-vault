import React, { useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import CameraRig from '../CameraRig.jsx'
import { getArchiveRoomComponent } from './registry.js'

// The archive's own FilmWorld (see FilmWorld.jsx): mounted only while world
// is '{print,hazy}:<slug>' or 'exiting-{print,hazy}:<slug>' (App.jsx). Same
// plumbing a Ledger room gets from FilmWorld — ambient fill, the camera rig,
// the room component, camera.far restore — kept as its own file rather than
// folded into FilmWorld because neither archive room resolves through
// getRoomConfig()/CONFIGS (there is no per-slug config for either
// treatment; see rooms/archive/archiveConfig.js), and this is where App
// hands off for those two instead.
//
// `item` is a shoebox print or drawer record (public/vault-data.json),
// never a Ledger film — the room components underneath still call the prop
// `film` for shape-compatibility with GenericRoom/InfoSurfaces.
export default function ArchiveWorld({ kind, slug, item, config }) {
  const { camera } = useThree()

  useEffect(() => {
    if (!config.camera?.far) return
    camera.far = config.camera.far
    camera.updateProjectionMatrix()
    return () => {
      camera.far = 60
      camera.updateProjectionMatrix()
    }
  }, [camera, config.camera?.far])

  const Room = getArchiveRoomComponent(kind)

  // Same interior-navigation seam FilmWorld gives a bespoke Ledger room
  // (Memento's corridor stations) — Undeveloped's one "step forward" uses
  // this to move CameraRig without ArchiveWorld's own fixed camera prop
  // getting in the way.
  const [cam, setCam] = useState(() => ({ station: config.camera, key: kind + ':' + slug }))
  useEffect(() => {
    setCam({ station: config.camera, key: kind + ':' + slug })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, kind, config.camera])
  const goToStation = useMemo(
    () => (station, keySuffix) => setCam({ station, key: kind + ':' + slug + ':' + keySuffix }),
    [slug, kind]
  )

  return (
    <>
      <ambientLight intensity={config.grade.ambient} color={config.grade.fill} />
      <CameraRig station={cam.station} stationKey={cam.key} />
      <Room film={item} config={config} goToStation={goToStation} infoVisible />
    </>
  )
}
