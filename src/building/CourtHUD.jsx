import React, { useEffect, useRef } from 'react'
import { useCourt, setCourt, courtScene, walkIn, goLevel, showWhole, walkTo } from './courtStore.js'
import { bandName } from './scenes.js'
import { shortDate } from './layout.js'
import { stick } from './stick.js'

// The DOM over the Court: the arrival line, the floors, the door card.
// Controls that operate the machine are plain DOM (plan ruling 8); what the
// building says about the films is on the building.

const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

function Stick() {
  const ring = useRef(null)
  const nub = useRef(null)
  useEffect(() => {
    const el = ring.current
    let id = null
    let cx = 0
    let cy = 0
    const R = 48
    const set = (x, z) => {
      stick.x = x
      stick.z = z
      nub.current.style.transform = `translate(${x * R}px, ${-z * R}px)`
    }
    const s = (e) => {
      const t = e.changedTouches[0]
      const r = el.getBoundingClientRect()
      id = t.identifier
      cx = r.left + r.width / 2
      cy = r.top + r.height / 2
      e.preventDefault()
    }
    const m = (e) => {
      const t = [...e.changedTouches].find((tt) => tt.identifier === id)
      if (!t) return
      let x = (t.clientX - cx) / R
      let z = -(t.clientY - cy) / R
      const l = Math.hypot(x, z)
      if (l > 1) { x /= l; z /= l }
      set(x, z)
      e.preventDefault()
    }
    const en = (e) => {
      if (![...e.changedTouches].some((tt) => tt.identifier === id)) return
      id = null
      set(0, 0)
    }
    el.addEventListener('touchstart', s, { passive: false })
    el.addEventListener('touchmove', m, { passive: false })
    el.addEventListener('touchend', en)
    el.addEventListener('touchcancel', en)
    return () => {
      set(0, 0)
      el.removeEventListener('touchstart', s)
      el.removeEventListener('touchmove', m)
      el.removeEventListener('touchend', en)
      el.removeEventListener('touchcancel', en)
    }
  }, [])
  return (
    <div ref={ring} className="court-stick" aria-hidden="true">
      <div ref={nub} className="nub" />
    </div>
  )
}


