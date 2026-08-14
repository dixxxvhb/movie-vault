import React, { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ROOM } from './Room.jsx'
import { setDragDistance } from './pointer.js'
import { useXR } from '@react-three/xr'

const HD = ROOM.D / 2
const HW = ROOM.W / 2
const EYE = 1.62

// Authored viewpoints. Click-to-station navigation (Dixon's ruling): you never
// free-walk, so every place you can stand is composed on purpose.
//
// The old `yawRange` clamps are GONE (2026-08-13). They existed to protect the
// composition, and what they actually did was make the room feel like four
// photographs instead of one place: you could stand at the Ledger and be
// physically prevented from turning your head to see the door behind you. Every
// station now looks a full 360. The authored aim is still the aim — it is where
// you are pointed when you arrive — it just no longer holds your neck.
export const STATIONS = {
  center: { pos: [0, EYE, 1.25], look: [0, 1.45, -HD], fov: 60 },
  ledger: { pos: [0, 1.5, 0.55], look: [0, 1.46, -HD], fov: 54 },
  // The Investigation is not a different wall — it is the Ledger wall with the
  // string lit. Stand back so the whole web is in frame at once.
  investigation: { pos: [0, 1.48, 1.35], look: [0, 1.44, -HD], fov: 62 },
  // aimed at the queue slips, not at the door itself — the door is scenery,
  // the list of what's next is the content
  door: { pos: [0.5, 1.58, 0.05], look: [-0.6, 1.5, HD], fov: 62 },
  mirror: { pos: [-0.2, 1.5, 0.15], look: [-HW, 1.45, 0.2], fov: 56 },
  // The archive is on the floor, so both of these look DOWN — you crouch over a
  // box, you do not stand back and admire it. Never aimed straight down: with a
  // near-vertical view vector the yaw solve degenerates and the camera spins.
  shoebox: { pos: [-0.5, 1.42, 1.82], look: [-0.5, 0.04, 0.72], fov: 62 },
  drawer: { pos: [1.28, 1.30, 0.92], look: [1.3, 0.04, -0.34], fov: 60 },
}

// Zoom is a LENS, not a walk: the station's fov divided by a factor. Keeping it
// off camera.position matters — the stations are composed positions and letting
// the wheel dolly you through the wall would undo that. 1 is the authored
// framing, 3.4 is close enough to read the handwriting on a Polaroid from the
// middle of the room, 0.78 backs off to take the whole wall in.
const ZOOM_MIN = 0.78
const ZOOM_MAX = 3.4
const FOV_MIN = 15
const FOV_MAX = 84

// Live camera facing, published for the signage (which brightens the label of
// whatever you turn toward). A ref rather than state on purpose: this changes
// every frame and nothing should re-render for it.
export const gaze = { yaw: 0, pitch: 0, zoom: 1 }

// The drag tracker lives in pointer.js (room objects need it too, and importing
// it from here made a cycle). Re-exported so existing importers keep working.
export { wasDrag } from './pointer.js'

const FLIGHT_MS = 780
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// direction vector -> YXZ yaw/pitch for a camera whose forward is -Z
function aim(pos, look) {
  const d = new THREE.Vector3(look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]).normalize()
  return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)) }
}

