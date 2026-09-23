import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import CameraRig from '../CameraRig.jsx'
import { getRoomComponent } from './registry.js'
import { enterRoom } from '../visits.js'
import { HouseRig, useLitConfig } from './useHouseLights.js'
import MotelUnderneath, { motelAnchorsFor } from './MotelUnderneath.jsx'
import Fragments, { planFragments } from './Fragments.jsx'
import { resetHouse, subscribeLevel } from './houseLights.js'

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

  // The visit. Banked on the way OUT, and only if you stayed: walking through
  // a doorway and straight back out is not a visit, and a taste law that
  // crystallises because somebody clipped the corner of a room is a law that
  // lied to them. Written as an effect cleanup so it cannot be forgotten.
  useEffect(() => enterRoom(slug), [slug])

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

  // THE HOUSE LIGHTS, for every room including the sixteen bespoke ones,
  // which never touch GenericRoom. Blending here rather than inside the room
  // means a bespoke file needs no change at all: it is handed a config whose
  // grade already carries the switch.
  //
  // Level is quantised to 1/60 before it reaches state, so a settled room
  // stops re-rendering and only the ~700ms of travel costs anything.
  const [house, setHouse] = useState(0)
  useEffect(() => {
    resetHouse()
    setHouse(0)
    return subscribeLevel((v) => setHouse(Math.round(v * 60) / 60))
  }, [slug])

  const lit = useLitConfig(config, house)
  const motelAnchors = useMemo(
    () => motelAnchorsFor(config.place?.shell || 'box', config.place?.shellParams || {}, config.camera),
    [config.place?.shell, config.place?.shellParams, config.camera]
  )
  // A bespoke room has no `place.props`, so planFragments finds no carriers
  // and returns nothing. That is correct for now: those rooms hand-place
  // their own writing and a scrap floating at the origin would be worse than
  // no scrap. Authoring info.fragments per bespoke room is the follow-up.
  const fragments = useMemo(() => planFragments(film, config), [film, config])

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
      <ambientLight intensity={lit.grade.ambient} color={lit.grade.fill} />
      <HouseRig />
      <MotelUnderneath shell={config.place?.shell || 'box'} anchors={motelAnchors}
                       filmAmbient={config.grade?.ambient} />
      {infoOn && fragments.length > 0 && <Fragments film={film} config={lit} plan={fragments} />}
      {/* Wave M1: free walk inside a film room (Dixon's ruling — you never
          free-walk the motel, but a room you've stepped inside is a place,
          not a photograph). Eye height is the authored station's own y —
          rooms with a sloped floor override it via a bespoke registerFloor
          call in a later wave; GenericRoom's auto-colliders are flat. */}
      <CameraRig station={cam.station} stationKey={cam.key} walkable={{ eye: config.camera.pos[1] ?? 1.55 }} />
      {/* Suspense for lazily loaded rooms (registry.js); a static room never suspends. */}
      <Suspense fallback={null}>
        <Family
          film={film}
          config={lit}
          infoVisible={infoOn}
          goToStation={goToStation}
          doors={doors}
          onDoor={onDoor}
        />
      </Suspense>
    </>
  )
}