const CSS = `.court-hud { --night: #0a1020; --ink: #0d1420; --cream: #efe4cc; --dim: #9aa3b5; --sodium: #ffb35c;
  --panel: rgba(10, 16, 32, 0.82); --line: rgba(239, 228, 204, 0.18);
  --display: Georgia, "Times New Roman", serif; --label: "Oswald", "Arial Narrow", system-ui, sans-serif;
  --body: system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--cream); font: 15px/1.45 var(--body); zoom: var(--ts, 1); }
.court-hud button { font: inherit; color: inherit; cursor: pointer; }

      /* Night motel: one look, deliberately dark. HUD hugs the edges so the building owns the screen. */
      .court-msg { padding: 2rem; color: var(--dim); }
      .court-hud button:focus-visible, .court-hud a:focus-visible { outline: 2px solid var(--sodium); outline-offset: 2px; }
      .court-fade { position: fixed; inset: 0; background: #000; opacity: 0; pointer-events: none; transition: opacity .2s ease; z-index: 30; }
      .court-fade.on { opacity: 1; }
      @media (prefers-reduced-motion: reduce) { .court-fade { transition: none; } }

      .court-top { position: fixed; top: 0; left: 0; right: 0; display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; justify-content: space-between;
        padding: calc(env(safe-area-inset-top, 0px) + 14px) 16px 14px; background: linear-gradient(var(--panel), transparent); z-index: 10; pointer-events: none; }
      .court-top > * { pointer-events: auto; }
      .court-brand { display: flex; align-items: baseline; gap: 10px; }
      .court-brand .name { font: 700 22px var(--display); letter-spacing: .02em; }
      .court-brand .tag { font: 500 11px var(--label); letter-spacing: .22em; text-transform: uppercase; color: var(--dim); }
      .court-seg { display: inline-flex; border: 1px solid var(--line); border-radius: 3px; overflow: hidden; background: rgba(0,0,0,.35); }
      .court-seg button { background: none; border: 0; padding: 8px 14px; font: 500 13px var(--label); letter-spacing: .14em; text-transform: uppercase; color: var(--dim); }
      .court-seg button.on { background: var(--cream); color: var(--ink); }

      .court-floors { position: fixed; right: 16px; top: 54%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 4px; z-index: 10; }
      .court-floors button { display: flex; justify-content: space-between; gap: 12px; min-width: 104px; padding: 7px 10px; background: var(--panel); border: 1px solid var(--line); border-radius: 3px;
        font: 500 12px var(--label); letter-spacing: .16em; text-transform: uppercase; font-variant-numeric: tabular-nums; }
      .court-floors button span { color: var(--sodium); }
      .court-floors button.on { border-color: var(--sodium); }

      .court-foot { position: fixed; left: 0; right: 0; bottom: 0; padding: 18px 16px calc(env(safe-area-inset-bottom, 0px) + 16px); background: linear-gradient(transparent, var(--panel) 40%); z-index: 10; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
      .court-foot > * { pointer-events: auto; }
      .court-foot .court-blurb { margin: 0; max-width: 60ch; font: 400 17px/1.45 var(--display); }
      .court-foot .court-row, .court-card .court-row { display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center; }
      .court-foot button, .court-card button { background: rgba(0,0,0,.35); border: 1px solid var(--line); border-radius: 3px; padding: 9px 14px; font: 500 13px var(--label); letter-spacing: .14em; text-transform: uppercase; }
      .court-foot button.primary, .court-card button.primary { background: var(--sodium); border-color: var(--sodium); color: var(--ink); }
      .court-hint { color: var(--dim); font-size: 13px; }
      .court-where { font: 500 13px var(--label); letter-spacing: .16em; }
      .court-where i { font-style: normal; color: var(--dim); margin-left: 6px; }
      .court-foot.walk { padding-left: 16px; }
      .court-near { align-self: flex-start; text-transform: none !important; letter-spacing: 0 !important; font: 400 16px var(--display) !important; }
      .court-near b { font: 500 13px var(--label); letter-spacing: .14em; text-transform: uppercase; margin-right: 6px; }
      .court-near span { color: var(--sodium); margin-left: 6px; font-variant-numeric: tabular-nums; }
      .court-near em { font: 400 12px var(--body); font-style: normal; color: var(--dim); margin-left: 10px; }

      .court-stick { position: fixed; left: 24px; bottom: calc(env(safe-area-inset-bottom, 0px) + 170px); width: 96px; height: 96px; border-radius: 50%; border: 1.5px solid rgba(239,228,204,.4); z-index: 12; touch-action: none; }
      .court-stick .nub { position: absolute; left: 30px; top: 30px; width: 36px; height: 36px; border-radius: 50%; background: rgba(239,228,204,.45); }

      .court-card { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(420px, calc(100vw - 32px)); box-sizing: border-box; padding: 20px 20px 18px;
        background: #efe6d2; color: #1d1a16; border-radius: 2px; box-shadow: 0 20px 60px rgba(0,0,0,.6); z-index: 20; }
      .court-card .num { display: inline-block; padding: 4px 12px; background: linear-gradient(#d9b871, #a9843f 55%, #7c5f2a); color: #2a1d08; font: 600 26px var(--display); border-radius: 2px; }
      .court-card h2 { margin: 12px 0 4px; font: 700 28px/1.15 var(--display); text-wrap: balance; }
      .court-card .meta { margin: 0 0 16px; color: #5b5348; font-size: 14px; font-variant-numeric: tabular-nums; }
      .court-card button { color: #1d1a16; background: transparent; border-color: rgba(29,26,22,.3); }
      .court-card button.primary { color: #1d1a16; }
      .court-card .x { position: absolute; right: 12px; top: 12px; padding: 5px 9px; font-size: 11px; }
      .court-card .link { color: #7a2a1e; font-size: 14px; }

      @media (max-width: 560px) {
        .court-brand .tag { display: none; }
        .court-floors { top: calc(env(safe-area-inset-top, 0px) + 108px); transform: none; }
        .court-floors { gap: 3px; }
        .court-floors button { min-width: 78px; padding: 4px 7px; font-size: 10.5px; }
        .court-foot .court-blurb { font-size: 15px; }
      }
    `

