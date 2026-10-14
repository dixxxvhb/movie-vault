import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { inArea, EYE, OFFICE_TAG } from './scenes.js'
import { radialTexture, frame } from './geo.js'
import { useCourt, getCourt, setCourt, courtScene, ensureFonts } from './courtStore.js'
import { stick } from './stick.js'
import { wasDrag } from '../pointer.js'

// The Court (NO VACANCY plan, Phase 5): the building outside the rooms. A U
// of stucco around a lit pool, one floor per whole point of score, the two
// tens in a penthouse on the roof, the office (Room 4, the wall) out front.
// Everything is placed from the ledger by building/layout.js.
//
// Owns its own camera the way MotelWorld and FilmWorld each mount their own
// CameraRig: an overview orbit for the arrival, then a first-person walk.

const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

function Layers({ scene, onDoor, onOffice }) {
  const radial = useMemo(() => radialTexture(), [])
  const built = useMemo(() => {
    const L = scene.layers
    const g = {
      arch: L.arch.geometry(), doors: L.doors.geometry(), glow: L.glow.geometry(),
      pools: L.pools.geometry(), words: L.words.geometry(),
    }
    return g
  }, [scene])
  // Geometry is rebuilt per mount; the atlas stays with the cached scene.
  useEffect(() => () => Object.values(built).forEach((g) => g.dispose()), [built])
  useEffect(() => () => radial.dispose(), [radial])

  const click = (e) => {
    e.stopPropagation()
    if (e.delta > 8 || wasDrag()) return
    const tag = scene.layers.doors.tags[e.faceIndex]
    if (tag === OFFICE_TAG) onOffice()
    else if (tag >= 0) onDoor(scene.rooms[tag])
  }

  return (
    <group>
      <mesh geometry={built.arch}>
        <meshStandardMaterial vertexColors roughness={0.93} metalness={0} />
      </mesh>
      <mesh geometry={built.doors} onClick={click}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}>
        <meshStandardMaterial vertexColors roughness={0.55} metalness={0.1} />
      </mesh>
      <mesh geometry={built.glow}>
        <meshBasicMaterial vertexColors toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={built.pools} renderOrder={2}>
        <meshBasicMaterial map={radial} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={built.words} renderOrder={1}>
        <meshBasicMaterial map={scene.layers.atlas.texture} transparent color="#d9d1c2" toneMapped={false} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
    </group>
  )
}

