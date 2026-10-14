import React, { useEffect, useMemo, useRef } from 'react'

// THE LENS.
//
// Every film was tagged on the night it was watched — mind-bendy, dread,
// one-man-show, structure-as-twist, morally gray — and until now the room
// rendered none of it. Thirty-three films' worth of his own vocabulary, sitting
// in the database, invisible.
//
// Picking one dims every film that does not carry it. Dims, not hides: the
// shape of the hang is the whole argument of the wall, and punching holes in it
// would be a different (and false) picture. What you get instead is the shape
// of one taste inside the shape of all of it — where his dread films sit
// against his crowd-pleasers, in score.
//
// Only tags used more than once are offered. A tag on exactly one film is a
// note about that night, not a lens you can look through.

export function useVibes(films) {
  return useMemo(() => {
    const count = {}
    for (const f of films || []) {
      for (const v of f.vibes || []) count[v] = (count[v] || 0) + 1
    }
    return Object.entries(count)
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, n]) => ({ tag, n }))
  }, [films])
}

// The emotional key, one word logged on the night (tense, dread, fun, cozy,
// awe, sad, camp). Emitted on every film since the session-two slice and
// never read by anything until this lens. It groups by feel, not score, so
// it is the one way through the wall that does not give the numbers away.
// The lens value for a feel is 'feel:<key>' so it cannot collide with a tag.
export function useFeels(films) {
  return useMemo(() => {
    const count = {}
    for (const f of films || []) if (f.key) count[f.key] = (count[f.key] || 0) + 1
    return Object.entries(count)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([key, n]) => ({ key, n }))
  }, [films])
}

export function lensMatches(film, lens) {
  if (!lens) return true
  if (lens.startsWith('feel:')) return film.key === lens.slice(5)
  return (film.vibes || []).includes(lens)
}

export function lensLabel(lens) {
  return lens && lens.startsWith('feel:') ? 'feels ' + lens.slice(5) : lens
}

export default function Lens({ vibes, feels = [], value, onPick, onClose }) {
  const card = useRef(null)
  // focus moves into the card on open, so the tags are the next Tab stop
  useEffect(() => { card.current?.focus() }, [])
  if (!vibes.length) return null
  return (
    <div style={S.card} ref={card} role="dialog" aria-label="Look through a tag" tabIndex={-1}>
      <div style={S.tape} />
      <div style={S.head}>
        <div style={S.kicker}>look through</div>
        {/* controls live at the TOP: the tag list is long enough to scroll and
            a footer button is a button you cannot find */}
        <div style={S.row}>
          {value && <button onClick={() => onPick(null)} style={S.btn}>clear</button>}
          <button onClick={onClose} style={S.btn}>close</button>
        </div>
      </div>
      <p style={S.lede}>
        Tags written on the night. Pick one and everything that does not carry
        it goes dark. The wall keeps its shape, so you see where that taste
        actually sits in the scores.
      </p>
      {feels.length > 0 && (
        <>
          <div style={{ ...S.kicker, margin: '0 0 8px' }}>how it felt</div>
          <div style={{ ...S.tags, marginBottom: 16 }}>
            {feels.map(({ key, n }) => {
              const v = 'feel:' + key
              return (
                <button
                  key={v}
                  aria-pressed={value === v}
                  onClick={() => onPick(value === v ? null : v)}
                  style={{ ...S.tag, ...(value === v ? S.on : null) }}
                >
                  {key}<span style={S.n}>{n}</span>
                </button>
              )
            })}
          </div>
          <div style={{ ...S.kicker, margin: '0 0 8px' }}>tags</div>
        </>
      )}
      <div style={S.tags}>
        {vibes.map(({ tag, n }) => (
          <button
            key={tag}
            aria-pressed={value === tag}
            onClick={() => onPick(value === tag ? null : tag)}
            style={{ ...S.tag, ...(value === tag ? S.on : null) }}
          >
            {tag}<span style={S.n}>{n}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const S = {
  card: {
    position: 'fixed', right: 20, bottom: 78,
    zoom: 'var(--ts, 1)', outline: 'none',
    width: 'min(360px, calc(84vw / var(--ts, 1)))',
    maxHeight: 'calc(62vh / var(--ts, 1))', overflowY: 'auto',
    background: 'linear-gradient(168deg, #FBF3E2, #EFE3C9)', color: '#2b2519',
    padding: '22px 22px 18px', boxSizing: 'border-box',
    boxShadow: '0 30px 70px rgba(0,0,0,.7)', transform: 'rotate(.4deg)',
    fontFamily: 'Georgia, "Iowan Old Style", serif',
  },
  tape: {
    position: 'absolute', top: -10, left: 26, width: 74, height: 20,
    transform: 'rotate(-2deg)', background: 'rgba(226,214,186,.85)',
    boxShadow: '0 1px 3px rgba(0,0,0,.25)',
  },
  kicker: {
    fontFamily: 'system-ui, sans-serif', fontSize: 10, letterSpacing: '.3em',
    textTransform: 'uppercase', color: '#6b5f47', // 4.9:1 on the cream
  },
  lede: { fontSize: 12.5, lineHeight: 1.5, color: '#5a5142', margin: '10px 0 14px' },
  tags: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  tag: {
    cursor: 'pointer', background: 'rgba(140,43,38,.05)',
    border: '1px solid rgba(90,78,56,.28)', color: '#3b352a',
    font: 'inherit', fontSize: 12.5, padding: '4px 9px', display: 'inline-flex',
    alignItems: 'baseline', gap: 6,
  },
  on: { background: '#8c2b26', borderColor: '#8c2b26', color: '#FBF3E2' },
  n: { fontFamily: 'system-ui, sans-serif', fontSize: 9.5, opacity: .8 },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  row: { display: 'flex', gap: 6 },
  btn: {
    cursor: 'pointer', background: 'none', border: '1px solid rgba(90,78,56,.3)',
    color: '#6d6552', fontFamily: 'system-ui, sans-serif', fontSize: 10,
    letterSpacing: '.16em', textTransform: 'uppercase', padding: '5px 9px',
  },
}
