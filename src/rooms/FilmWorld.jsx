import React, { useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import CameraRig from '../CameraRig.jsx'
import { getRoomComponent } from './registry.js'

// The room a film opens into. Mounted only while world is 'film:<slug>' or
// 'exiting:<slug>' (App.jsx) — MotelWorld's lights and walls die with
// MotelWorld, so this component supplies everything a family staging needs:
// ambient fill, camera, the family component. Background color is set at
// App level (world-aware `<color>`, kept there so it's one write to
// scene.background rather than two components racing to set it).
//
// rooms/* must not import from App.jsx — the config is resolved by App (via
// registry.js) and handed down as a prop, so there is no cycle back up.
// Bloodline doors (brief §6) follow the same rule: `doors` (rooms/doors.js's
// resolved specs for this slug) and `onDoor` (a callback that runs the
// actual room-to-room hop) are both computed in App and handed down here,
// same as `config` itself — nothing below ever reaches back up for either.
export default function FilmWorld({ slug, film, config, doors, onDoor }) {
  const { camera } = useThree()
  // `i` toggles the record away for pure ambience. Local state, because
  // nothing outside this room needs to know about it.
  const [infoOn, setInfoOn] = useState(true)
  useEffect(() => {
    const k = (e) => { if (e.key === 'i' || e.key === 'I') setInfoOn((v) => !v) }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  // camera.far: a Wave B room with real depth (the tunnel descent, the sea
  // wall) will want more than the motel's 60m. Restored on unmount so leaving
  // a deep room doesn't leave the motel with the wrong far plane.
  useEffect(() => {
    if (!config.camera?.far) return
    camera.far = config.camera.far
    camera.updateProjectionMatrix()
    return () => {
      camera.far = 60
      camera.updateProjectionMatrix()
    }
  }, [camera, config.camera?.far])

  const Family = getRoomComponent(slug, config.family)

  // A bespoke room's own interior navigation (Memento's corridor stations)
  // needs to move CameraRig's station without FilmWorld's single fixed
  // camera prop getting in the way — this is that seam. Defaults to (and
  // resets to, on a slug change) the config's own entry viewpoint; a bespoke
  // room calls `goToStation` to fly the rig anywhere else, passing a key
  // suffix so CameraRig's flight actually re-triggers (an ad-hoc station
  // object has no stable identity of its own — see CameraRig.jsx's `key`).
  const [cam, setCam] = useState(() => ({ station: config.camera, key: 'film:' + slug }))
  useEffect(() => {
    setCam({ station: config.camera, key: 'film:' + slug })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, config.camera])
  const goToStation = useMemo(
    () => (station, keySuffix) => setCam({ station, key: 'film:' + slug + ':' + keySuffix }),
    [slug]
  )

  return (
    <>
      <ambientLight intensity={config.grade.ambient} color={config.grade.fill} />
      <CameraRig station={cam.station} stationKey={cam.key} />
      <Family
        film={film}
        config={config}
        infoVisible={infoOn}
        goToStation={goToStation}
        doors={doors}
        onDoor={onDoor}
      />
    </>
  )
}