function Sky() {
  const geo = useMemo(() => {
    const n = 900
    const p = new Float32Array(n * 3)
    let s = 7
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2
      const e = 0.08 + Math.pow(rnd(), 0.7) * 1.4
      p[i * 3] = Math.cos(a) * Math.cos(e) * 400
      p[i * 3 + 1] = Math.sin(e) * 400
      p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 400
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    return g
  }, [])
  return (
    <group>
      <points geometry={geo}>
        <pointsMaterial color="#cfd8f0" size={1.4} sizeAttenuation={false} fog={false} toneMapped={false} />
      </points>
      <mesh position={[-160, 210, -260]}>
        <circleGeometry args={[9, 32]} />
        <meshBasicMaterial color="#e9eefc" fog={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ------------------------------------------------------------ the camera

function Rig({ scene }) {
  const mode = useCourt((s) => s.mode)
  const level = useCourt((s) => s.level)
  const warp = useCourt((s) => s.warp)
  const { camera, gl, size } = useThree()
  const st = useRef({ x: 0, z: 0, yaw: 0, pitch: 0, ov: getCourt().orbit, ovDir: 1, ovHold: 0 })
  const keys = useRef(new Set())
  const lastNear = useRef(null)
  const nearClock = useRef(0)

  // Cut (never fly) to wherever the app asks: a spawn, a landing, a door.
  useEffect(() => {
    if (!warp) return
    const s = st.current
    s.x = warp.x
    s.z = warp.z
    s.yaw = warp.yaw
    s.pitch = warp.pitch ?? -0.04
  }, [warp])

  // The far plane belongs to whoever owns the camera; the motel's is 60m and
  // the Court is two hundred across. Put it back on the way out.
  useEffect(() => {
    const far = camera.far
    camera.far = 900
    camera.updateProjectionMatrix()
    return () => {
      setCourt({ orbit: st.current.ov })
      camera.far = far
      camera.updateProjectionMatrix()
    }
  }, [camera])

  useEffect(() => {
    const down = (e) => { keys.current.add(e.code) }
    const up = (e) => { keys.current.delete(e.code) }
    const blur = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  // drag to look (walk) or to scrub (overview)
  useEffect(() => {
    const el = gl.domElement
    let drag = null
    const pd = (e) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY } }
    const pm = (e) => {
      if (!drag || drag.id !== e.pointerId) return
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      drag.x = e.clientX
      drag.y = e.clientY
      const s = st.current
      if (mode === 'walk') {
        s.yaw += dx * 0.0042
        s.pitch = Math.max(-1.1, Math.min(1.1, s.pitch + dy * 0.0036))
      } else {
        s.ovHold = 5
        s.ov = Math.max(-1.2, Math.min(1.2, s.ov + dx * 0.004))
      }
    }
    const pu = (e) => { if (drag && drag.id === e.pointerId) drag = null }
    el.addEventListener('pointerdown', pd)
    window.addEventListener('pointermove', pm)
    window.addEventListener('pointerup', pu)
    window.addEventListener('pointercancel', pu)
    return () => {
      el.removeEventListener('pointerdown', pd)
      window.removeEventListener('pointermove', pm)
      window.removeEventListener('pointerup', pu)
      window.removeEventListener('pointercancel', pu)
    }
  }, [gl, mode, scene])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = st.current
    const ov = scene.overview
    camera.fov = coarse && size.width < size.height ? 62 : 52
    camera.updateProjectionMatrix()

    if (mode === 'overview') {
      if (s.ovHold > 0) s.ovHold -= dt
      if (s.ovHold <= 0) {
        s.ov += s.ovDir * dt * 0.05
        if (s.ov > 0.75) s.ovDir = -1
        if (s.ov < -0.75) s.ovDir = 1
      }
      const vf = THREE.MathUtils.degToRad(camera.fov) / 2
      const hf = Math.atan(Math.tan(vf) * camera.aspect)
      const w = camera.aspect < 1 ? ov.width * 0.62 : ov.width
      const R = Math.max((w / 2) / Math.tan(hf), 17 / Math.tan(vf)) * 1.08
      const a = s.ov
      const t = ov.target
      camera.position.set(t[0] + Math.sin(a) * Math.cos(ov.elev) * R, t[1] + Math.sin(ov.elev) * R, t[2] + Math.cos(a) * Math.cos(ov.elev) * R)
      camera.lookAt(t[0], t[1], t[2])
      return
    }

    // walk
    const k = keys.current
    let fwd = stick.z
    let side = stick.x
    if (k.has('KeyW') || k.has('ArrowUp')) fwd += 1
    if (k.has('KeyS') || k.has('ArrowDown')) fwd -= 1
    if (k.has('KeyD')) side += 1
    if (k.has('KeyA')) side -= 1
    if (k.has('ArrowLeft')) s.yaw += dt * 1.8
    if (k.has('ArrowRight')) s.yaw -= dt * 1.8
    const len = Math.hypot(fwd, side)
    if (len > 1) { fwd /= len; side /= len }
    const speed = (k.has('ShiftLeft') || k.has('ShiftRight')) ? 7.5 : 3.6
    const fx = -Math.sin(s.yaw)
    const fz = -Math.cos(s.yaw)
    const rx = Math.cos(s.yaw)
    const rz = -Math.sin(s.yaw)
    const dx = (fx * fwd + rx * side) * speed * dt
    const dz = (fz * fwd + rz * side) * speed * dt
    const area = scene.levels[level].area
    if (inArea(area, s.x + dx, s.z)) s.x += dx
    if (inArea(area, s.x, s.z + dz)) s.z += dz
    const y = scene.levels[level].y + EYE
    camera.position.set(s.x, y, s.z)
    camera.rotation.set(0, 0, 0)
    camera.rotation.order = 'YXZ'
    camera.rotation.y = s.yaw
    camera.rotation.x = -s.pitch

    // the nearest door you are standing in front of
    nearClock.current -= dt
    if (nearClock.current <= 0) {
      nearClock.current = 0.15
      let best = null
      let bd = 3.2
      for (const rm of scene.rooms) {
        if (rm.floor !== level) continue
        const { f } = frame(rm.rotY)
        const px = rm.x + f[0] * 0.9
        const pz = rm.z + f[2] * 0.9
        const d = Math.hypot(px - s.x, pz - s.z)
        if (d < bd) { bd = d; best = rm }
      }
      if (best !== lastNear.current) { lastNear.current = best; setCourt({ near: best }) }
    }
  })
  return null
}

// ------------------------------------------------------------ DOM bits

export default function CourtWorld({ films, onOffice }) {
  const ready = useCourt((s) => s.ready)
  useEffect(() => { ensureFonts() }, [])
  const scene = ready ? courtScene(films) : null
  if (!scene) return null
  return (
    <group>
      <fogExp2 attach="fog" args={['#0a1020', scene.fog]} />
      <hemisphereLight args={['#5d74a6', '#1c140c', 0.85]} />
      <directionalLight position={[-30, 50, 40]} intensity={0.55} color="#a9bfe6" />
      <pointLight position={[0, 0.6, -2]} color="#3fc6d8" intensity={40} distance={26} decay={1.6} />
      <Sky />
      <Layers scene={scene} onDoor={(rm) => setCourt({ selected: rm })} onOffice={onOffice} />
      <Rig scene={scene} />
    </group>
  )
}
