import React, { useEffect, useRef } from 'react'

// The layered lighting rig (Wave P0, IMMERSION-V2-POLISH-SPEC.md #3).
// Plain .js (no JSX, React.createElement instead) — this is a helper that
// ASSEMBLES a rig from a config block, not a room; GenericRoom.jsx (or a
// bespoke room) renders <LightRig lights={config.lights} /> directly.
//
// Doctrine (the spec's own words): one KEY (the scene's motivated source),
// PRACTICALS at visible fixtures (warm, decay 2), one or two colored BOUNCE
// fills, an optional RIM for silhouette. Darks stay dark — this file never
// adds an ambient light of its own; that's still GenericRoom's/FilmWorld's
// job so a config without `lights` is completely unaffected.
//
// Intensity scale: authored small (roughly 0.1-2.5, "how bright does this
// feel" units) and multiplied up per role here — the same physically-based-
// lighting correction GenericRoom's own fixed key/fill and props.jsx's
// lampPractical already apply (see GenericRoom.jsx's long comment on why).
// A config author only ever tunes the one small number. Tuned empirically
// against darkknight (the P0 proof room): a room lit ONLY by a spec-literal
// key/fill read as a near-void outside the beam — practicals/bounce/rim
// need enough reach to actually paint the walls, not just imply them.
const SCALE = { key: 22, practicals: 16, bounce: 9, rim: 12 }

// Shadows: Canvas gains `shadows` (App.jsx) but almost every light in the
// game stays castShadow=false — motel byte-identical is the hard rule. This
// rig's `key` is the ONE light in the whole toolkit allowed to opt in
// (`config.lights.key.castShadow`), and it gets a single 512 map, never
// bigger (spec #6: "One shadow map max").
function shadowProps(spec) {
  if (!spec.castShadow) return {}
  const size = spec.shadowMapSize ?? 512
  return {
    castShadow: true,
    'shadow-mapSize-width': size,
    'shadow-mapSize-height': size,
    'shadow-bias': spec.shadowBias ?? -0.0018,
    'shadow-camera-near': spec.shadowNear ?? 0.3,
    'shadow-camera-far': spec.shadowFar ?? 12,
  }
}

// A spot light with a REAL aimed target — three.js's SpotLight.target only
// updates its world matrix while it is part of the scene graph, so a bare
// `target-position` dash-prop (a common half-working shortcut) silently
// freezes at the origin. This renders the target as an actual scene child
// and wires `light.target` to it once both exist.
function SpotWithTarget({ spec, role, i, refFn, scale = 1 }) {
  const lightRef = useRef()
  const targetRef = useRef()
  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current
    }
  }, [])
  const intensity = (spec.intensity ?? 1) * (SCALE[role] ?? 8) * scale
  return React.createElement(React.Fragment, { key: role + i },
    React.createElement('spotLight', {
      // `refFn`, when present, is a ref OBJECT (GenericRoom's keyLightRef —
      // see LightRig's own `keyRef` prop), not a callback — assign
      // `.current` on both directly rather than invoking it as a function.
      ref: (n) => { lightRef.current = n; if (refFn) refFn.current = n },
      position: spec.pos || [0, 1.6, 0],
      color: spec.color || '#ffffff',
      intensity,
      distance: spec.distance ?? 8,
      decay: spec.decay ?? 2,
      angle: spec.angle ?? 0.5,
      penumbra: spec.penumbra ?? 0.4,
      ...shadowProps(spec),
    }),
    React.createElement('object3D', { ref: targetRef, position: spec.target || [0, 0, 0] })
  )
}

function pointOrSpot(spec, role, i, refFn, scale = 1) {
  if (spec.type === 'spot') {
    return React.createElement(SpotWithTarget, { key: role + i, spec, role, i, refFn, scale })
  }
  const intensity = (spec.intensity ?? 1) * (SCALE[role] ?? 8) * scale
  if (spec.type === 'directional') {
    return React.createElement('directionalLight', {
      key: role + i,
      ref: refFn,
      position: spec.pos || [0, 4, 0],
      color: spec.color || '#ffffff',
      intensity: intensity / 6,
      ...shadowProps(spec),
    })
  }
  return React.createElement('pointLight', {
    key: role + i,
    ref: refFn,
    position: spec.pos || [0, 1.6, 0],
    color: spec.color || '#ffffff',
    intensity,
    distance: spec.distance ?? 8,
    decay: spec.decay ?? 2,
    ...shadowProps(spec),
  })
}

// LightRig({lights, keyRef, scale}) -> a <group> of lights, or null if the
// config carries no `lights` block at all.
//
// Wave P2 (template engine lift): `scale` is GenericRoom's own
// grade.keyIntensity-derived multiplier, applied uniformly across every
// role in the rig (matching the old fixed-fallback pair's own behavior,
// which multiplied both its lights by the same grade.keyIntensity). Several
// rooms (tdkr, moon, oblivion, sunshine, batman...) tuned keyIntensity WAY
// down to compensate for near-white materials or a camera sitting right
// next to the fixed key — that tuning now flows into the preset-supplied
// rig too, instead of being silently ignored the moment a preset's `lights`
// block replaced the old fallback (QA sweep: moon/oblivion/tdkr/sunshine/
// hereditary all blew out or went void once presets.js started supplying
// its own rig, because their grade.keyIntensity had nothing left to scale).
export default function LightRig({ lights, keyRef, scale = 1 }) {
  if (!lights) return null
  const children = []
  if (lights.key) children.push(pointOrSpot(lights.key, 'key', 0, keyRef, scale))
  ;(lights.practicals || []).forEach((p, i) => children.push(pointOrSpot(p, 'practicals', i, undefined, scale)))
  ;(lights.bounce || []).forEach((b, i) => children.push(pointOrSpot(b, 'bounce', i, undefined, scale)))
  if (lights.rim) children.push(pointOrSpot(lights.rim, 'rim', 0, undefined, scale))
  return React.createElement('group', null, ...children)
}

export { SCALE as LIGHT_SCALE }
