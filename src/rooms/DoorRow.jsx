import React from 'react'
import Door from './Door.jsx'

// A row of bloodline doors, evenly spaced and centered on `position`, all
// facing the same way (VAULT-IMMERSION-BRIEF-v2.md §6: "doors stand in a row
// with even spacing" once a film has more than one). `rotationY` is the
// row's own facing direction; doors space out along the axis perpendicular
// to that facing (local +X before the rotation is applied), same convention
// Door.jsx itself uses for its frame/panel geometry.
export default function DoorRow({ doors, position, rotationY = 0, spacing = 1.05, scale = 1, grade, onDoor }) {
  if (!doors?.length) return null
  const n = doors.length
  const totalW = (n - 1) * spacing
  const cos = Math.cos(rotationY)
  const sin = Math.sin(rotationY)
  return (
    <group>
      {doors.map((spec, i) => {
        const local = i * spacing - totalW / 2
        const pos = [
          position[0] + local * cos,
          position[1],
          position[2] - local * sin,
        ]
        return (
          <Door
            key={spec.id}
            position={pos}
            rotationY={rotationY}
            scale={scale}
            grade={grade}
            spec={spec}
            onDoor={onDoor}
          />
        )
      })}
    </group>
  )
}
