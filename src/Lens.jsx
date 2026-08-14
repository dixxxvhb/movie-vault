import React, { useMemo } from 'react'

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

export default function Lens({ vibes, value, onPick, onClose }) {
  if (!vibes.length) return null
  return (
    <div style={S.card}>
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
        it goes dark — the wall keeps its shape, so you see where that taste
        actually sits in the scores.
      </p>
      <div style={S.tags}>
        {vibes.map(({ tag, n }) => (
          <button
            key={tag}
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
    position: 'fixed', right: 20, bottom: 78, width: 'min(360px, 84vw)',
    maxHeight: '62vh', overflowY: 'auto',
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
    textTransform: 'uppercase', color: '#a2947a',
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
  n: { fontFamily: 'system-ui, sans-serif', fontSize: 9.5, opacity: .6 },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  row: { display: 'flex', gap: 6 },
  btn: {
    cursor: 'pointer', background: 'none', border: '1px solid rgba(90,78,56,.3)',
    color: '#6d6552', fontFamily: 'system-ui, sans-serif', fontSize: 10,
    letterSpacing: '.16em', textTransform: 'uppercase', padding: '5px 9px',
  },
}