// `station` may be a name from STATIONS or an ad-hoc viewpoint object (used for
// per-card inspect, where the viewpoint is derived from where the card hangs).
// `stationKey` is what drives the flight, so an object identity change on
// re-render doesn't restart the camera mid-move.
export default function CameraRig({ station = 'center', stationKey }) {
  const { camera, gl } = useThree()
  const inXR = useXR((s) => s.session != null)
  const key = stationKey ?? (typeof station === 'string' ? station : 'custom')
  const resolved = typeof station === 'string' ? (STATIONS[station] || STATIONS.center) : station
  const latest = useRef(resolved)
  latest.current = resolved

  const base = useRef(aim(STATIONS.center.pos, STATIONS.center.look))
  const off = useRef({ yaw: 0, pitch: 0 })      // user's drag, relative to base
  const shown = useRef({ yaw: base.current.yaw, pitch: base.current.pitch })
  const flight = useRef(null)
  const drag = useRef(null)
  const zoom = useRef(1)          // target lens factor
  const zoomShown = useRef(1)     // damped, what the camera is actually using
  const pinch = useRef(null)

  // begin a flight whenever the station changes
  useEffect(() => {
    const s = latest.current
    const target = aim(s.pos, s.look)
    flight.current = {
      t: 0,
      fromPos: camera.position.clone(),
      toPos: new THREE.Vector3(...s.pos),
      fromYaw: shown.current.yaw,
      fromPitch: shown.current.pitch,
      // take the short way around the circle
      toYaw: shown.current.yaw + wrapAngle(target.yaw - shown.current.yaw),
      toPitch: target.pitch,
      fromFov: camera.fov,
      toFov: s.fov,
    }
    base.current = { yaw: flight.current.toYaw, pitch: target.pitch }
    off.current = { yaw: 0, pitch: 0 }
    // arriving somewhere new resets the lens — otherwise you fly to the drawer
    // still zoomed 3x into a Polaroid and land inside a plank of wood
    zoom.current = 1
  }, [key, camera])

  // drag to look around
  useEffect(() => {
    const el = gl.domElement
    const down = (e) => {
      drag.current = { x: e.clientX, y: e.clientY, moved: 0 }
      setDragDistance(0)
      el.setPointerCapture?.(e.pointerId)
    }
    const move = (e) => {
      if (!drag.current) return
      const dx = e.clientX - drag.current.x
      const dy = e.clientY - drag.current.y
      drag.current.x = e.clientX
      drag.current.y = e.clientY
      drag.current.moved += Math.abs(dx) + Math.abs(dy)

      // sensitivity tracks the lens: zoomed in, the same wrist flick used to
      // whip the room past you. This keeps the felt speed constant.
      const sens = 0.0032 / Math.max(1, zoomShown.current * 0.82)
      // yaw is unbounded — turn all the way round, as many times as you like
      off.current.yaw -= dx * sens
      off.current.pitch = THREE.MathUtils.clamp(off.current.pitch - dy * sens, -0.62, 0.62)
      el.style.cursor = 'grabbing'
    }
    const up = (e) => {
      setDragDistance(drag.current?.moved ?? 0)
      drag.current = null
      el.style.cursor = 'grab'
      el.releasePointerCapture?.(e.pointerId)
    }
    // wheel / trackpad pinch. Multiplicative so every notch feels the same at
    // any zoom; ctrlKey is how browsers report a trackpad pinch.
    const wheel = (e) => {
      e.preventDefault()
      const step = Math.exp(-e.deltaY * (e.ctrlKey ? 0.011 : 0.0016))
      zoom.current = THREE.MathUtils.clamp(zoom.current * step, ZOOM_MIN, ZOOM_MAX)
    }
    // two-finger pinch on a touchscreen
    const touchMove = (e) => {
      if (e.touches.length !== 2) return
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      if (pinch.current) {
        zoom.current = THREE.MathUtils.clamp(
          zoom.current * (d / pinch.current), ZOOM_MIN, ZOOM_MAX
        )
      }
      pinch.current = d
      e.preventDefault()
    }
    const touchEnd = () => { pinch.current = null }

    el.style.cursor = 'grab'
    el.addEventListener('pointerdown', down)
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('touchmove', touchMove, { passive: false })
    el.addEventListener('touchend', touchEnd)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('touchmove', touchMove)
      el.removeEventListener('touchend', touchEnd)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [gl, key])

  // keyboard zoom, because a laptop trackpad wheel is a miserable way to do
  // fine work and +/- is what everyone tries first
  useEffect(() => {
    const k = (e) => {
      const dir = (e.key === '+' || e.key === '=') ? 1 : (e.key === '-' || e.key === '_') ? -1 : 0
      if (!dir) return
      zoom.current = THREE.MathUtils.clamp(zoom.current * (dir > 0 ? 1.18 : 1 / 1.18), ZOOM_MIN, ZOOM_MAX)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  useFrame((_, dt) => {
    // In a session the headset owns the camera pose. Writing to it here would
    // either be overwritten or, worse, land — fighting the head pose is how you
    // make someone motion sick. The player gets moved via XROrigin instead
    // (see xr.jsx); this rig simply stops.
    if (inXR) return

    camera.rotation.order = 'YXZ'

    zoomShown.current = THREE.MathUtils.damp(zoomShown.current, zoom.current, 10, dt)

    if (flight.current) {
      const f = flight.current
      f.t = Math.min(1, f.t + (dt * 1000) / FLIGHT_MS)
      const e = easeInOutCubic(f.t)
      camera.position.lerpVectors(f.fromPos, f.toPos, e)
      shown.current.yaw = THREE.MathUtils.lerp(f.fromYaw, f.toYaw, e)
      shown.current.pitch = THREE.MathUtils.lerp(f.fromPitch, f.toPitch, e)
      const fov = THREE.MathUtils.lerp(f.fromFov, f.toFov, e)
      applyFov(camera, fov / zoomShown.current)
      if (f.t >= 1) flight.current = null
    } else {
      applyFov(camera, latest.current.fov / zoomShown.current)
      // settle toward base + the user's drag offset
      const wantYaw = base.current.yaw + off.current.yaw
      const wantPitch = base.current.pitch + off.current.pitch
      shown.current.yaw = THREE.MathUtils.damp(shown.current.yaw, wantYaw, 14, dt)
      shown.current.pitch = THREE.MathUtils.damp(shown.current.pitch, wantPitch, 14, dt)
    }

    camera.rotation.y = shown.current.yaw
    camera.rotation.x = shown.current.pitch
    camera.rotation.z = 0

    gaze.yaw = shown.current.yaw
    gaze.pitch = shown.current.pitch
    gaze.zoom = zoomShown.current
  })

  return null
}

// Every station was composed on a wide desktop window, and three's fov is
// VERTICAL — so on a narrow window the horizontal field silently shrinks and
// the composition is cropped from the sides. On a phone in portrait that ate
// the whole score axis: the numerals live at the wall's edges, so the one thing
// the Ledger exists to say ("height is the score") was off-screen on the device
// most people would open the link on. This widens the vertical fov on narrow
// viewports to hold roughly the same horizontal field, capped so portrait does
// not turn into a fisheye.
const REF_ASPECT = 16 / 10
const MAX_WIDEN = 1.9

function applyFov(camera, fov) {
  let f = fov
  const aspect = camera.aspect || REF_ASPECT
  if (aspect < REF_ASPECT) {
    const widen = Math.min(REF_ASPECT / aspect, MAX_WIDEN)
    f = THREE.MathUtils.radToDeg(
      2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(f) / 2) * widen)
    )
  }
  const v = THREE.MathUtils.clamp(f, FOV_MIN, FOV_MAX)
  if (Math.abs(camera.fov - v) < 0.001) return
  camera.fov = v
  camera.updateProjectionMatrix()
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}
