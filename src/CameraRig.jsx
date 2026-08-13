import React, { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ROOM } from './Room.jsx'

const HD = ROOM.D / 2
const HW = ROOM.W / 2
const EYE = 1.62

// Authored viewpoints. Click-to-station navigation (Dixon's ruling): you never
// free-walk, so every place you can stand is composed on purpose.
export const STATIONS = {
  center: { pos: [0, EYE, 1.25], look: [0, 1.45, -HD], fov: 60, freeLook: true },
  ledger: { pos: [0, 1.5, 0.55], look: [0, 1.46, -HD], fov: 54, yawRange: 0.45 },
  investigation: { pos: [0.2, 1.5, 0], look: [HW, 1.45, 0], fov: 56, yawRange: 0.5 },
  door: { pos: [0.1, 1.55, 0.0], look: [0.95, 1.3, HD], fov: 58, yawRange: 0.5 },
  mirror: { pos: [-0.2, 1.5, 0.15], look: [-HW, 1.45, 0.2], fov: 56, yawRange: 0.5 },
}

// How far the pointer travelled during the last press. Click handlers consult
// this so "drag to look" never also counts as "click the thing behind cursor".
let lastDragDistance = 0
export const wasDrag = () => lastDragDistance > 6

const FLIGHT_MS = 780
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// direction vector -> YXZ yaw/pitch for a camera whose forward is -Z
function aim(pos, look) {
  const d = new THREE.Vector3(look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]).normalize()
  return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)) }
}

export default function CameraRig({ station = 'center' }) {
  const { camera, gl } = useThree()

  const base = useRef(aim(STATIONS.center.pos, STATIONS.center.look))
  const off = useRef({ yaw: 0, pitch: 0 })      // user's drag, relative to base
  const shown = useRef({ yaw: base.current.yaw, pitch: base.current.pitch })
  const flight = useRef(null)
  const drag = useRef(null)

  // begin a flight whenever the station changes
  useEffect(() => {
    const s = STATIONS[station] || STATIONS.center
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
  }, [station, camera])

  // drag to look around
  useEffect(() => {
    const el = gl.domElement
    const down = (e) => {
      drag.current = { x: e.clientX, y: e.clientY, moved: 0 }
      lastDragDistance = 0
      el.setPointerCapture?.(e.pointerId)
    }
    const move = (e) => {
      if (!drag.current) return
      const dx = e.clientX - drag.current.x
      const dy = e.clientY - drag.current.y
      drag.current.x = e.clientX
      drag.current.y = e.clientY
      drag.current.moved += Math.abs(dx) + Math.abs(dy)

      const s = STATIONS[station] || STATIONS.center
      const sens = 0.0032
      let yaw = off.current.yaw - dx * sens
      let pitch = off.current.pitch - dy * sens
      if (!s.freeLook) {
        const r = s.yawRange ?? 0.6
        yaw = THREE.MathUtils.clamp(yaw, -r, r)
      }
      off.current.yaw = yaw
      off.current.pitch = THREE.MathUtils.clamp(pitch, -0.42, 0.5)
      el.style.cursor = 'grabbing'
    }
    const up = (e) => {
      lastDragDistance = drag.current?.moved ?? 0
      drag.current = null
      el.style.cursor = 'grab'
      el.releasePointerCapture?.(e.pointerId)
    }
    el.style.cursor = 'grab'
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [gl, station])

  useFrame((_, dt) => {
    camera.rotation.order = 'YXZ'

    if (flight.current) {
      const f = flight.current
      f.t = Math.min(1, f.t + (dt * 1000) / FLIGHT_MS)
      const e = easeInOutCubic(f.t)
      camera.position.lerpVectors(f.fromPos, f.toPos, e)
      shown.current.yaw = THREE.MathUtils.lerp(f.fromYaw, f.toYaw, e)
      shown.current.pitch = THREE.MathUtils.lerp(f.fromPitch, f.toPitch, e)
      const fov = THREE.MathUtils.lerp(f.fromFov, f.toFov, e)
      if (Math.abs(camera.fov - fov) > 0.001) {
        camera.fov = fov
        camera.updateProjectionMatrix()
      }
      if (f.t >= 1) flight.current = null
    } else {
      // settle toward base + the user's drag offset
      const wantYaw = base.current.yaw + off.current.yaw
      const wantPitch = base.current.pitch + off.current.pitch
      shown.current.yaw = THREE.MathUtils.damp(shown.current.yaw, wantYaw, 14, dt)
      shown.current.pitch = THREE.MathUtils.damp(shown.current.pitch, wantPitch, 14, dt)
    }

    camera.rotation.y = shown.current.yaw
    camera.rotation.x = shown.current.pitch
    camera.rotation.z = 0
  })

  return null
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}
