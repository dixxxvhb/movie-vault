import React, { useEffect, useState } from 'react'
import {
  get, set, subscribe, resetAll, PRESETS, applyPreset,
} from './settings.js'

// THE OPTIONS PANEL, and it is deliberately boring.
//
// Design ruling, from the diegetic-UI research and written into the plan:
// content ABOUT the world is an object in the room; controls that OPERATE the
// machine are plain DOM. A settings screen rendered as a motel guest card
// would be charming for four seconds and then a person who needs to turn the
// strobing off would be hunting for a switch inside a fiction. So: dark panel,
// system font, plain rows, obvious labels, no theming, no cleverness.
//
// It matters more where this is than what is in it. Before this, the entire
// preference system was a sound toggle and a bob toggle rendered inside a film
// room's HUD, which means a visitor standing in the motel could not reach
// either one. A setting a player cannot find has not been shipped.
//
// Two rules the accessibility research is emphatic about and this obeys:
//
//   1. DEFAULTS ARE THE FEATURE. A panel of twenty switches whose defaults are
//      all still hazardous has moved the work onto the player. The defaults
//      here come from the OS (prefers-reduced-motion, prefers-contrast).
//   2. PRESETS BEAT A TOGGLE WALL. Four named starting points, each of which
//      then reveals the full panel. Nobody should have to understand twenty
//      switches to make this usable.
//
// The room stays visible behind it, so the effect of a toggle is immediate and
// visible rather than something you apply and then go looking for.

const PANEL = {
  position: 'fixed', inset: 0, zIndex: 60,
  display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end',
  background: 'rgba(6,5,4,.55)', backdropFilter: 'blur(2px)',
  font: '14px/1.5 system-ui, -apple-system, sans-serif',
}
const SHEET = {
  width: 'min(420px, 100%)', height: '100%', overflowY: 'auto',
  background: 'rgba(12,10,8,.96)', borderLeft: '1px solid rgba(180,160,120,.22)',
  padding: '20px 22px 60px', color: '#e8ddc8',
}
const H2 = {
  font: '600 11px/1 system-ui, sans-serif', letterSpacing: '.16em',
  textTransform: 'uppercase', color: '#9b8f77', margin: '26px 0 10px',
}
const ROW = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 14, padding: '9px 0', borderBottom: '1px solid rgba(180,160,120,.10)',
}
const LABEL = { flex: 1 }
const HINT = { display: 'block', color: '#8d8371', fontSize: 12, marginTop: 2 }
const BTN = {
  background: 'rgba(30,24,18,.9)', color: '#d9cdb4',
  border: '1px solid rgba(180,160,120,.3)', borderRadius: 2,
  padding: '6px 11px', fontSize: 12.5, cursor: 'pointer', font: 'inherit',
}
const BTN_ON = { ...BTN, color: '#1a1410', background: '#d9c9a4', borderColor: '#d9c9a4' }

function Toggle({ path, label, hint }) {
  const [v, setV] = useState(() => !!get(path))
  useEffect(() => subscribe(() => setV(!!get(path))), [path])
  return (
    <div style={ROW}>
      <span style={LABEL}>
        {label}
        {hint ? <span style={HINT}>{hint}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={v}
        onClick={() => set(path, !v)}
        style={v ? BTN_ON : BTN}
      >
        {v ? 'on' : 'off'}
      </button>
    </div>
  )
}

function Choice({ path, label, hint, options }) {
  const [v, setV] = useState(() => get(path))
  useEffect(() => subscribe(() => setV(get(path))), [path])
  return (
    <div style={{ ...ROW, flexWrap: 'wrap' }}>
      <span style={LABEL}>
        {label}
        {hint ? <span style={HINT}>{hint}</span> : null}
      </span>
      <span role="radiogroup" aria-label={label} style={{ display: 'flex', gap: 6 }}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={v === o.value}
            onClick={() => set(path, o.value)}
            style={v === o.value ? BTN_ON : BTN}
          >
            {o.label}
          </button>
        ))}
      </span>
    </div>
  )
}

