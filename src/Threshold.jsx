import React, { useEffect, useState } from 'react'
import { applyPreset, get, set } from './settings.js'

// THE THRESHOLD. One screen, before anything renders, that says what is in
// here and offers a way through it.
//
// The Vault has strobing red, an 11 Hz flicker, lightning, a hard cut to full
// daylight, a flash to white on a loop, and a wing of horror films, and until
// now it warned about none of it. XAG 118 is explicit that ELIMINATING
// content which can cause photosensitive seizures beats warning about it, and
// the flash policy does that part; this is the other half, for the person who
// needs to know before they walk in.
//
// What makes a warning not a shrug, per XAG 123: it names the SPECIFIC
// hazards rather than saying "contains flashing lights", it offers the
// accommodation in the same breath rather than sending you to a menu, and it
// says plainly what opting out costs. Here that last one is easy and it is
// worth saying out loud, because fear that skipping costs something is the
// main reason people do not use content settings:
//
//   Skipping a room does not hide the film. Its score, its review and its
//   quotes all stay on the wall.
//
// Shown once per browser. `?nogate` skips it, same as `?nocold`.

const KEY = 'vault-threshold-seen'

const WRAP = {
  position: 'fixed', inset: 0, zIndex: 80,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#0b0906', padding: '24px',
  font: '15px/1.6 system-ui, -apple-system, sans-serif', color: '#e6dbc4',
}
const CARD = { maxWidth: 470, width: '100%' }
const BTN = {
  display: 'block', width: '100%', textAlign: 'left',
  background: 'rgba(30,24,18,.85)', color: '#e6dbc4',
  borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(180,160,120,.3)',
  borderRadius: 2, padding: '13px 15px', marginBottom: 8,
  font: 'inherit', cursor: 'pointer',
}
const GO = {
  ...BTN,
  background: '#d9c9a4', color: '#1a1410', borderColor: '#d9c9a4',
  textAlign: 'center', marginTop: 14, fontWeight: 600,
}
const SUB = { display: 'block', color: '#8f8471', fontSize: 13, marginTop: 3 }

export default function Threshold({ onDone }) {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      if (window.location.search.includes('nogate')) return false
      if (window.location.search.includes('nocold')) return false
      return window.localStorage.getItem(KEY) !== '1'
    } catch {
      return true
    }
  })

  useEffect(() => {
    if (!open) onDone?.()
  }, [open, onDone])

  const leave = () => {
    try { window.localStorage.setItem(KEY, '1') } catch { /* private mode */ }
    setOpen(false)
    onDone?.()
  }

  if (!open) return null

  return (
    <div style={WRAP} role="dialog" aria-modal="true" aria-labelledby="th-h">
      <div style={CARD}>
        <h1 id="th-h" style={{ font: '400 27px/1.2 Georgia, serif', margin: '0 0 4px' }}>
          The Vault
        </h1>
        <p style={{ color: '#9c917c', margin: '0 0 20px', fontSize: 14 }}>
          One person&rsquo;s film archive, as a place you can walk around.
        </p>

        <p style={{ margin: '0 0 6px' }}>Before you go in, some of these rooms:</p>
        <ul style={{ margin: '0 0 20px', paddingLeft: 20, color: '#c8bda6' }}>
          <li>flash and strobe, including red (Malignant, Masters of the Universe)</li>
          <li>cut hard to full brightness with no warning (Barbarian, Sorry to Bother You)</li>
          <li>flash to white on a repeating timer (Coherence, Source Code)</li>
          <li>are horror, with dread and one or two shocks (Hereditary, Barbarian, Se7en)</li>
          <li>fill the screen with fire and flickering orange light, if you start it (Inglourious Basterds)</li>
        </ul>

        <button type="button" style={BTN} onClick={() => { applyPreset('calm-room'); leave() }}>
          <strong>Take me in calmly</strong>
          <span style={SUB}>No flashing, no hard cuts, nothing jumps at you. You can change this any time.</span>
        </button>
        <button type="button" style={BTN} onClick={() => { applyPreset('steady-view'); leave() }}>
          <strong>I get motion sick</strong>
          <span style={SUB}>The camera cuts instead of flying, and never bobs.</span>
        </button>

        <button type="button" style={GO} onClick={leave} autoFocus>
          Go in
        </button>

        <p style={{ ...SUB, marginTop: 16, fontSize: 12.5 }}>
          Skipping a room does not hide the film. Its score, its review and its
          quotes all stay on the wall. There is no score here, no timer, and no
          way to fail. Settings live behind the control in the top right.
        </p>
        <p style={{ ...SUB, marginTop: 8, fontSize: 12.5 }}>
          {get('flash.level') === 'reduced'
            ? 'Your device asks for reduced motion, so flashing is already turned down.'
            : 'Everything here is stored in this browser and nowhere else.'}
        </p>
      </div>
    </div>
  )
}
