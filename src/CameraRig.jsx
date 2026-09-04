import React, { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ROOM } from './Room.jsx'
import { setDragDistance, exitPointerLock } from './pointer.js'
import { useXR } from '@react-three/xr'
import { keyVec, pollDevices, turnAxis } from './input.js'
import { get as getSetting, subscribe as subscribeSettings } from './settings.js'
import { resolveStep, floorYAt, publishWalkPos, consumeTeleport } from './rooms/colliders.js'
import { publishWalkEvent } from './rooms/walkBus.js'

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
// `frame` is the world width a station MUST show. On a portrait phone the
// camera dollies backwards along its own view axis until that width fits
// (framedPos below); on desktop the pull computes to zero and the authored
// position is used unchanged. Only the stations that frame a WALL declare it,
// because the shoebox and the drawer are objects you crouch over and stepping
// back from those would be the wrong instinct entirely.
export const STATIONS = {
  center: { pos: [0, EYE, 1.25], look: [0, 1.45, -HD], fov: 60, frame: 3.4, maxBack: 0.6 },
  // 3.9 of the 4.2m wall: the cards, both pencil rules, and the score numerals
  // at both edges. Losing the numerals loses the one thing the Ledger says.
  ledger: { pos: [0, 1.5, 0.55], look: [0, 1.46, -HD], fov: 54, frame: 3.9, maxBack: 1.3 },
  // The Investigation is not a different wall — it is the Ledger wall with the
  // string lit. Stand back so the whole web is in frame at once.
  investigation: { pos: [0, 1.48, 1.35], look: [0, 1.44, -HD], fov: 62, frame: 3.9, maxBack: 0.5 },
  // aimed at the queue slips, not at the door itself — the door is scenery,
  // the list of what's next is the content
  door: { pos: [0.5, 1.58, 0.05], look: [-0.6, 1.5, HD], fov: 62, frame: 2.4, maxBack: 1.2 },
  mirror: { pos: [-0.2, 1.5, 0.15], look: [-HW, 1.45, 0.2], fov: 56, frame: 2.6, maxBack: 1.5 },
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

// Wave M1: walk bob. Module-level rather than React state (same reasoning as
// `gaze` — read every frame inside useFrame, and toggled from the film HUD,
// which lives outside the Canvas entirely). Default on; persisted so the
// choice survives a reload.
const BOB_KEY = 'vault-bob'
function readBobPersisted() {
  try { return localStorage.getItem(BOB_KEY) } catch { return null }
}
let bobEnabled = readBobPersisted() !== 'off'
export function setWalkBob(on) {
  bobEnabled = on
  try { localStorage.setItem(BOB_KEY, on ? 'on' : 'off') } catch { /* private mode */ }
}
export function isWalkBobOn() {
  return bobEnabled
}

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
export default function CameraRig({ station = 'center', stationKey, walkable = null }) {
  const { camera, gl, setEvents } = useThree()
  const inXR = useXR((s) => s.session != null)
  const key = stationKey ?? (typeof station === 'string' ? station : 'custom')
  const resolved = typeof station === 'string' ? (STATIONS[station] || STATIONS.center) : station
  const latest = useRef(resolved)
  latest.current = resolved
  const walkableRef = useRef(walkable)
  walkableRef.current = walkable
  // `walkable` is a fresh object every render (FilmWorld/ArchiveWorld pass a
  // literal), but whether it's present at all is stable for the room's whole
  // lifetime — true dep would tear the pointer-lock effect below down and
  // rebuild it every frame for no reason.
  const isWalkableRoom = walkable != null

  const base = useRef(aim(STATIONS.center.pos, STATIONS.center.look))
  const off = useRef({ yaw: 0, pitch: 0 })      // user's drag, relative to base
  const shown = useRef({ yaw: base.current.yaw, pitch: base.current.pitch })
  const flight = useRef(null)
  const drag = useRef(null)
  const zoom = useRef(1)          // target lens factor
  const zoomShown = useRef(1)     // damped, what the camera is actually using
  const pinch = useRef(null)

  // Wave M1: walk state. `walkPos`/`walkY` are the CANONICAL (un-bobbed)
  // position — bob is a purely visual offset added to camera.position after
  // these are resolved, so it never feeds back into next frame's collision
  // solve. null until the first idle frame after landing, which seeds it
  // from wherever the flight actually put the camera.
  const walkPos = useRef(null)
  const walkVel = useRef({ x: 0, z: 0 })
  const walkY = useRef(null)
  const bobPhase = useRef(0)

  // Keyboard / gamepad turn. Read into refs from the settings store once and
  // on change, rather than walking an object path every frame inside
  // useFrame. snapArmed latches a snap turn to one step per press.
  const turnMode = useRef(getSetting('motion.turn') || 'smooth')
  const snapDeg = useRef(getSetting('motion.snapDegrees') || 45)
  const lookRate = useRef(getSetting('motion.lookSpeed') || 1)
  const snapArmed = useRef(false)
  useEffect(() => subscribeSettings(() => {
    turnMode.current = getSetting('motion.turn') || 'smooth'
    snapDeg.current = getSetting('motion.snapDegrees') || 45
    lookRate.current = getSetting('motion.lookSpeed') || 1
  }), [])

  // Wave P0: the flight-landing micro-dip (IMMERSION-V2-POLISH-SPEC.md #4 —
  // "eased stop ... plus landing micro-dip after a flight, 2cm/250ms").
  // `active` flips true the instant a flight's own t reaches 1 below; a
  // half-sine impulse (down, then back to zero) is added to camera.position.y
  // for the next 250ms of idle frames. Gated on the same walk-bob toggle as
  // the rest of the camera's physical polish — a visitor who turned bob off
  // asked for a steadier eye, and a sudden 2cm dip is exactly what that
  // toggle exists to suppress.
  const landDip = useRef({ active: false, t: 0 })
  const LAND_DIP_DUR = 0.25
  const LAND_DIP_AMP = 0.02

  // begin a flight whenever the station changes
  useEffect(() => {
    // Wave M2: every flight — a landmark click, a door hop, an exit — passes
    // through here regardless of what triggered it, which makes this the one
    // place that catches all of "flight start releases pointer lock" without
    // hunting down every caller.
    exitPointerLock()
    const s = latest.current
    const target = aim(s.pos, s.look)
    flight.current = {
      t: 0,
      fromPos: camera.position.clone(),
      toPos: new THREE.Vector3(...framedPos(s, camera.aspect)),
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
    // A flight means the walker's position is stale (a new station, a door
    // hop, a landmark click) — drop the canonical walk position and velocity
    // so the next idle frame re-seeds from wherever this flight actually
    // lands, and old momentum never carries into the new place.
    walkPos.current = null
    walkVel.current = { x: 0, z: 0 }
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

  // Wave M2: pointer lock. Two things happen while locked, both scoped to
  // walkable rooms only (the motel never sees this — `isWalkableRoom` is
  // false there, so this effect is a no-op).
  //
  // 1. mousemove -> look. Under lock, clientX/clientY freeze at wherever the
  //    cursor was when the lock engaged (the spec: only movementX/Y report
  //    real deltas), so the existing drag-look effect above goes quietly
  //    inert during lock (its dx/dy come out 0 every frame) rather than
  //    fighting this one — no double-application, nothing to guard.
  // 2. R3F's click/hover raycast normally reads event.offsetX/offsetY (see
  //    the library's default `events.compute`, which is exactly that
  //    formula) — under lock those are just as frozen as clientX/Y, so a
  //    room's door/hotspot meshes would keep resolving against the spot you
  //    clicked to engage the lock, not what the crosshair is actually on
  //    once you've turned to look elsewhere. `setEvents({ compute })` is
  //    R3F's own supported override point (same one VR reticle raycasting
  //    uses) — swapping it to always raycast from viewport centre while
  //    locked is far less code than hand-rolling a parallel raycast-and-
  //    dispatch, and it means every room's existing onClick/wasDrag-guarded
  //    handlers keep working unchanged, locked or not.
  useEffect(() => {
    if (!isWalkableRoom) return undefined
    const target = gl.domElement
    const defaultCompute = (event, state) => {
      state.pointer.set(
        (event.offsetX / state.size.width) * 2 - 1,
        -(event.offsetY / state.size.height) * 2 + 1
      )
      state.raycaster.setFromCamera(state.pointer, state.camera)
    }
    const centerCompute = (event, state) => {
      state.pointer.set(0, 0)
      state.raycaster.setFromCamera(state.pointer, state.camera)
    }
    const applyForLockState = () => {
      setEvents({ compute: document.pointerLockElement === target ? centerCompute : defaultCompute })
    }
    const move = (e) => {
      if (document.pointerLockElement !== target) return
      const sens = 0.0032 / Math.max(1, zoomShown.current * 0.82)
      off.current.yaw -= e.movementX * sens
      off.current.pitch = THREE.MathUtils.clamp(off.current.pitch - e.movementY * sens, -0.62, 0.62)
    }
    applyForLockState()
    document.addEventListener('pointerlockchange', applyForLockState)
    document.addEventListener('mousemove', move)
    return () => {
      document.removeEventListener('pointerlockchange', applyForLockState)
      document.removeEventListener('mousemove', move)
      setEvents({ compute: defaultCompute })
    }
  }, [isWalkableRoom, gl, setEvents])

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

    // Gamepads are not event-driven — navigator.getGamepads() hands back a
    // fresh snapshot and the diff is ours to do — so the pad is polled once
    // per frame here, before anything reads an action.
    pollDevices()

    // Look without a mouse. Drag-to-look with no keyboard alternative is a
    // WCAG 2.2 single-pointer failure on its own, and it also locks out
    // anyone who can press a key but cannot hold and drag. Two modes:
    // smooth turn at an adjustable rate, or snap turn, which doubles as the
    // strongest vestibular mitigation there is (rotation is worse than
    // translation for sickness, and discrete beats continuous).
    const turn = turnAxis()
    if (turn !== 0) {
      if (turnMode.current === 'snap') {
        // One step per press, not per frame. snapArmed latches until the key
        // comes back up, so holding turn does not spin.
        if (!snapArmed.current) {
          snapArmed.current = true
          off.current.yaw -= turn * (snapDeg.current * Math.PI) / 180
        }
      } else {
        off.current.yaw -= turn * 1.9 * lookRate.current * dt
      }
    } else {
      snapArmed.current = false
    }

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
      if (f.t >= 1) {
        flight.current = null
        landDip.current = { active: true, t: 0 }
      }
    } else {
      // WALK — inserted ahead of the yaw/pitch settle so a same-frame lens
      // reset (walking resets the zoom) and the position write both land
      // before applyFov reads zoomShown this frame. Idle otherwise never
      // touches camera.position (only rotation/fov) — this is additive, so
      // a non-walkable room (the motel) is byte-identical to before.
      const w = walkableRef.current
      if (w) {
        if (!walkPos.current) {
          walkPos.current = { x: camera.position.x, z: camera.position.z }
        }
        // Wave M3: a queued teleport (Predestination's real loop wrap) wins
        // over this frame's own integration — consumed once, applied to the
        // canonical position before anything below reads it, so walkPos and
        // camera.position never disagree for even one frame.
        const teleport = consumeTeleport()
        if (teleport) {
          walkPos.current = { x: teleport.x, z: teleport.z }
        }
        const speed = w.speed ?? 2.2
        const radius = w.radius ?? 0.28
        const eye = w.eye ?? 1.55
        const yaw = shown.current.yaw
        const kv = keyVec()
        // forward = -Z rotated by yaw (aim()'s convention); right is forward
        // turned -90 degrees so D (kv.x=+1) strafes to the camera's right.
        const fx = -Math.sin(yaw), fz = -Math.cos(yaw)
        const rx = Math.cos(yaw), rz = -Math.sin(yaw)
        const targetX = speed * (kv.x * rx + kv.z * fx)
        const targetZ = speed * (kv.x * rz + kv.z * fz)
        const targetSpeed = Math.hypot(targetX, targetZ)
        const curSpeed = Math.hypot(walkVel.current.x, walkVel.current.z)
        // frame-rate independent exponential damping toward the target
        // velocity — accel is snappier than decel (0.09s vs 0.14s) so
        // starting to walk feels immediate and stopping still has a touch
        // of weight to it.
        const tau = targetSpeed >= curSpeed ? 0.09 : 0.14
        const kAccel = 1 - Math.exp(-dt / tau)
        walkVel.current.x += (targetX - walkVel.current.x) * kAccel
        walkVel.current.z += (targetZ - walkVel.current.z) * kAccel

        const speedMag = Math.hypot(walkVel.current.x, walkVel.current.z)
        const moving = speedMag > 0.05

        const dx = walkVel.current.x * dt
        const dz = walkVel.current.z * dt
        const next = (dx !== 0 || dz !== 0)
          ? resolveStep(walkPos.current.x, walkPos.current.z, dx, dz, radius)
          : walkPos.current
        walkPos.current = next
        publishWalkPos(next.x, next.z)

        const targetEyeY = floorYAt(next.x, next.z) + eye
        walkY.current = walkY.current == null
          ? targetEyeY
          : THREE.MathUtils.damp(walkY.current, targetEyeY, 10, dt)

        let bobX = 0, bobY = 0
        if (bobEnabled && moving) {
          const speed01 = Math.min(1, speedMag / speed)
          const prevPhase = bobPhase.current
          bobPhase.current += dt * 7.4 * speed01
          bobY = Math.sin(bobPhase.current) * 0.012 * speed01
          bobX = Math.sin(bobPhase.current * 0.5) * 0.004 * speed01
          // one footfall per half-cycle (each PI crossing) — publish, the
          // audio engine subscribes to this bus in a later wave.
          if (Math.floor(prevPhase / Math.PI) !== Math.floor(bobPhase.current / Math.PI)) {
            // Wave T: the audio engine's footstep subscriber scales its tick
            // gain by how fast you're actually moving — a light shuffle
            // reads different from a near-jog. `speedMag / speed` is the
            // room's own walk speed as the "loud" reference, same speed01
            // math bob already uses two lines up.
            publishWalkEvent({ type: 'step', speed: speedMag / speed })
          }
        }

        // lateral bob sways along the camera's RIGHT vector, not world X —
        // along world X it reads as forward judder whenever you face east/west
        camera.position.set(next.x + bobX * rx, walkY.current + bobY, next.z + bobX * rz)

        // you cannot sprint around zoomed to 3.4x — walking resets the lens
        if (moving) {
          zoom.current = THREE.MathUtils.damp(zoom.current, 1, 6, dt)
        }
      }

      applyFov(camera, latest.current.fov / zoomShown.current)

      // Wave P0: the landing micro-dip itself — a half-sine impulse added
      // on top of whatever y the flight/walk logic above already settled
      // on, decaying to exactly 0 by LAND_DIP_DUR so it never leaves a
      // residual offset behind.
      if (landDip.current.active) {
        landDip.current.t += dt
        if (landDip.current.t >= LAND_DIP_DUR) {
          landDip.current.active = false
        } else if (bobEnabled) {
          const p = landDip.current.t / LAND_DIP_DUR
          camera.position.y -= LAND_DIP_AMP * Math.sin(Math.PI * p)
        }
      }

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

// Widening the fov alone cannot save a portrait phone, and the numbers say so.
// The Ledger wall is 4.2m wide and the room is 4.0m deep, so from the composed
// ledger station (2.55m off the wall) a 390x844 screen sees a 45 degree
// horizontal field, which is 2.12m of a 4.2m wall. Exactly half. Memento, the
// 10.0, the entire argument of the wall, sits off the left edge on the device
// most visitors arrive on.
//
// You cannot fix that with more fov without turning the room into a fisheye.
// What a photographer does instead is step back, so that is what this does: a
// station may declare `frame`, the world width it must actually show, and on a
// narrow viewport the camera dollies backwards along its own view axis until
// that width fits. `maxBack` keeps it from reversing through the wall behind.
//
// Desktop is untouched: at 16/10 or wider every station already frames its
// content, the required pull-back computes to zero, and the returned position
// is the authored one.
function framedPos(station, aspect) {
  const need = station.frame
  if (!need || !aspect || aspect >= REF_ASPECT) return station.pos

  const [px, py, pz] = station.pos
  const [lx, ly, lz] = station.look || [px, py, pz - 1]

  // horizontal half-angle actually available, after applyFov's widening
  const vFov = THREE.MathUtils.degToRad(
    THREE.MathUtils.clamp(widenedFov(station.fov, aspect), FOV_MIN, FOV_MAX)
  )
  const hHalf = Math.atan(Math.tan(vFov / 2) * aspect)
  if (hHalf <= 0.001) return station.pos

  const wantDist = need / 2 / Math.tan(hHalf)

  // current distance to the thing being framed, measured along the view axis
  const dx = lx - px
  const dy = ly - py
  const dz = lz - pz
  const len = Math.hypot(dx, dy, dz)
  if (len < 0.001) return station.pos
  const back = wantDist - len
  if (back <= 0.01) return station.pos

  const pull = Math.min(back, station.maxBack ?? 1.3)
  return [px - (dx / len) * pull, py - (dy / len) * pull, pz - (dz / len) * pull]
}

function widenedFov(fov, aspect) {
  if (!aspect || aspect >= REF_ASPECT) return fov
  const widen = Math.min(REF_ASPECT / aspect, MAX_WIDEN)
  return THREE.MathUtils.radToDeg(
    2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * widen)
  )
}

function applyFov(camera, fov) {
  const v = THREE.MathUtils.clamp(
    widenedFov(fov, camera.aspect || REF_ASPECT), FOV_MIN, FOV_MAX
  )
  if (Math.abs(camera.fov - v) < 0.001) return
  camera.fov = v
  camera.updateProjectionMatrix()
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}