export default function Options({ open, onClose }) {
  // Escape closes. Focus moves into the sheet on open so a keyboard user is
  // not left tabbing through the canvas to reach it.
  useEffect(() => {
    if (!open) return undefined
    const k = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
    }
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  }, [open, onClose])

  if (!open) return null

  return (
    <div style={PANEL} onClick={onClose}>
      <div
        style={SHEET}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h1 style={{ font: '400 22px Georgia, serif', margin: 0 }}>Settings</h1>
          <button type="button" onClick={onClose} style={BTN} autoFocus>close</button>
        </div>
        <p style={{ color: '#8d8371', fontSize: 12.5, margin: '10px 0 0' }}>
          The room stays visible behind this, so you can see what each one does.
          Nothing here is saved to a server; it lives in this browser.
        </p>

        <h2 style={H2}>Start from</h2>
        <p style={{ ...HINT, marginTop: 0, marginBottom: 8 }}>
          Pick one, then adjust anything below.
        </p>
        {Object.entries(PRESETS).map(([key, p]) => (
          <button
            key={key}
            type="button"
            onClick={() => applyPreset(key)}
            style={{ ...BTN, display: 'block', width: '100%', textAlign: 'left', marginBottom: 6, padding: '10px 12px' }}
          >
            <strong style={{ color: '#e8ddc8' }}>{p.label}</strong>
            <span style={HINT}>{p.hint}</span>
          </button>
        ))}

        <h2 style={H2}>Flashing</h2>
        <Choice
          path="flash.level"
          label="Flashing and strobe"
          hint="Some rooms flash. This caps how fast and how hard, everywhere."
          options={[
            { value: 'full', label: 'as authored' },
            { value: 'reduced', label: 'gentler' },
            { value: 'none', label: 'none' },
          ]}
        />

        <h2 style={H2}>Motion</h2>
        <Choice
          path="motion.travel"
          label="Moving between places"
          hint="The camera flies by default. A cut is steadier."
          options={[{ value: 'fly', label: 'fly' }, { value: 'cut', label: 'cut' }]}
        />
        <Choice
          path="motion.turn"
          label="Turning with the keyboard"
          hint="Snap turning helps if smooth turning makes you queasy."
          options={[{ value: 'smooth', label: 'smooth' }, { value: 'snap', label: 'snap' }]}
        />
        <Toggle path="motion.headBob" label="Head bob while walking" />
        <Toggle path="motion.moveVignette" label="Narrow the view while moving" hint="Often helps with motion sickness." />
        <Toggle path="motion.dust" label="Dust in the air" />
        <Toggle path="motion.coldOpen" label="The wake-up blink on arrival" />

        <h2 style={H2}>Reading</h2>
        <Choice
          path="vision.textScale"
          label="Text size"
          options={[
            { value: 1, label: '100%' }, { value: 1.25, label: '125%' },
            { value: 1.5, label: '150%' }, { value: 2, label: '200%' },
          ]}
        />
        <Toggle path="vision.highContrast" label="Higher contrast" hint="Drops the grain, the bloom and most of the vignette." />
        <Toggle path="vision.keepSignage" label="Keep the signs up" hint="Signs fade as you approach by default." />
        <Toggle path="reading.plain" label="Plain language" hint="Short summaries instead of the full written reviews." />

        <h2 style={H2}>Sound</h2>
        <Toggle path="audio.mono" label="Mono" />
        <Toggle path="audio.captions" label="Describe sounds in text" />

        <h2 style={H2}>Content</h2>
        <Toggle path="content.warnBefore" label="Warn me before a difficult room" hint="Skipping a room does not hide the film. Its score, review and quotes stay on the wall." />
        <Toggle path="content.roomEvents" label="Rooms do things on their own" hint="Cuts, resets, weather." />
        <Toggle path="content.roomReactsToYou" label="Rooms react to you" hint="Some notice where you are looking, or how long you have stood still." />

        <h2 style={H2}>Controls</h2>
        <Toggle path="input.holdToToggle" label="Press instead of hold" hint="Anything you would hold down becomes a press on, press off." />
        <Toggle path="input.invertY" label="Invert vertical look" />

        <div style={{ marginTop: 28, display: 'flex', gap: 8 }}>
          <button type="button" onClick={resetAll} style={BTN}>reset everything</button>
        </div>

        <p style={{ ...HINT, marginTop: 22 }}>
          There is nothing to lose here. No score, no timers, no way to fail,
          and nothing you skip is gone for good.
        </p>
      </div>
    </div>
  )
}
