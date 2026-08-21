import React, { useEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import CameraRig from '../CameraRig.jsx'
import { getFamilyComponent } from './registry.js'

// The room a film opens into. Mounted only while world is 'film:<slug>' or
// 'exiting:<slug>' (App.jsx) — MotelWorld's lights and walls die with
// MotelWorld, so this component supplies everything a family staging needs:
// ambient fill, camera, the family component. Background color is set at
// App level (world-aware `<color>`, kept there so it's one write to
// scene.background rather than two components racing to set it).
//
// rooms/* must not import from App.jsx — the config is resolved by App (via
// registry.js) and handed down as a prop, so there is no cycle back up.
export default function FilmWorld({ slug, film, config }) {
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

  const Family = getFamilyComponent(config.family)

  return (
    <>
      <ambientLight intensity={config.grade.ambient} color={config.grade.fill} />
      <CameraRig station={config.camera} stationKey={'film:' + slug} />
      <Family film={film} config={config} infoVisible={infoOn} />
    </>
  )
}
