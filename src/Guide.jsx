import React, { useEffect, useState } from 'react'

// The card on the nightstand of every motel: what the room has in it and how to
// work the switches. It exists because the Vault had no answer to "what is this
// and what does it do" other than a row of nav buttons with names only Dixon
// would recognise.
//
// It shows itself once, the first time, and then lives behind the ? in the
// corner. Styled as a printed guest card rather than a modal, because a modal
// is exactly the thing this upgrade is trying to get rid of.

const KEY = 'vault.guide.seen.v1'

export default function Guide({ counts }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let seen = null
    try { seen = localStorage.getItem(KEY) } catch { /* private mode */ }
    // ?noguide keeps the screenshot harness from photographing this card in
    // front of every station on a fresh browser profile
    if (new URLSearchParams(location.search).has('noguide')) return
    if (!seen) {
      // after the cold open, not on top of it
      const t = setTimeout(() => setOpen(true), 4200)
      return () => clearTimeout(t)
    }
  }, [])

  const close = () => {
    setOpen(false)
    try { localStorage.setItem(KEY, '1') } catch { /* private mode */ }
  }

  useEffect(() => {
    if (!open) return
    const k = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  }, [open])

  return (
    <>
      <button
        onClick={() => (open ? close() : setOpen(true))}
        aria-label="what is this"
        title="what is this"
        style={S.ask}
      >
        ?
      </button>

      {open && (
        <div style={S.card}>
          <div style={S.tape} />
          <div style={S.kicker}>guest information</div>
          <div style={S.title}>What this room is</div>

          <p style={S.lede}>
            Every film I have watched, kept the way a person keeps things:
            pinned up, boxed up, or shoved in a drawer.
          </p>

          <dl style={S.dl}>
            <Row k="The Ledger" v={`${counts.films} films, scored the night I watched them. How high a photo hangs IS the score.`} />
            <Row k="Investigation" v={`${counts.links} red strings between films that rhyme.`} />
            <Row k="The Door" v={`${counts.queue} films queued up next.`} />
            <Row k="The Mirror" v={`${counts.lessons} things this room has worked out about my taste.`} />
            <Row k="The Shoebox" v={`${counts.shoebox} older films, scored from memory. Under the window.`} />
            <Row k="The Dark Drawer" v={`${counts.drawer} seen, none scoreable. In the nightstand.`} />
          </dl>

          <div style={S.rule} />

          <p style={S.keys}>
            Drag to look — you can turn the whole way round. Scroll or pinch to
            zoom. Click a wall, the box or the drawer to walk over. Click any
            photo to take it down and read its case file. Esc steps back out.
          </p>

          <button onClick={close} style={S.ok}>got it</button>
        </div>
      )}
    </>
  )
}

function Row({ k, v }) {
  return (
    <div style={S.row}>
      <dt style={S.k}>{k}</dt>
      <dd style={S.v}>{v}</dd>
    </div>
  )
}

const S = {
  ask: {
    position: 'fixed', top: 18, right: 20, width: 30, height: 30,
    background: 'rgba(14,10,8,.62)', color: '#b7a98e',
    border: '1px solid rgba(180,160,120,.28)', borderRadius: '50%',
    cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: 15,
    backdropFilter: 'blur(3px)', lineHeight: 1,
  },
  card: {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-.5deg)',
    width: 'min(470px, 88vw)', maxHeight: '84vh', overflowY: 'auto',
    background: 'linear-gradient(168deg, #FBF3E2, #EFE3C9)', color: '#2b2519',
    padding: '26px 30px 24px', boxSizing: 'border-box',
    boxShadow: '0 40px 90px rgba(0,0,0,.7)',
    fontFamily: 'Georgia, "Iowan Old Style", serif',
  },
  tape: {
    position: 'absolute', top: -11, left: '50%', width: 96, height: 22,
    transform: 'translateX(-50%) rotate(-1.4deg)',
    background: 'rgba(226,214,186,.85)', boxShadow: '0 1px 3px rgba(0,0,0,.25)',
  },
  kicker: {
    fontFamily: 'system-ui, sans-serif', fontSize: 10, letterSpacing: '.3em',
    textTransform: 'uppercase', color: '#a2947a',
  },
  title: { fontSize: 24, fontStyle: 'italic', marginTop: 9 },
  lede: { fontSize: 14, lineHeight: 1.55, color: '#4a4234', margin: '10px 0 18px' },
  dl: { margin: 0 },
  row: { display: 'flex', gap: 12, marginBottom: 7, alignItems: 'baseline' },
  k: {
    flex: '0 0 118px', margin: 0,
    fontFamily: 'system-ui, sans-serif', fontSize: 10.5, letterSpacing: '.12em',
    textTransform: 'uppercase', color: '#8c2b26',
  },
  v: { margin: 0, fontSize: 13, lineHeight: 1.45, color: '#3b352a' },
  keys: { margin: 0, fontSize: 13, lineHeight: 1.55, color: '#5a5142' },
  rule: { height: 1, background: 'rgba(90,78,56,.24)', margin: '16px 0' },
  ok: {
    marginTop: 18, cursor: 'pointer', background: 'none',
    border: '1px solid rgba(90,78,56,.34)', color: '#6d6552',
    fontFamily: 'system-ui, sans-serif', fontSize: 10.5, letterSpacing: '.2em',
    textTransform: 'uppercase', padding: '9px 16px',
  },
}
