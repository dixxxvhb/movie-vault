import React, { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// The kit's person. Was two capsules and a ball (props.jsx abstractFigure);
// now a jointed body (pelvis, spine, chest, neck, head, two-bone arms and
// legs, hands, feet) posed by joint angles, so a figure can sit IN a chair,
// lie on a floor, aim, kneel or fly instead of a capsule squashed or tipped
// over to suggest it. Still a silhouette by default: one cloth colour, the
// head the same unless `skin` is given. No textures.
//
// Frame: the figure faces +Z, origin on the floor under the hips (for 'lie'
// and 'dive' the origin is the hips themselves; see POSES). Limbs hang along
// -Y from their joint; a negative X rotation swings a limb forward (+Z).
//
// Proportions are a 1.75 m adult at scale 1. A child is scale ~0.7.

const H = {
  hip: 0.87, thigh: 0.44, shin: 0.43, torso: 0.54, neck: 0.07, head: 0.105,
  upper: 0.29, fore: 0.26, shoulder: 0.175, hipW: 0.095,
}

// Joint angles per pose. root: [y of hips, pitch of the whole body].
// sp: spine pitch (+ = lean forward). nk: neck pitch. Arms [x, z] at the
// shoulder plus the elbow bend; legs [x, z] at the hip plus the knee bend.
const POSES = {
  stand: { root: [H.hip, 0], sp: 0.02, nk: 0.04, la: [0.04, 0.09], le: -0.12, ra: [0.02, -0.09], re: -0.1, ll: [0, 0.03], lk: 0.02, rl: [0, -0.03], rk: 0.02 },
  'walk-cycle-frozen': { root: [H.hip - 0.02, 0], sp: 0.06, nk: 0.02, la: [0.42, 0.07], le: -0.2, ra: [-0.38, -0.07], re: -0.45, ll: [-0.38, 0.02], lk: 0.12, rl: [0.3, -0.02], rk: 0.5 },
  walk: null, // alias, filled below
  sit: { root: [0.5, 0], sp: -0.06, nk: 0.08, la: [-0.35, 0.12], le: -0.95, ra: [-0.3, -0.12], re: -1.0, ll: [-1.5, 0.08], lk: 1.5, rl: [-1.5, -0.06], rk: 1.45 },
  // haunches, forearms on the knees
  crouch: { root: [0.32, 0], sp: 0.55, nk: -0.45, la: [-0.6, 0.15], le: -0.7, ra: [-0.55, -0.15], re: -0.8, ll: [-2.05, 0.22], lk: 2.35, rl: [-2.0, -0.22], rk: 2.35 },
  kneel: { root: [0.49, 0], sp: 0.08, nk: 0.12, la: [-0.2, 0.1], le: -0.5, ra: [-0.1, -0.1], re: -0.4, ll: [-1.5, 0.08], lk: 1.55, rl: [0.1, -0.06], rk: 1.62 },
  // both arms out level, hands together: a weapon held on something
  aim: { root: [H.hip, 0], sp: 0.04, nk: 0.06, la: [-1.48, -0.28], le: -0.08, ra: [-1.5, 0.22], re: -0.08, ll: [0.18, 0.06], lk: 0.06, rl: [-0.2, -0.06], rk: 0.12 },
  // on the back on the floor, head toward -Z, origin at the hips
  lie: { root: [0.11, -Math.PI / 2], sp: 0, nk: -0.1, la: [0.15, 0.32], le: -0.4, ra: [0.06, -0.45], re: -0.1, ll: [0, 0.1], lk: 0.12, rl: [0.08, -0.14], rk: 0.05 },
  // airborne and flat out, face down, arms forward (the two-gun leap)
  dive: { root: [0, 1.42], sp: -0.15, nk: -0.85, la: [-2.9, 0.22], le: 0, ra: [-2.9, -0.22], re: 0, ll: [0.25, 0.12], lk: 0.55, rl: [0.05, -0.1], rk: 0.15 },
  // a person turned in on themselves, arms crossed
  hold: { root: [H.hip, 0], sp: 0.1, nk: 0.25, la: [-0.55, 0.25], le: -1.9, ra: [-0.5, -0.25], re: -1.95, ll: [0, 0.04], lk: 0.02, rl: [0, -0.04], rk: 0.02 },
  // sitting on the ground, knees up, arms round them (a queue that has
  // stopped expecting to move)
  huddle: { root: [0.13, 0], sp: 0.42, nk: 0.3, la: [-0.95, 0.12], le: -0.75, ra: [-0.95, -0.12], re: -0.75, ll: [-2.3, 0.12], lk: 2.45, rl: [-2.25, -0.1], rk: 2.4 },
  // one arm up, the other at the side (the thumb, the wave, the hand raised)
  raise: { root: [H.hip, 0], sp: 0, nk: -0.1, la: [0.04, 0.12], le: -0.1, ra: [-0.3, -2.75], re: -0.15, ll: [0, 0.04], lk: 0.02, rl: [0, -0.04], rk: 0.02 },
}
POSES.walk = POSES['walk-cycle-frozen']
// a long coat hangs only where the legs hang
const COATED = new Set(['stand', 'walk', 'walk-cycle-frozen', 'aim', 'hold', 'raise'])

// Materials are per figure, not shared: PeripheralFigure fades its figure by
// writing opacity into every material under it, and Touchable clones and
// tints what it wraps. A shared cache would fade or tint every figure of
// that colour in the room.
function clothMat(color, emissive) {
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.92, metalness: 0,
    emissive: emissive || '#000000', emissiveIntensity: emissive ? 0.3 : 0,
  })
}

