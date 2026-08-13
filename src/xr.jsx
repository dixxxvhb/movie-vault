import React, { useEffect, useState } from 'react'
import { createXRStore, XROrigin, useXR } from '@react-three/xr'
import { STATIONS } from './CameraRig.jsx'
import { ROOM } from './Room.jsx'
import { setDragDistance } from './pointer.js'

// The room has been built in metres since v6 precisely so this pass would be a
// wiring job rather than a re-authoring job. It was.
//
// The one thing that genuinely changes in a headset: the camera is no longer
// ours. On a desktop, CameraRig writes camera.position and camera.rotation every
// frame; in a session the headset writes them, and anything we write is either
// ignored or fights the pose and makes people sick. So in XR the rig stands down
// and we move the PLAYER instead — XROrigin is the player's feet, and flying to
// a station means putting their feet somewhere new, facing something new. Eye
// height then comes from the actual human, which is why the stations still work
// unchanged: they were authored at roughly standing eye level all along.

export const xrStore = createXRStore({
  // The store's own emulator is off: it cannot pass IWER the forceInstall flag
  // that desktop Chrome requires, so it silently does nothing here. Emulation is
  // handled in xrEmulator.js instead, installed before first render behind
  // ?xrsim. By the time this store exists, navigator.xr is either a real
  // headset, a fake one, or genuinely absent — and all three are handled the
  // same way from here on.
  emulate: false,
  // The room is lit by two small lights and is mostly dark; foveation this high
  // is invisible here and buys a lot of the 72fps budget back.
  foveation: 0.6,
  frameRate: 'high',
  offerSession: false,
})

// A station is authored as an EYE position plus a look target. The player's feet
// are the same spot on the floor, turned to face the target. Pitch is dropped on
// purpose: you tilt your own head in a headset, and forcing pitch on the origin
// would tilt the whole world.
export function originFor(station) {
  const s = typeof station === 'string' ? (STATIONS[station] || STATIONS.center) : station
  const dx = s.look[0] - s.pos[0]
  const dz = s.look[2] - s.pos[2]
  return {
    position: [s.pos[0], 0, s.pos[2]],
    rotation: [0, Math.atan2(-dx, -dz), 0],
  }
}

export const useInXR = () => useXR((s) => s.session != null)

export function XRPlayer({ station }) {
  const inXR = useInXR()
  const { position, rotation } = originFor(station)

  // wasDrag() is latched by the last desktop pointer-up and nothing in a session
  // ever clears it — so entering XR right after a look-around drag would leave
  // every controller click silently swallowed. Clear it at the door.
  useEffect(() => { if (inXR) setDragDistance(0) }, [inXR])

  return <XROrigin disabled={!inXR} position={position} rotation={rotation} />
}

// In a headset there is no HUD and no Esc key, so there has to be an in-world
// way back out to the middle of the room. The floor is the obvious one: look
// down, point at the carpet, click. Only exists in a session — on desktop, Esc
// already does this and a clickable floor would just eat stray clicks.
export function XRFloorZone({ onBack }) {
  const inXR = useInXR()
  if (!inXR) return null
  return (
    <mesh
      position={[0, 0.004, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => { e.stopPropagation(); onBack() }}
    >
      <planeGeometry args={[ROOM.W, ROOM.D]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

// The button. Rendered only once the browser admits it can do immersive-vr, so
// desktop visitors are not shown a control that cannot work. On localhost the
// emulator answers yes, which is intentional — that is the test path.
export function EnterVR({ style }) {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    let live = true
    const check = () => {
      navigator.xr?.isSessionSupported('immersive-vr')
        .then((v) => { if (live) setOk(!!v) })
        .catch(() => {})
    }
    check()
    // A real headset answers on the first check. The dev emulator does not: it
    // installs its own navigator.xr asynchronously, AFTER we have already asked
    // and been told no. Re-checking on store changes catches that hand-off —
    // without it the button never appears on localhost and the session can
    // never be tested.
    const unsub = xrStore.subscribe(check)
    return () => { live = false; unsub() }
  }, [])
  if (!ok) return null
  return (
    <button style={style} onClick={() => xrStore.enterVR()}>
      enter vr
    </button>
  )
}
