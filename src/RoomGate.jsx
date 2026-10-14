import React, { useEffect, useRef } from 'react'
import { applyPreset, get, set } from './settings.js'
import { hazardsFor } from './hazards.js'

// The per-room card. The Threshold promises "skipping a room does not hide
// the film" and "warn me before a difficult room"; this is where both are
// kept. It shows when you try to enter a room that is either on your skip
// list or has something in hazards.js while the warning is on.
//
// Three ways through, in the Threshold's order: go in, go in calmly (the
// calm-room preset for this visit only, so a link or a one-off does not
// rewrite the saved profile), or skip it. A skipped room stays on the wall
// with its score, review and quotes; only the door stays shut, and this card
// is how you open it again.

const WRAP = {
  position: 'fixed', inset: 0, zIndex: 60,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(8,6,4,.72)', padding: 24,
  font: '15px/1.6 system-ui, -apple-system, sans-serif', color: '#e6dbc4',
}
const CARD = {
  maxWidth: 420, width: '100%', background: '#0b0906', padding: '22px 22px 18px',
  border: '1px solid rgba(180,160,120,.3)', borderRadius: 2, zoom: 'var(--ts, 1)',
}
const BTN = {
  display: 'block', width: '100%', textAlign: 'left',
  background: 'rgba(30,24,18,.85)', color: '#e6dbc4',
  borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(180,160,120,.3)',
  borderRadius: 2, padding: '11px 14px', marginBottom: 8,
  font: 'inherit', cursor: 'pointer',
}
const GO = { ...BTN, background: '#d9c9a4', color: '#1a1410', borderColor: '#d9c9a4', fontWeight: 600 }
const SUB = { display: 'block', color: '#8f8471', fontSize: 13, marginTop: 2 }

export function isSkipped(slug) {
  const list = get('content.skip')
  return Array.isArray(list) && list.includes(slug)
}

// Does entering `slug` need the card first?
export function needsGate(slug) {
  if (isSkipped(slug)) return true
  return !!hazardsFor(slug) && get('content.warnBefore') !== false
}

function setSkipped(slug, on) {
  const list = (get('content.skip') || []).filter((s) => s !== slug)
  set('content.skip', on ? [...list, slug] : list)
}

export default function RoomGate({ slug, title, onGo, onClose }) {
  const hazards = hazardsFor(slug)
  const skipped = isSkipped(slug)
  const card = useRef(null)

  useEffect(() => {
    // focus the card, not its first button: the Enter that opened this card
    // is still being delivered, and landing it on "Go in" would click it
    card.current?.focus()
    // capture, so Esc and Enter answer the card and never reach the room
    // behind it (App's own key handler would step inside on Enter)
    const k = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); onClose() }
      else if (e.key === 'Enter' && e.target?.tagName !== 'BUTTON') { e.stopImmediatePropagation() }
    }
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  }, [onClose])

  const go = () => { if (skipped) setSkipped(slug, false); onGo() }
  const calm = () => { applyPreset('calm-room', { sessionOnly: true }); go() }
  const skip = () => { setSkipped(slug, true); onClose() }

  return (
    <div style={WRAP} role="dialog" aria-modal="true" aria-labelledby="gate-h" onClick={onClose}>
      <div style={{ ...CARD, outline: 'none' }} ref={card} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <h2 id="gate-h" style={{ font: '400 22px/1.25 Georgia, serif', margin: '0 0 10px' }}>{title}</h2>
        {skipped && (
          <p style={{ margin: '0 0 10px' }}>You chose to skip this room. Its score, review and quotes are still on the wall.</p>
        )}
        {hazards && (
          <>
            <p style={{ margin: '0 0 4px' }}>This room has:</p>
            <ul style={{ margin: '0 0 16px', paddingLeft: 20, color: '#c8bda6' }}>
              {hazards.map((h) => <li key={h}>{h}</li>)}
            </ul>
          </>
        )}
        <button type="button" style={GO} onClick={go}>
          {skipped ? 'Go in anyway' : 'Go in'}
          {skipped && <span style={{ ...SUB, color: '#4a4032' }}>and stop skipping it</span>}
        </button>
        {hazards && (
          <button type="button" style={BTN} onClick={calm}>
            <strong>Go in calmly</strong>
            <span style={SUB}>No flashing, no timed cuts, nothing that reacts to you. Until you close the tab.</span>
          </button>
        )}
        {!skipped && (
          <button type="button" style={BTN} onClick={skip}>
            <strong>Skip this room</strong>
            <span style={SUB}>The door stays shut. The film stays on the wall.</span>
          </button>
        )}
        <button type="button" style={{ ...BTN, background: 'transparent', marginBottom: 0 }} onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  )
}
