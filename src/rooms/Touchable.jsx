import React, { useEffect, useMemo, useRef, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { wasDrag, isPointerLocked } from '../pointer.js'
import { walkPos } from './colliders.js'
import { playOneShot } from './audio/engine.js'

// Wave T: the shared "you can put your hands on this" wrapper. Every
// template touch kind (touchKinds.jsx) and every bespoke room's own hand-
// built interaction sits inside one of these — it owns the parts that are
// identical everywhere: the reach gate, the diegetic hover glint, the press
// dip, and firing the foley. What happens ON activation (`onUse`) is the
// caller's problem entirely.

const WHITE = new THREE.Color('#ffffff')
const HOVER_LIFT = 0.08     // per spec: up to 8% toward white
const HOVER_REACH_MUL = 1.5 // glint arms within reach*1.5, click still gates at `reach`
const DIP_DOWN_MS = 80
const DIP_UP_MS = 160
const DIP_SCALE = 0.97

export default function Touchable({
  onUse,
  reach = 2.4,
  foley,
  disabled = false,
  noDip = false,
  anchor = [0, 0, 0], // local point (same frame as `children`) used for the distance gate
  children,
}) {
  const group = useRef(null)
  const { camera, raycaster, gl } = useThree()

  // ---- reach ---------------------------------------------------------
  const anchorVec = useMemo(() => new THREE.Vector3(), [])
  const distanceToPlayer = useCallback(() => {
    const g = group.current
    if (!g) return Infinity
    g.updateWorldMatrix(true, false)
    anchorVec.set(anchor[0] ?? 0, anchor[1] ?? 0, anchor[2] ?? 0)
    g.localToWorld(anchorVec)
    const p = walkPos()
    return Math.hypot(anchorVec.x - p.x, anchorVec.z - p.z)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor[0], anchor[1], anchor[2]])

  // ---- hover glint (clone-on-first-hover) -----------------------------
  const meshEntries = useRef([])     // [{mesh, original, clone, base}]
  const hovered = useRef(false)
  const hoverT = useRef(0)
  const everHovered = useRef(false)

  useEffect(() => {
    const g = group.current
    if (!g) return undefined
    const list = []
    g.traverse((obj) => {
      if (obj.isMesh && obj.material && obj.material.color) list.push({ mesh: obj, cloned: false })
    })
    meshEntries.current = list
    return () => {
      // dispose any clones this instance made, restore the original material
      // reference so nothing keeps a dangling clone alive after unmount.
      meshEntries.current.forEach((entry) => {
        if (entry.cloned && entry.clone) {
          entry.mesh.material = entry.original
          entry.clone.dispose()
        }
      })
      meshEntries.current = []
    }
  }, [children])

  const ensureClone = (entry) => {
    if (entry.cloned) return entry.clone
    const original = entry.mesh.material
    if (!original || !original.color) return null
    const clone = original.clone()
    entry.original = original
    entry.clone = clone
    entry.base = original.color.clone()
    entry.cloned = true
    entry.mesh.material = clone
    return clone
  }

  const setHover = (on) => { hovered.current = on }

  // ---- press dip -------------------------------------------------------
  const dip = useRef({ playing: false, t0: 0 })
  const triggerDip = () => {
    if (noDip) return
    dip.current = { playing: true, t0: performance.now() }
  }

  useFrame((_, dt) => {
    const canHover = !disabled && withinReach(distanceToPlayer(), reach * HOVER_REACH_MUL)
    const wantHover = hovered.current && canHover
    hoverT.current = THREE.MathUtils.damp(hoverT.current, wantHover ? 1 : 0, 8, dt)

    if (hoverT.current > 0.0008 || everHovered.current) {
      everHovered.current = true
      meshEntries.current.forEach((entry) => {
        const clone = ensureClone(entry)
        if (!clone) return
        clone.color.copy(entry.base).lerp(WHITE, hoverT.current * HOVER_LIFT)
      })
    }

    // scale dip
    if (group.current) {
      let s = 1
      if (dip.current.playing) {
        const t = performance.now() - dip.current.t0
        if (t <= DIP_DOWN_MS) {
          s = THREE.MathUtils.lerp(1, DIP_SCALE, t / DIP_DOWN_MS)
        } else if (t <= DIP_DOWN_MS + DIP_UP_MS) {
          s = THREE.MathUtils.lerp(DIP_SCALE, 1, (t - DIP_DOWN_MS) / DIP_UP_MS)
        } else {
          s = 1
          dip.current.playing = false
        }
      }
      group.current.scale.setScalar(s)
    }

    // pointer-lock sharp edge: R3F's own hover raycast only re-fires on a
    // native pointermove event, which under lock IS mouse movement (how you
    // look around) — but walking a new object into the crosshair with no
    // mouse motion at all (pure WASD) would otherwise never re-evaluate
    // hover. A per-frame raycast against just THIS group's own meshes is
    // cheap (a handful of touchables exist per room, never scene-wide) and
    // keeps hover honest while locked without duplicating R3F's own click
    // routing (that still goes through CameraRig's centerCompute override).
    if (isPointerLocked() && group.current && !disabled) {
      raycaster.setFromCamera({ x: 0, y: 0 }, camera)
      const hits = raycaster.intersectObject(group.current, true)
      setHover(hits.length > 0)
    }

    if (hovered.current) {
      gl.domElement.style.cursor = canHover ? 'pointer' : 'default'
    }
  })

  const handleClick = (e) => {
    e.stopPropagation()
    if (disabled) return
    if (wasDrag()) return
    if (distanceToPlayer() > reach) return // too far — no UI, distance is the teacher
    triggerDip()
    if (foley) playOneShot(foley)
    onUse && onUse(e)
  }

  const handleOver = (e) => {
    e.stopPropagation()
    if (disabled) return
    setHover(true)
  }
  const handleOut = (e) => {
    e && e.stopPropagation && e.stopPropagation()
    setHover(false)
    gl.domElement.style.cursor = 'grab'
  }

  return (
    <group
      ref={group}
      onClick={handleClick}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
    >
      {children}
    </group>
  )
}

function withinReach(dist, reach) {
  return dist <= reach
}