// Shared geometry, built once: every figure in every room draws from these.
const GEO = {}
function geo() {
  if (GEO.ready) return GEO
  // Limbs overlap their joints (capsules run past each pivot, a ball sits on
  // every knee, elbow and shoulder) so a bent pose never opens a seam.
  GEO.thigh = new THREE.CapsuleGeometry(0.082, H.thigh - 0.1, 5, 12).translate(0, -H.thigh / 2 + 0.01, 0).scale(1, 1, 1.06)
  GEO.shin = new THREE.CapsuleGeometry(0.062, H.shin - 0.06, 5, 12).translate(0, -H.shin / 2, 0)
  GEO.knee = new THREE.SphereGeometry(0.068, 10, 8)
  GEO.upper = new THREE.CapsuleGeometry(0.058, H.upper - 0.06, 5, 10).translate(0, -H.upper / 2 + 0.01, 0)
  GEO.fore = new THREE.CapsuleGeometry(0.047, H.fore - 0.06, 5, 10).translate(0, -H.fore / 2, 0)
  GEO.elbow = new THREE.SphereGeometry(0.05, 10, 8)
  GEO.shoulderBall = new THREE.SphereGeometry(0.058, 12, 10)
  GEO.hand = new THREE.SphereGeometry(0.045, 10, 8).scale(0.78, 1.25, 0.55)
  // a shoe: a capsule on its side, toe forward, heel under the ankle
  GEO.foot = new THREE.CapsuleGeometry(0.045, 0.15, 4, 10).rotateX(Math.PI / 2).scale(1.05, 0.8, 1).translate(0, -0.012, 0.055)
  // torso: one tapered body, shoulders to waist, no seam between chest and belly
  const torsoProfile = [
    [0.0, 0.0], [0.122, 0.0], [0.13, 0.08], [0.122, 0.2], [0.14, 0.33], [0.162, 0.43], [0.155, 0.49], [0.11, 0.54], [0.0, 0.555],
  ].map(([r, y]) => new THREE.Vector2(r, y * (H.torso / 0.54)))
  GEO.torso = new THREE.LatheGeometry(torsoProfile, 20).scale(1.12, 1, 0.66)
  GEO.pelvis = new THREE.SphereGeometry(0.135, 16, 10).scale(1.1, 0.72, 0.74).translate(0, 0.01, 0)
  GEO.neck = new THREE.CylinderGeometry(0.046, 0.056, H.neck + 0.06, 10)
  GEO.head = new THREE.SphereGeometry(H.head, 18, 16).scale(0.84, 1.04, 0.98)
  GEO.jaw = new THREE.SphereGeometry(0.068, 12, 10).scale(1, 0.85, 1)
  GEO.nose = new THREE.ConeGeometry(0.016, 0.04, 6).rotateX(Math.PI / 2 + 0.3)
  // the hair: a cap of the skull, tipped back so the face stays clear
  GEO.hair = new THREE.SphereGeometry(H.head * 1.04, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.56).scale(0.88, 1.02, 1.02)
  // jacket hem: a short flare from the waist over the hips
  GEO.hem = new THREE.CylinderGeometry(0.128, 0.142, 0.15, 18, 1, true).translate(0, -0.035, 0)
  // shirt collar: a pale wedge at the throat
  GEO.collar = new THREE.ConeGeometry(0.052, 0.13, 3).rotateX(Math.PI).scale(1.1, 1, 0.3)
  // a soldier's tin hat: a shallow dome on a wide flat brim
  GEO.helmet = new THREE.SphereGeometry(0.13, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42).scale(1, 0.7, 1.08)
  GEO.helmetBrim = new THREE.CylinderGeometry(0.19, 0.19, 0.012, 20).scale(1, 1, 1.1)
  // a habit's veil: falls from the crown to the shoulders; the white band
  // that frames the face
  GEO.veil = new THREE.CylinderGeometry(0.115, 0.2, 0.36, 18, 1, true, Math.PI * 0.18, Math.PI * 1.64).translate(0, -0.12, -0.02)
  GEO.veilTop = new THREE.SphereGeometry(0.118, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
  GEO.band = new THREE.TorusGeometry(0.098, 0.016, 6, 20, Math.PI * 1.3).rotateZ(-Math.PI * 0.15)
  GEO.longHair = new THREE.CylinderGeometry(0.1, 0.13, 0.32, 14, 1, true, Math.PI * 0.25, Math.PI * 1.5).translate(0, -0.12, -0.015)
  GEO.robe = new THREE.CylinderGeometry(0.2, 0.32, 0.86, 16, 1, true)
  GEO.coat = new THREE.CylinderGeometry(0.2, 0.27, 0.62, 14, 1, true)
  // a cape: shoulders to calves, open at the front
  GEO.cape = new THREE.CylinderGeometry(0.2, 0.36, 1.18, 18, 1, true, Math.PI * 0.3, Math.PI * 1.4)
  GEO.brim = new THREE.CylinderGeometry(0.17, 0.17, 0.012, 18)
  GEO.crown = new THREE.CylinderGeometry(0.095, 0.105, 0.11, 16)
  GEO.cap = new THREE.SphereGeometry(0.112, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)
  // a cowl: the whole head down past the eyes, two short ears on top
  GEO.cowl = new THREE.SphereGeometry(0.122, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.7).scale(1, 1.08, 1)
  GEO.ear = new THREE.ConeGeometry(0.024, 0.1, 6)
  GEO.gun = new THREE.BoxGeometry(0.03, 0.05, 0.17).translate(0, 0, 0.06)
  GEO.grip = new THREE.BoxGeometry(0.026, 0.09, 0.035).translate(0, -0.03, 0)
  GEO.ready = true
  return GEO
}

const gunMat = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.4, metalness: 0.7 })

