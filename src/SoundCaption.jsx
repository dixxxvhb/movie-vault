import React, { useEffect, useState } from 'react'
import { get, subscribe } from './settings.js'
import { CAPTIONS } from './rooms/audio/captions.js'

// "Describe sounds in text" (audio.captions). A quiet line naming what is
// playing, shown only while something is actually audible: the room's own
// sound when it is on, or the motel's air handler. Bracketed the way closed
// captions mark a sound rather than speech.

const STYLE = {
  position: 'fixed', left: '50%', bottom: 76, transform: 'translateX(-50%)',
  maxWidth: 'min(80vw, 560px)', zoom: 'var(--ts, 1)',
  padding: '6px 12px', borderRadius: 2,
  background: 'rgba(10,8,6,.72)', color: '#e6dbc4',
  font: 'italic 13.5px/1.45 system-ui, -apple-system, sans-serif',
  textAlign: 'center', pointerEvents: 'none', zIndex: 20,
}

export default function SoundCaption({ slug, sound }) {
  const [on, setOn] = useState(() => !!get('audio.captions'))
  useEffect(() => subscribe(() => setOn(!!get('audio.captions'))), [])
  const text = slug ? CAPTIONS[slug] : null
  if (!on || !sound || !text) return null
  return (
    <div style={STYLE} role="status" aria-live="polite">
      [{text}]
    </div>
  )
}
