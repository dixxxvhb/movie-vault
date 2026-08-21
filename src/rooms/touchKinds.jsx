import React, { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { publishWalkEvent } from './walkBus.js'

// Wave T: the six physical-response animations `place.props[i].touch.kind`
// maps to. Every one of these wraps its `children` (the normal <Prop>) in a
// plain <group> and only ever touches that group's own position/rotation/
// scale — never material state (Touchable's hover glint owns that layer) —
// so a kind component and Touchable can sit on the same subtree without
// fighting over what they're allowed to animate.
//
// All of them are driven by `token`, a number that increments once per
// successful touch (GenericRoom's TouchedProp owns that counter). A kind
// component reacts to TOKEN CHANGING, never its value — comparing against a
// ref of the previous token is the whole trigger.

function useFiredAt(token) {
  const at = useRef(0)
  const prev = useRef(token)
  useEffect(() => {
    if (token !== prev.current) {
      prev.current = token
      at.current = performance.now()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])
  return at
}

// bottles, chairs, small objects: a rotational spring that wobbles out and
// decays over ~1.2s.
export function NudgeKind({ token, amplitude = 0.2, axis = 'z', children }) {
  const group = useRef(null)
  const firedAt = useFiredAt(token)
  useFrame(() => {
    const g = group.current
    if (!g) return
    const dt = firedAt.current ? (performance.now() - firedAt.current) / 1000 : Infinity
    if (dt < 1.2) {
      const decay = Math.exp(-dt * 4.2)
      const wobble = Math.sin(dt * 14) * amplitude * decay
      g.rotation.set(0, 0, 0)
      g.rotation[axis] = wobble
    } else if (g.rotation.x !== 0 || g.rotation.y !== 0 || g.rotation.z !== 0) {
      g.rotation.set(0, 0, 0)
    }
  })
  return <group ref={group}>{children}</group>
}

// hanging things (branchTags-style): a slower pendulum impulse, longer decay.
export function SwingKind({ token, amplitude = 0.32, axis = 'x', children }) {
  const group = useRef(null)
  const firedAt = useFiredAt(token)
  useFrame(() => {
    const g = group.current
    if (!g) return
    const dt = firedAt.current ? (performance.now() - firedAt.current) / 1000 : Infinity
    if (dt < 2.0) {
      const decay = Math.exp(-dt * 2.4)
      const swing = Math.sin(dt * 6.5) * amplitude * decay
      g.rotation.set(0, 0, 0)
      g.rotation[axis] = swing
    } else if (g.rotation.x !== 0 || g.rotation.y !== 0 || g.rotation.z !== 0) {
      g.rotation.set(0, 0, 0)
    }
  })
  return <group ref={group}>{children}</group>
}

// depresses 2-4cm and returns; optionally fires a named walkBus event once
// per activation (a room/system can listen for it — wiring that listener up
// is a per-room concern, not this component's).
export function PressKind({ token, depress = 0.03, axis = 'y', event, children }) {
  const group = useRef(null)
  const firedAt = useFiredAt(token)
  const prevToken = useRef(token)
  useEffect(() => {
    if (event && token !== prevToken.current) {
      prevToken.current = token
      publishWalkEvent({ type: event })
    } else {
      prevToken.current = token
    }
  }, [token, event])
  useFrame(() => {
    const g = group.current
    if (!g) return
    const dt = firedAt.current ? (performance.now() - firedAt.current) / 1000 : Infinity
    let offset = 0
    if (dt < 0.28) {
      offset = dt < 0.1 ? -depress * (dt / 0.1) : -depress * (1 - (dt - 0.1) / 0.18)
      offset = THREE.MathUtils.clamp(offset, -depress, 0)
    }
    g.position.set(0, 0, 0)
    g.position[axis] = offset
  })
  return <group ref={group}>{children}</group>
}

// slides or hinges a child open/closed; each touch toggles the state.
// `hingeAxis` (Wave T bespoke reuse: Memento's note flip, Sicario's page
// flip) lets hinge mode spin on Y instead of the drawer/door default X —
// same toggle-and-damp shape, just a different rotation axis.
export function OpenKind({ token, mode = 'slide', distance = 0.3, angle = Math.PI / 2, axis = 'z', hingeAxis = 'x', children }) {
  const group = useRef(null)
  const openState = useRef(false)
  const t = useRef(0)
  const prevToken = useRef(token)
  useEffect(() => {
    if (token !== prevToken.current) {
      prevToken.current = token
      openState.current = !openState.current
    }
  }, [token])
  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const target = openState.current ? 1 : 0
    t.current = THREE.MathUtils.damp(t.current, target, 6, dt)
    if (mode === 'hinge') {
      g.rotation.set(0, 0, 0)
      g.rotation[hingeAxis] = -angle * t.current
    } else {
      g.position.set(0, 0, 0)
      g.position[axis] = distance * t.current
    }
  })
  return <group ref={group}>{children}</group>
}

