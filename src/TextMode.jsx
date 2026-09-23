import React, { useMemo, useState } from 'react'
import * as LE_GAMAAR from './rooms/bespoke/basterds/content.js'

// ?text — the whole Vault as a document.
//
// A WebGL canvas has no accessibility tree. You can put an aria-label on it
// and a screen reader will announce one element, and that is the entire
// story: 47 films, 64 archive prints, 45 quotes and a score axis, all
// unreachable. Adding focusable DOM proxies for every object in the room is
// worth doing and is not enough on its own, because the spatial metaphor
// itself carries meaning that a proxy cannot narrate.
//
// So this is the other half. The room is a rendering of public/vault-data.json;
// this is the same JSON rendered as a document. It is not a consolation
// prize and it is not a fallback. It is arguably the truer artifact: the
// ledger, readable, sortable, linkable, quotable, and complete. Everything
// the 3D world knows is here, minus the room.
//
// It costs one route and no new data, which is the point.

const WRAP = {
  maxWidth: 46 + 'rem',
  margin: '0 auto',
  padding: '3rem 1.25rem 6rem',
  color: '#EDE6D8',
  font: '16px/1.65 ui-serif, Georgia, "Times New Roman", serif',
}

const H = {
  font: '600 1.55rem/1.25 ui-serif, Georgia, serif',
  margin: '3.5rem 0 0.4rem',
  letterSpacing: '0.01em',
}

const SUB = { color: '#9A9081', font: '0.86rem/1.5 ui-sans-serif, system-ui, sans-serif', margin: '0 0 1.4rem' }
const LINK = { color: '#D8B87A' }

function fmt(n) {
  return typeof n === 'number' ? n.toFixed(1) : n
}

// The score axis is the one thing in this project that is never explained,
// on the theory that the pencil rules teach it. In a document there are no
// pencil rules, so it gets said in a sentence.
const AXIS_NOTE =
  'Higher means he liked it more. The number is out of ten, to one decimal, ' +
  'and it was written the night he watched the film. Sideways position on the ' +
  'wall in the 3D version means nothing at all.'

// A bespoke room that teaches the film (Le Gamaar, plan §12d) says the same
// things here in words: the chapters in order, then the cast with who played
// them and what happens to them. Rooms opt in through ROOM_DOCS; the content
// module is plain data, so this costs the ?text bundle a few KB and no 3D.
const ROOM_DOCS = { 'inglourious-basterds': LE_GAMAAR }

function RoomDoc({ doc, cast }) {
  const actor = (id) => (cast || []).find((p) => p.id === id)?.name
  return (
    <details style={{ margin: '0.8rem 0 0' }}>
      <summary style={{ cursor: 'pointer', color: '#D8B87A' }}>
        Inside the room: {doc.FILM.place}, {doc.FILM.when}
      </summary>
      <h4 style={{ font: '600 1rem ui-serif, Georgia, serif', margin: '1rem 0 0.4rem' }}>The five chapters</h4>
      <ol style={{ paddingLeft: '1.2rem' }}>
        {doc.CHAPTERS.map((c) => (
          <li key={c.n} style={{ margin: '0 0 0.9rem' }}>
            <strong>{c.title}</strong> <span style={{ color: '#9A9081' }}>({c.where}, {c.when})</span>
            <br />{c.recap}
          </li>
        ))}
      </ol>
      <h4 style={{ font: '600 1rem ui-serif, Georgia, serif', margin: '1rem 0 0.4rem' }}>Who is in it</h4>
      <ul style={{ paddingLeft: '1.2rem' }}>
        {doc.CHARACTERS.map((c) => (
          <li key={c.id} style={{ margin: '0 0 0.5rem' }}>
            <strong>{c.name}</strong>{actor(c.cast) ? ', played by ' + actor(c.cast) : ''}. {c.who} {c.fate}
          </li>
        ))}
      </ul>
      <h4 style={{ font: '600 1rem ui-serif, Georgia, serif', margin: '1rem 0 0.4rem' }}>What really happened</h4>
      <ul style={{ paddingLeft: '1.2rem' }}>
        {doc.HISTORY.map((h) => <li key={h} style={{ margin: '0 0 0.5rem' }}>{h}</li>)}
      </ul>
    </details>
  )
}

