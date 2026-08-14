import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ROOM } from './Room.jsx'

// Signage.
//
// Dixon's note: "i'm not even entirely sure what each thing is or does." Fair —
// the room had four jobs on four walls and named none of them, and the only
// explanation anywhere was a row of nav buttons reading "the door", "the
// mirror". You had to already know.
//
// So each region wears its own label, in the room, on the thing it names: a
// strip of tape with a marker title and one plain line saying what it is and
// how many of them there are. They are faint until you turn toward them and
// fade back out once you have walked up close, so they teach the room without
// standing in front of it.

const HD = ROOM.D / 2
const HW = ROOM.W / 2

function tapeTexture(title, sub, { wide = true } = {}) {
  const W = wide ? 1024 : 512
  const H = wide ? 168 : 128
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const x = c.getContext('2d')

  // masking tape: not a rectangle. Torn ends and an uneven edge are the whole
  // difference between "a label" and "a UI chip stuck on a wall".
  x.fillStyle = 'rgba(226,214,186,0.90)'
  x.beginPath()
  const pad = W * 0.02
  x.moveTo(pad, H * 0.13)
  for (let i = 0; i <= 10; i++) {
    x.lineTo(pad + ((W - pad * 2) * i) / 10, H * (0.11 + (i % 2) * 0.035))
  }
  x.lineTo(W - pad, H * 0.88)
  for (let i = 10; i >= 0; i--) {
    x.lineTo(pad + ((W - pad * 2) * i) / 10, H * (0.9 - (i % 3) * 0.03))
  }
  x.closePath()
  x.fill()

  // grain and a couple of stains so it reads as old tape
  x.globalAlpha = 0.07
  for (let i = 0; i < 90; i++) {
    x.fillStyle = i % 2 ? '#6b5a3c' : '#fffaf0'
    x.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 22, 1.5)
  }
  x.globalAlpha = 1

  x.textAlign = 'center'
  x.fillStyle = '#2b2118'
  x.font = `${wide ? 54 : 46}px "Segoe UI", system-ui, sans-serif`
  x.letterSpacing = wide ? '10px' : '6px'
  x.fillText(title.toUpperCase(), W / 2, H * (sub ? 0.46 : 0.62))

  if (sub) {
    x.fillStyle = 'rgba(58,46,32,0.82)'
    x.font = `${wide ? 32 : 27}px Georgia, serif`
    x.letterSpacing = '0px'
    x.fillText(sub, W / 2, H * 0.76)
  }

  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 8
  return tex
}

const fwd = new THREE.Vector3()
const toSign = new THREE.Vector3()
const world = new THREE.Vector3()

function Sign({ position, rotation, width, title, sub, wide = true, near = 1.15 }) {
  const mat = useRef()
  const mesh = useRef()
  const tex = useMemo(() => tapeTexture(title, sub, { wide }), [title, sub, wide])
  const h = width * ((wide ? 168 : 128) / (wide ? 1024 : 512))

  useFrame(({ camera }, dt) => {
    if (!mat.current || !mesh.current) return
    mesh.current.getWorldPosition(world)
    camera.getWorldDirection(fwd)
    toSign.copy(world).sub(camera.position)
    const dist = toSign.length()
    toSign.normalize()

    // how squarely you are looking at it
    const aim = THREE.MathUtils.smoothstep(fwd.dot(toSign), 0.62, 0.93)
    // and it gets out of the way once you are standing at the thing it names
    const room = THREE.MathUtils.smoothstep(dist, near, near + 0.9)
    const want = aim * room * 0.72

    mat.current.opacity = THREE.MathUtils.damp(mat.current.opacity, want, 5, dt)
    mesh.current.visible = mat.current.opacity > 0.01
  })

  return (
    <mesh ref={mesh} position={position} rotation={rotation}>
      <planeGeometry args={[width, h]} />
      {/* knocked back with a tint: at full white the tape was brighter than
          the wall it is stuck to, which is how a label becomes a UI chip */}
      <meshBasicMaterial ref={mat} map={tex} color="#a89a7e" transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

export default function Signs({ data }) {
  if (!data) return null
  const n = (v) => (v || []).length
  return (
    <group>
      <Sign
        position={[0, 2.44, -HD + 0.02]}
        rotation={[0, 0, 0]}
        width={1.5}
        title="the ledger"
        sub={`${data.count} films I scored the night I watched them · height = the score`}
        near={1.6}
      />
      <Sign
        position={[-0.62, 2.28, HD - 0.02]}
        rotation={[0, Math.PI, 0]}
        width={1.25}
        title="the door"
        sub={`${n(data.queue)} films queued up next`}
      />
      <Sign
        position={[-HW + 0.02, 2.28, -0.45]}
        rotation={[0, Math.PI / 2, 0]}
        width={1.25}
        title="the mirror"
        sub={`${n(data.lessons)} things this room has learned about my taste`}
      />
      {/* the two archives get small tags on the containers themselves */}
      <Sign
        position={[-1.6, 0.155, 0.905]}
        rotation={[0, 0, -0.02]}
        width={0.33}
        wide={false}
        title="the shoebox"
        sub={`${n(data.shoebox)} scored from memory`}
        near={0.8}
      />
      <Sign
        position={[1.45, 0.515, -1.133]}
        rotation={[0, 0, 0.015]}
        width={0.3}
        wide={false}
        title="the dark drawer"
        sub={`${n(data.drawer)} seen · never scored`}
        near={0.8}
      />
    </group>
  )
}
