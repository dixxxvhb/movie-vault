import React, { useEffect, useMemo, useRef, useState } from 'react'

// FIND.
//
// There are a hundred and twenty-odd films in this room across four places —
// the Ledger wall, the shoebox, the nightstand drawer, the queue by the door —
// and until now the only way to answer "is Interstellar in here" was to walk
// around and look. Press / and type instead; picking a result takes you to
// wherever that film physically is, opens the box if it is in one, and holds
// it up.

const WHERE = {
  ledger: 'on the wall',
  shoebox: 'in the shoebox',
  drawer: 'in the dark drawer',
  queue: 'queued by the door',
}

function score(title, q) {
  const t = title.toLowerCase()
  if (t === q) return 0
  if (t.startsWith(q)) return 1
  // word-start beats mid-word, so "silver" finds Under the Silver Lake before
  // it finds anything that merely contains the letters
  if (new RegExp('\\b' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(t)) return 2
  if (t.includes(q)) return 3
  return -1
}

export function buildIndex(data) {
  if (!data) return []
  const out = []
  for (const f of data.films || []) {
    out.push({ kind: 'ledger', slug: f.slug, title: f.title, year: f.year, note: f.score.toFixed(1) })
  }
  for (const a of data.shoebox || []) {
    out.push({ kind: 'shoebox', slug: a.slug, title: a.title, year: a.year,
               note: a.memory != null ? a.memory.toFixed(1) + ' from memory' : null })
  }
  for (const a of data.drawer || []) {
    out.push({ kind: 'drawer', slug: a.slug, title: a.title, year: a.year, note: 'never scored' })
  }
  for (const q of data.queue || []) {
    out.push({ kind: 'queue', slug: null, title: q.title, year: q.year, note: q.where || 'queued' })
  }
  return out
}

export default function Find({ index, onGo, onClose }) {
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const input = useRef(null)

  useEffect(() => { input.current?.focus() }, [])

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return []
    return index
      .map((row) => ({ row, s: score(row.title, needle) }))
      .filter((h) => h.s >= 0)
      .sort((a, b) => a.s - b.s || a.row.title.localeCompare(b.row.title))
      .slice(0, 8)
      .map((h) => h.row)
  }, [index, q])

  useEffect(() => { setI(0) }, [q])

  const key = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); return onClose() }
    if (e.key === 'ArrowDown') { e.preventDefault(); return setI((n) => Math.min(n + 1, hits.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); return setI((n) => Math.max(n - 1, 0)) }
    if (e.key === 'Enter' && hits[i]) { e.preventDefault(); onGo(hits[i]) }
  }

  return (
    <div style={S.card} onKeyDown={key}>
      <div style={S.tape} />
      <input
        ref={input}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="find a film…"
        style={S.input}
      />
      {q.trim() && !hits.length && (
        <div style={S.none}>Not in this room. Which is its own answer.</div>
      )}
      {hits.map((h, n) => (
        <button
          key={h.kind + ':' + h.title}
          onMouseEnter={() => setI(n)}
          onClick={() => onGo(h)}
          style={{ ...S.hit, ...(n === i ? S.hitOn : null) }}
        >
          <span style={S.title}>
            {h.title}
            {h.year ? <span style={S.year}> {h.year}</span> : null}
          </span>
          <span style={S.meta}>
            {WHERE[h.kind]}{h.note ? ' · ' + h.note : ''}
          </span>
        </button>
      ))}
      <div style={S.foot}>↑↓ to move · enter to go · esc to close</div>
    </div>
  )
}

const S = {
  card: {
    position: 'fixed', top: '16%', left: '50%', transform: 'translateX(-50%) rotate(-.3deg)',
    width: 'min(430px, 88vw)',
    background: 'linear-gradient(168deg, #FBF3E2, #EFE3C9)', color: '#2b2519',
    padding: '24px 22px 16px', boxSizing: 'border-box',
    boxShadow: '0 34px 80px rgba(0,0,0,.72)',
    fontFamily: 'Georgia, "Iowan Old Style", serif',
  },
  tape: {
    position: 'absolute', top: -10, left: '50%', width: 88, height: 20,
    transform: 'translateX(-50%) rotate(1.2deg)', background: 'rgba(226,214,186,.85)',
    boxShadow: '0 1px 3px rgba(0,0,0,.25)',
  },
  input: {
    width: '100%', boxSizing: 'border-box', background: 'transparent',
    border: 'none', borderBottom: '1px solid rgba(90,78,56,.34)',
    font: 'inherit', fontSize: 21, fontStyle: 'italic', color: '#2b2519',
    padding: '0 0 8px', outline: 'none', marginBottom: 12,
  },
  none: { fontSize: 13, color: '#8d8471', fontStyle: 'italic', padding: '4px 0 8px' },
  hit: {
    display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
    background: 'none', border: 'none', borderLeft: '3px solid transparent',
    padding: '7px 10px', font: 'inherit', color: '#3b352a',
  },
  hitOn: { background: 'rgba(140,43,38,.08)', borderLeft: '3px solid #8c2b26' },
  title: { display: 'block', fontSize: 15 },
  year: { color: '#8d8471', fontSize: 13 },
  meta: {
    display: 'block', fontFamily: 'system-ui, sans-serif', fontSize: 10.5,
    letterSpacing: '.08em', textTransform: 'uppercase', color: '#a2947a', marginTop: 2,
  },
  foot: {
    fontFamily: 'system-ui, sans-serif', fontSize: 9.5, letterSpacing: '.16em',
    textTransform: 'uppercase', color: '#b3a68c', marginTop: 12, textAlign: 'right',
  },
}
