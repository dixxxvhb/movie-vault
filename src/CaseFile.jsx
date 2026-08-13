import React, { useEffect, useMemo, useRef, useState } from 'react'

// The reading layer. Deliberately DOM, not a canvas texture: at inspect range a
// texture-drawn paragraph turns to mush, while real text stays crisp,
// selectable and scrollable at any zoom. It is pinned beside the card rather
// than taking the screen, so you never leave the room.
//
// panel_html is authored prose from film_ledger_panels — sections come through
// as <p class="plot">, <p class="take">, etc. We restyle rather than reformat:
// the writing is the point.

function useTypeset(html) {
  return useMemo(() => {
    if (!html) return null
    // Strip the panel's own title block and rank number — the sheet header
    // already prints those, and repeating them reads as a bug. Parsed rather
    // than regexed: `.head` contains nested divs, so a non-greedy
    // `<div class="head">...</div>` match stopped at the FIRST closing tag and
    // left the score stranded mid-document.
    const doc = new DOMParser().parseFromString(html, 'text/html')
    doc.querySelectorAll('.no, .head').forEach((el) => el.remove())
    const section = doc.querySelector('section')
    return (section ? section.innerHTML : doc.body.innerHTML).trim()
  }, [html])
}

export default function CaseFile({ film, links, onClose, onJump }) {
  const body = useTypeset(film.panel)
  const [show, setShow] = useState(false)
  const scroller = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 240)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0
  }, [film.slug])

  const kin = links.filter((l) => l.from === film.slug || l.to === film.slug)

  return (
    <div style={{ ...S.wrap, opacity: show ? 1 : 0 }}>
      {/* the panels arrive as authored HTML with their own class names; style
          them here rather than rewriting prose that was written by hand */}
      <style>{`
        .casefile-body p { margin: 0 0 13px; }
        .casefile-body p:last-child { margin-bottom: 0; }
        .casefile-body .plot { color: #33302a; }
        .casefile-body .take {
          border-left: 3px solid rgba(140,43,38,.5);
          padding: 2px 0 2px 13px; margin-left: 1px;
          font-style: italic; color: #4a443a;
        }
        .casefile-body .meta, .casefile-body .no {
          font-family: system-ui, sans-serif; font-size: 11px;
          letter-spacing: .06em; color: #8d8471; text-transform: uppercase;
        }
        .casefile-body em { font-style: italic; }
        .casefile-body strong { font-weight: 700; color: #221f19; }
        .casefile-body::-webkit-scrollbar { width: 8px; }
      `}</style>
      <div style={S.sheet} ref={scroller}>
        <div style={S.tab}>case file</div>

        <div style={S.head}>
          <div style={S.title}>{film.title}</div>
          <div style={S.score}>{film.score.toFixed(1)}</div>
        </div>

        <div style={S.meta}>
          {[
            film.year,
            film.director?.join(', '),
            film.runtime ? film.runtime + ' min' : null,
            'watched ' + film.watched,
          ].filter(Boolean).join('  ·  ')}
        </div>

        {film.genres?.length > 0 && (
          <div style={S.tags}>
            {film.genres.map((g) => <span key={g} style={S.tag}>{g}</span>)}
          </div>
        )}

        {body
          ? <div className="casefile-body" style={S.body} dangerouslySetInnerHTML={{ __html: body }} />
          : <div style={S.empty}>No case file written for this one yet.</div>}

        {kin.length > 0 && (
          <div style={S.kinBlock}>
            <div style={S.kinHead}>connected</div>
            {kin.map((l, i) => {
              const otherSlug = l.from === film.slug ? l.to : l.from
              return (
                <button key={i} style={S.kin} onClick={() => onJump(otherSlug)}>
                  <span style={S.kinRel}>{l.relation}</span>
                  <span style={S.kinNote}>{l.note || 'linked'}</span>
                </button>
              )
            })}
          </div>
        )}

        <button style={S.close} onClick={onClose}>put it back</button>
      </div>
    </div>
  )
}

const S = {
  wrap: {
    position: 'fixed', top: 0, right: 0, height: '100%',
    width: 'min(460px, 42vw)', display: 'flex', alignItems: 'center',
    padding: '0 26px', boxSizing: 'border-box', pointerEvents: 'none',
    transition: 'opacity .45s ease',
  },
  sheet: {
    pointerEvents: 'auto',
    maxHeight: '84vh', overflowY: 'auto', width: '100%',
    background: 'linear-gradient(#fdf8ec, #f4ecdb)',
    color: '#221f19', padding: '26px 28px 30px',
    boxShadow: '0 30px 80px rgba(0,0,0,.66), 0 2px 0 rgba(255,255,255,.5) inset',
    borderRadius: 2,
    fontFamily: 'Georgia, "Iowan Old Style", serif',
    transform: 'rotate(-.35deg)',
  },
  tab: {
    fontFamily: 'system-ui, sans-serif', fontSize: 10, letterSpacing: '.28em',
    textTransform: 'uppercase', color: '#a2947a', marginBottom: 14,
  },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14 },
  title: { fontSize: 27, fontStyle: 'italic', lineHeight: 1.12 },
  score: { fontSize: 30, color: '#8c2b26', fontWeight: 700 },
  meta: {
    fontFamily: 'system-ui, sans-serif', fontSize: 11, letterSpacing: '.06em',
    color: '#8d8471', marginTop: 8, textTransform: 'uppercase',
  },
  tags: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tag: {
    fontFamily: 'system-ui, sans-serif', fontSize: 10.5, letterSpacing: '.08em',
    padding: '3px 8px', border: '1px solid rgba(80,70,50,.24)', color: '#6d6552',
    borderRadius: 2, textTransform: 'lowercase',
  },
  body: { marginTop: 18, fontSize: 15, lineHeight: 1.62, color: '#33302a' },
  empty: { marginTop: 18, fontSize: 14, color: '#8d8471', fontStyle: 'italic' },
  kinBlock: { marginTop: 22, borderTop: '1px solid rgba(90,78,56,.22)', paddingTop: 14 },
  kinHead: {
    fontFamily: 'system-ui, sans-serif', fontSize: 10, letterSpacing: '.26em',
    textTransform: 'uppercase', color: '#a2947a', marginBottom: 10,
  },
  kin: {
    display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
    background: 'rgba(140,43,38,.05)', border: '1px solid rgba(140,43,38,.22)',
    borderLeft: '3px solid #C42B2B', padding: '7px 10px', marginBottom: 6,
    borderRadius: 2, font: 'inherit', color: '#3a352c',
  },
  kinRel: {
    display: 'block', fontFamily: 'system-ui, sans-serif', fontSize: 10,
    letterSpacing: '.14em', textTransform: 'uppercase', color: '#8c2b26',
  },
  kinNote: { display: 'block', fontSize: 13, marginTop: 3, lineHeight: 1.4 },
  close: {
    marginTop: 22, cursor: 'pointer', background: 'none',
    border: '1px solid rgba(90,78,56,.3)', color: '#6d6552',
    fontFamily: 'system-ui, sans-serif', fontSize: 10.5, letterSpacing: '.2em',
    textTransform: 'uppercase', padding: '8px 14px', borderRadius: 2,
  },
}