export default function CourtHUD({ films, onEnter, onOffice }) {
  const ready = useCourt((s) => s.ready)
  const mode = useCourt((s) => s.mode)
  const level = useCourt((s) => s.level)
  const selected = useCourt((s) => s.selected)
  const near = useCourt((s) => s.near)
  const fade = useCourt((s) => s.fade)
  const scene = ready ? courtScene(films) : null

  // Keys: Enter goes through the door you are in front of, Esc backs out
  // one layer (card, then the walk, back to the whole building).
  useEffect(() => {
    const k = (e) => {
      if (/^(INPUT|TEXTAREA|BUTTON|A|SELECT)$/.test(e.target?.tagName || '')) return
      if (e.key === 'Escape') {
        if (selected) return setCourt({ selected: null })
        if (mode === 'walk') return showWhole()
      }
      if (e.key === 'Enter') {
        const rm = selected || near
        if (rm) onEnter(rm.slug)
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [selected, near, mode, onEnter])

  if (!scene) return null
  const levelsTopDown = scene.levels.map((lv, i) => ({ ...lv, i })).reverse()
  const counts = scene.levels.map((_, i) => scene.rooms.filter((r) => r.floor === i).length)
  const roofIndex = scene.levels.length - 1

  return (
    // A tapped button gives focus back, so Enter and the walk keys reach the
    // building rather than pressing the floor button again.
    <div className="court-hud" onPointerUp={(e) => e.target.closest?.('button')?.blur()}>
      <style>{CSS}</style>
      <div className={`court-fade${fade ? ' on' : ''}`} />

      <header className="court-top">
        <div className="court-brand">
          <span className="name">The Vault</span>
          <span className="tag">{scene.rooms.length} rooms · no vacancy</span>
        </div>
      </header>

      <nav className="court-floors" aria-label="Floors">
        {levelsTopDown.map((lv) => (
          <button type="button" key={lv.i} className={mode === 'walk' && level === lv.i ? 'on' : ''} onClick={() => goLevel(scene, lv.i)}>
            <b>{lv.label.replace('THE ', '')}</b><span>{counts[lv.i]}</span>
          </button>
        ))}
        <button type="button" onClick={onOffice} title="Room 4: the wall of Polaroids">
          <b>Office</b><span>4</span>
        </button>
      </nav>

      {mode === 'overview' ? (
        <footer className="court-foot">
          <p className="court-blurb">
            {scene.rooms.length} rooms. The room number is his score, and each floor is one whole point: the fives on the
            ground, the nines on top, the tens in the penthouse. The wall of Polaroids is in the office, Room 4.
          </p>
          <div className="court-row">
            <button type="button" className="primary" onClick={() => walkIn(scene)}>Walk in</button>
            <span className="court-hint">Drag to look around. Tap a door to read its card.</span>
          </div>
        </footer>
      ) : (
        <footer className="court-foot walk">
          <div className="court-row">
            <button type="button" onClick={showWhole}>See the whole building</button>
            <span className="court-where">{scene.levels[level].label} <i>{scene.levels[level].sub}</i></span>
          </div>
          {near && !selected && (
            <button type="button" className="court-near" onClick={() => onEnter(near.slug)}>
              <b>Room {near.number}</b> {near.title} <span>{near.score.toFixed(1)}</span> <em>{coarse ? 'tap to go in' : 'enter to go in'}</em>
            </button>
          )}
          {!coarse && <span className="court-hint">WASD or arrows to walk, drag to look, Shift to hurry.</span>}
        </footer>
      )}

      {mode === 'walk' && coarse && <Stick />}

      {selected && (
        <aside className="court-card" role="dialog" aria-label={`Room ${selected.number}`}>
          <button type="button" className="x" aria-label="Close" onClick={() => setCourt({ selected: null })}>Close</button>
          <div className="num">{selected.number}</div>
          <h2>{selected.title}</h2>
          <p className="meta">
            {selected.score.toFixed(1)} · watched {shortDate(selected.watched)} · {selected.floor === roofIndex
              ? 'the penthouse'
              : `floor ${selected.floor + 1}, ${bandName(Math.floor(selected.tenths / 10)).toLowerCase()}`}
            {selected.tieSize > 1 ? ` · one of ${selected.tieSize} at ${selected.score.toFixed(1)}` : ''}
          </p>
          <div className="court-row">
            <button type="button" className="primary" onClick={() => onEnter(selected.slug)}>Go in</button>
            <button type="button" onClick={() => walkTo(scene, selected)}>Walk to the door</button>
          </div>
        </aside>
      )}
    </div>
  )
}