function Arm({ side, a, e, mat, skinMat, gun, g }) {
  return (
    <group position={[side * H.shoulder, H.torso - 0.065, 0]} rotation={[a[0], 0, a[1]]}>
      <mesh geometry={g.shoulderBall} material={mat} />
      <mesh geometry={g.upper} material={mat} />
      <group position={[0, -H.upper + 0.02, 0]} rotation={[e, 0, 0]}>
        <mesh geometry={g.elbow} material={mat} />
        <mesh geometry={g.fore} material={mat} />
        <group position={[0, -H.fore - 0.01, 0]}>
          <mesh geometry={g.hand} material={skinMat} />
          {gun && (
            <group position={[0, -0.02, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh geometry={g.gun} material={gunMat} />
              <mesh geometry={g.grip} material={gunMat} />
            </group>
          )}
        </group>
      </group>
    </group>
  )
}

function Leg({ side, l, k, mat, shoeMat, g }) {
  return (
    <group position={[side * H.hipW, 0, 0]} rotation={[l[0], 0, l[1]]}>
      <mesh geometry={g.thigh} material={mat} />
      <group position={[0, -H.thigh + 0.02, 0]} rotation={[k, 0, 0]}>
        <mesh geometry={g.knee} material={mat} />
        <mesh geometry={g.shin} material={mat} />
        {/* the foot stays roughly level with the floor whatever the knee does */}
        <group position={[0, -H.shin + 0.02, 0]} rotation={[-(l[0] + k) * 0.85, 0, 0]}>
          <mesh geometry={g.foot} material={shoeMat} />
        </group>
      </group>
    </group>
  )
}

// `dressed` turns the silhouette into a person: skin on the face, neck and
// hands, hair, trousers a shade under the top, a shirt collar at the throat
// and a jacket hem at the waist. Template rooms get it by default (PROPS in
// props.jsx); the systems and bespoke rooms that want a pure shadow call
// abstractFigure() and stay silhouettes. Any of skin/hair/legs/shirt may be
// named, or set false to leave it out.
const SKIN = '#a07c64'
const HAIR = '#1c1612'

export function Figure({
  pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, color = '#12141a', pose = 'stand',
  emissive, dressed = false, skin, hair, hairStyle = 'short', legs, shirt, shoes, coat = false, hat, hatColor, holding,
  breathe = true, build = 1,
}) {
  const P = POSES[pose] || POSES.stand
  const g = geo()
  const look = useMemo(() => {
    const top = clothMat(color, emissive)
    const pick = (v, dflt) => (v === false ? null : v || (dressed ? dflt : null))
    const skinC = pick(skin, SKIN)
    const hairC = pick(hair, HAIR)
    const legsC = pick(legs, '#' + new THREE.Color(color).multiplyScalar(0.62).getHexString())
    const shirtC = pick(shirt, '#d8d2c4')
    const owned = [top]
    const make = (c) => { const m = clothMat(c); owned.push(m); return m }
    return {
      top,
      skin: skinC ? make(skinC) : top,
      hair: hairC ? make(hairC) : null,
      legs: legsC ? make(legsC) : top,
      shirt: shirtC ? make(shirtC) : null,
      shoe: make(shoes || '#0c0c0c'),
      hat: hatColor ? make(hatColor) : top,
      white: make('#e8e6e0'),
      owned,
    }
  }, [color, emissive, dressed, skin, hair, legs, shirt, shoes, hatColor])
  useEffect(() => () => look.owned.forEach((m) => m.dispose()), [look])
  const chestRef = useRef()
  const headRef = useRef()
  // Stagger so a queue of figures never breathes in step.
  const phase = useMemo(() => (Math.abs(pos[0] * 7.3 + pos[2] * 3.1) % 6.28), [pos])
  useFrame(({ clock }) => {
    if (!breathe || !chestRef.current) return
    const t = clock.elapsedTime * 1.3 + phase
    chestRef.current.scale.set(1 + Math.sin(t) * 0.012, 1, 1 + Math.sin(t) * 0.02)
    if (headRef.current) headRef.current.rotation.y = Math.sin(t * 0.21) * 0.05
  })
  const s = Array.isArray(scale) ? scale : [scale, scale, scale]
  const gunL = holding === 'guns'
  const gunR = holding === 'gun' || holding === 'guns'
  const hangs = COATED.has(pose)
  return (
    <group position={pos} rotation={rot} scale={s}>
      <group position={[0, P.root[0], 0]} rotation={[P.root[1], 0, 0]} scale={[build, 1, build]}>
        <mesh geometry={g.pelvis} material={look.legs} />
        <Leg side={1} l={P.ll} k={P.lk} mat={look.legs} shoeMat={look.shoe} g={g} />
        <Leg side={-1} l={P.rl} k={P.rk} mat={look.legs} shoeMat={look.shoe} g={g} />
        {coat === 'cape' && hangs && (
          <mesh geometry={g.cape} material={look.top} position={[0, -0.02, -0.03]} scale={[1, 1, 0.7]} />
        )}
        {coat && hangs && coat !== 'robe' && coat !== 'cape' && (
          <mesh geometry={g.coat} material={look.top} position={[0, -0.25, 0]} scale={[1, 1, 0.75]} />
        )}
        {coat === 'robe' && hangs && (
          <mesh geometry={g.robe} material={look.top} position={[0, -0.42, 0]} scale={[1, 1, 0.78]} />
        )}
        <group rotation={[P.sp, 0, 0]}>
          <mesh ref={chestRef} geometry={g.torso} material={look.top} />
          {dressed && !coat && hangs && <mesh geometry={g.hem} material={look.top} position={[0, 0.02, 0]} scale={[1.1, 1, 0.7]} />}
          {look.shirt && <mesh geometry={g.collar} material={look.shirt} position={[0, H.torso - 0.035, 0.068]} rotation={[-0.35, 0, 0]} />}
          <Arm side={1} a={P.la} e={P.le} mat={look.top} skinMat={look.skin} gun={gunL} g={g} />
          <Arm side={-1} a={P.ra} e={P.re} mat={look.top} skinMat={look.skin} gun={gunR} g={g} />
          <group position={[0, H.torso + 0.02, 0]} rotation={[P.nk, 0, 0]}>
            <mesh geometry={g.neck} material={hat === 'cowl' ? look.hat : look.skin} position={[0, H.neck / 2, 0]} />
            <group ref={headRef} position={[0, H.neck + H.head * 0.95, 0.01]}>
              <mesh geometry={g.head} material={look.skin} />
              <mesh geometry={g.jaw} material={look.skin} position={[0, -0.05, 0.028]} />
              <mesh geometry={g.nose} material={look.skin} position={[0, -0.01, H.head * 0.9]} />
              {look.hair && !hat && <mesh geometry={g.hair} material={look.hair} position={[0, 0.012, -0.012]} rotation={[-0.62, 0, 0]} />}
              {hat === 'fedora' && (
                <group position={[0, 0.075, 0]}>
                  <mesh geometry={g.brim} material={look.top} />
                  <mesh geometry={g.crown} material={look.top} position={[0, 0.055, 0]} />
                </group>
              )}
              {hat === 'cowl' && (
                <group>
                  <mesh geometry={g.cowl} material={look.hat} position={[0, 0.004, -0.004]} />
                  <mesh geometry={g.ear} material={look.hat} position={[-0.058, 0.14, -0.01]} rotation={[0, 0, 0.1]} />
                  <mesh geometry={g.ear} material={look.hat} position={[0.058, 0.14, -0.01]} rotation={[0, 0, -0.1]} />
                </group>
              )}
              {hat === 'cap' && <mesh geometry={g.cap} material={look.hair || look.top} position={[0, 0.02, -0.005]} />}
              {hat === 'helmet' && (
                <group position={[0, 0.045, 0]} rotation={[-0.08, 0, 0]}>
                  <mesh geometry={g.helmet} material={look.hat} />
                  <mesh geometry={g.helmetBrim} material={look.hat} />
                </group>
              )}
              {hat === 'veil' && (
                <group>
                  <mesh geometry={g.veilTop} material={look.top} position={[0, 0.012, -0.008]} />
                  <mesh geometry={g.veil} material={look.top} position={[0, 0.02, 0]} />
                  <mesh geometry={g.band} material={look.white} position={[0, 0.0, 0.03]} rotation={[0, 0, 0]} />
                </group>
              )}
              {hairStyle === 'long' && look.hair && !hat && <mesh geometry={g.longHair} material={look.hair} />}
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

export const FIGURE_POSES = Object.keys(POSES)