function Films({ films, cast }) {
  const [sort, setSort] = useState('score')
  const rows = useMemo(() => {
    const r = [...films]
    if (sort === 'score') r.sort((a, b) => b.score - a.score)
    if (sort === 'title') r.sort((a, b) => a.title.localeCompare(b.title))
    if (sort === 'date') r.sort((a, b) => String(b.watched || '').localeCompare(String(a.watched || '')))
    return r
  }, [films, sort])

  return (
    <section aria-labelledby="ledger-h">
      <h2 id="ledger-h" style={H}>The Ledger</h2>
      <p style={SUB}>
        {films.length} films he scored the night he watched them. {AXIS_NOTE}
      </p>
      <div role="group" aria-label="Sort the ledger" style={{ margin: '0 0 1rem' }}>
        {['score', 'title', 'date'].map((k) => (
          <button
            key={k}
            onClick={() => setSort(k)}
            aria-pressed={sort === k}
            style={{
              font: '0.82rem ui-sans-serif, system-ui, sans-serif',
              background: sort === k ? '#3A3226' : 'transparent',
              color: '#EDE6D8',
              border: '1px solid #5A5040',
              padding: '0.35rem 0.7rem',
              marginRight: '0.4rem',
              cursor: 'pointer',
            }}
          >
            by {k}
          </button>
        ))}
      </div>
      {rows.map((f) => (
        <article key={f.slug} id={'film-' + f.slug} style={{ margin: '0 0 2.2rem' }}>
          <h3 style={{ font: '600 1.1rem ui-serif, Georgia, serif', margin: '0 0 0.15rem' }}>
            {f.title} <span style={{ color: '#9A9081', fontWeight: 400 }}>({f.year})</span>{' '}
            <span aria-label={'scored ' + fmt(f.score) + ' out of ten'}>{fmt(f.score)}</span>
          </h3>
          <p style={{ ...SUB, margin: '0 0 0.5rem' }}>
            {[f.watched, f.runtime && f.runtime + ' min', (f.director || []).join(', '),
              (f.genres || []).join(', '), f.rewatch ? 'rewatch' : null]
              .filter(Boolean).join(' · ')}
          </p>
          {f.context ? <p style={{ margin: '0 0 0.5rem', color: '#B8AE9C' }}>{f.context}</p> : null}
          {/* Verbatim. Profanity and typos intact, exactly as on the wall. */}
          {f.hot_take ? <blockquote>{f.hot_take}</blockquote> : null}
          {/* The case file. It repeats the title, year and score in its own
              header, which is right on a wall and redundant in a document, so
              the stylesheet below hides that header rather than the panel
              being re-authored. The plot, the verdict and the "more from the
              chat" blocks are the reason it is here. */}
          {f.panel ? <div className="casefile" dangerouslySetInnerHTML={{ __html: f.panel }} /> : null}
          {ROOM_DOCS[f.slug] ? <RoomDoc doc={ROOM_DOCS[f.slug]} cast={cast?.[f.slug]} /> : null}
        </article>
      ))}
    </section>
  )
}

