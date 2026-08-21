import React from 'react'

// {offset, wrongness}: renders children twice, the second copy slightly off
// (enemy, moon). `wrongness` scales how far off: 'subtle' | 'high' | number.
export default function Duplicates({ offset = 0.08, wrongness = 'subtle', children }) {
  const w = wrongness === 'high' ? 1 : wrongness === 'subtle' ? 0.35 : Number(wrongness) || 0.35
  return (
    <group>
      {children}
      <group position={[offset, offset * 0.4 * w, offset * 0.6]} rotation={[0, offset * 0.5 * w, 0]}>
        {children}
      </group>
    </group>
  )
}