// spins up on touch, decays back to rest — coins, trays, tokens.
export function SpinKind({ token, axis = 'y', maxSpeed = 14, decay = 2.4, children }) {
  const group = useRef(null)
  const prevToken = useRef(token)
  const spinVel = useRef(0)
  useEffect(() => {
    if (token !== prevToken.current) {
      prevToken.current = token
      spinVel.current = maxSpeed
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, maxSpeed])
  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    spinVel.current *= Math.exp(-decay * dt)
    g.rotation[axis] += spinVel.current * dt
  })
  return <group ref={group}>{children}</group>
}

// toggles a light-bearing prop's emissive meshes + point lights between the
// baseline it was authored at and a dim fraction of it. Generic — it
// traverses whatever it's wrapping rather than assuming lampPractical's own
// geometry, so it works on any prop that happens to carry a light.
export function LightKind({ token, lowFactor = 0.08, children }) {
  const group = useRef(null)
  const openState = useRef(false)
  const t = useRef(1) // 1 = full (authored) brightness, 0 = dimmed
  const prevToken = useRef(token)
  const baseline = useRef(null)

  useEffect(() => {
    const g = group.current
    if (!g) return undefined
    const mats = []
    const lights = []
    g.traverse((obj) => {
      if (obj.isMesh && obj.material && obj.material.emissiveIntensity !== undefined) {
        mats.push({ mesh: obj, base: obj.material.emissiveIntensity })
      }
      if (obj.isLight) lights.push({ light: obj, base: obj.intensity })
    })
    baseline.current = { mats, lights }
    return () => {
      // restore authored brightness so nothing else that reads these
      // materials/lights after unmount sees a dimmed value stuck in place
      if (baseline.current) {
        baseline.current.mats.forEach(({ mesh, base }) => { if (mesh.material) mesh.material.emissiveIntensity = base })
        baseline.current.lights.forEach(({ light, base }) => { light.intensity = base })
      }
    }
  }, [children])

  useEffect(() => {
    if (token !== prevToken.current) {
      prevToken.current = token
      openState.current = !openState.current
    }
  }, [token])

  useFrame((_, dt) => {
    const target = openState.current ? 0 : 1
    t.current = THREE.MathUtils.damp(t.current, target, 8, dt)
    if (!baseline.current) return
    const f = lowFactor + (1 - lowFactor) * t.current
    baseline.current.mats.forEach(({ mesh, base }) => { if (mesh.material) mesh.material.emissiveIntensity = base * f })
    baseline.current.lights.forEach(({ light, base }) => { light.intensity = base * f })
  })

  return <group ref={group}>{children}</group>
}

export const TOUCH_KINDS = {
  nudge: NudgeKind,
  swing: SwingKind,
  press: PressKind,
  open: OpenKind,
  spin: SpinKind,
  light: LightKind,
}

// per-kind default foley (touch.foley overrides this in configs)
export const DEFAULT_TOUCH_FOLEY = {
  nudge: 'tick',
  swing: 'paper',
  press: 'switch',
  open: 'creak',
  spin: 'coinSpin',
  light: 'switch',
}