function Archive({ shoebox, drawer }) {
  return (
    <>
      <section aria-labelledby="shoebox-h">
        <h2 id="shoebox-h" style={H}>The Shoebox</h2>
        <p style={SUB}>
          {shoebox.length} films he has seen but did not score the night of, so he scored them
          later from memory. A remembered score and a recorded score are different currencies
          and are never measured against each other.
        </p>
        <ul>
          {shoebox.map((f) => (
            <li key={f.slug} style={{ margin: '0 0 0.7rem' }}>
              <strong>{f.title}</strong> {f.year ? '(' + f.year + ')' : ''}{' '}
              {f.memory != null ? <span>remembered at {fmt(f.memory)}</span> : null}
              {f.snap ? <div style={{ color: '#B8AE9C' }}>{f.snap}</div> : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="drawer-h">
        <h2 id="drawer-h" style={H}>The Dark Drawer</h2>
        <p style={SUB}>
          {drawer.length} films he has seen and cannot score. Frames that were never developed.
          There is no number here, and that absence is the record.
        </p>
        <ul>
          {drawer.map((f) => (
            <li key={f.slug} style={{ margin: '0 0 0.5rem' }}>
              <strong>{f.title}</strong> {f.year ? '(' + f.year + ')' : ''}
              {f.snap ? <div style={{ color: '#B8AE9C' }}>{f.snap}</div> : null}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

// The case files are authored as standalone HTML for a wall, so they arrive
// with their own header and no stylesheet. Rather than re-authoring 47 of
// them, this makes them behave as document prose: the duplicate header goes,
// the plot and the verdict get room, and the attributed "more from the chat"
// blocks read as the asides they are.
const CASEFILE_CSS = `
.casefile .no, .casefile .head { display: none; }
.casefile .meta { color: #9A9081; font: 0.86rem/1.5 ui-sans-serif, system-ui, sans-serif;
  margin: 0 0 0.8rem; }
.casefile p { margin: 0 0 0.9rem; }
.casefile .verdict { color: #DCD3C2; }
.casefile blockquote { margin: 0.6rem 0; padding-left: 0.9rem; border-left: 2px solid #5A5040; }
.casefile b, .casefile strong { color: #D8B87A; font-weight: 600; }
blockquote { margin: 0 0 0.6rem; padding-left: 0.9rem; border-left: 2px solid #5A5040; }
a:focus-visible, button:focus-visible {
  outline: 3px solid #56B4E9; outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
`

export default function TextMode({ data }) {
  if (!data) return null
  const { films = [], shoebox = [], drawer = [], queue = [], lessons = [], links = [], quotes = [] } = data

  return (
    <main style={WRAP}>
      <style>{CASEFILE_CSS}</style>
      <a href="?" style={{ ...LINK, font: '0.85rem ui-sans-serif, system-ui, sans-serif' }}>
        Back to the room
      </a>
      <h1 style={{ font: '400 2.4rem/1.15 ui-serif, Georgia, serif', margin: '1.2rem 0 0.3rem' }}>The Vault</h1>
      <p style={SUB}>
        {data.count} films scored, averaging {data.avg}. This is the same ledger the 3D room
        renders, written out. Nothing is missing except the room.
      </p>

      <nav aria-label="Sections" style={{ margin: '0 0 1rem' }}>
        <ul style={{ listStyle: 'none', padding: 0, font: '0.9rem ui-sans-serif, system-ui, sans-serif' }}>
          {[['ledger-h', 'The Ledger'], ['shoebox-h', 'The Shoebox'], ['drawer-h', 'The Dark Drawer'],
            ['queue-h', 'The Door'], ['mirror-h', 'The Mirror'], ['links-h', 'Bloodlines'],
            ['quotes-h', 'Quotes']].map(([id, label]) => (
            <li key={id}><a href={'#' + id} style={LINK}>{label}</a></li>
          ))}
        </ul>
      </nav>

      <Films films={films} cast={data.cast} />
      <Archive shoebox={shoebox} drawer={drawer} />

      <section aria-labelledby="queue-h">
        <h2 id="queue-h" style={H}>The Door</h2>
        <p style={SUB}>{queue.length} films queued. What is next.</p>
        <ol>
          {queue.map((q, i) => (
            <li key={i} style={{ margin: '0 0 0.7rem' }}>
              <strong>{q.title}</strong> {q.year ? '(' + q.year + ')' : ''}
              {q.reason ? <div style={{ color: '#B8AE9C' }}>{q.reason}</div> : null}
              {q.where ? <div style={SUB}>{q.where}</div> : null}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="mirror-h">
        <h2 id="mirror-h" style={H}>The Mirror</h2>
        <p style={SUB}>
          {lessons.length} rules about his taste, derived from the films above. Each one was
          learned from something on the wall.
        </p>
        <ul>
          {lessons.map((l, i) => <li key={i} style={{ margin: '0 0 0.9rem' }}>{l.rule}</li>)}
        </ul>
      </section>

      <section aria-labelledby="links-h">
        <h2 id="links-h" style={H}>Bloodlines</h2>
        <p style={SUB}>
          {links.length} connections he drew between films himself. In the room these light up
          in red while you hold a film. Here they are just written down.
        </p>
        <ul>
          {links.map((l, i) => (
            <li key={i} style={{ margin: '0 0 0.9rem' }}>
              <strong>{l.from}</strong> {l.directional ? '→' : '↔'} <strong>{l.to}</strong>{' '}
              <span style={{ color: '#9A9081' }}>({l.relation})</span>
              {l.note ? <div style={{ color: '#B8AE9C' }}>{l.note}</div> : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="quotes-h">
        <h2 id="quotes-h" style={H}>Quotes</h2>
        <p style={SUB}>{quotes.length} lines he kept.</p>
        <ul>
          {quotes.map((q, i) => (
            <li key={i} style={{ margin: '0 0 0.7rem' }}>
              &ldquo;{q.quote}&rdquo;
              <div style={SUB}>{[q.said_by, q.film].filter(Boolean).join(' · ')}</div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
