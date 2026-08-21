import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { sheetOf, rgba } from './palette.js'
import { useInXR } from './xr.jsx'

// The reading layer.
//
// It used to be a fixed panel bolted to the right edge of the screen: a flat
// white slab in the same cream for all 34 films, floating over the render with
// no relationship to the room. It read as a website that had opened on top of a
// game, and Dixon's note was exactly that — the pop-ups take you out of the
// world completely.
//
// So the sheet is now a THING IN THE ROOM. It hangs beside the Polaroid you
// took down, in world space, at an angle, and the camera has already flown to
// where you can read it. Turn away and it stays where it is, because it is
// paper on a wall and not a modal.
//
// It is still DOM, deliberately: drei's <Html transform> puts real HTML on a
// real plane in the scene, so it keeps perspective and occlusion sense while
// the prose stays crisp, selectable and scrollable at any zoom. A canvas
// texture would turn every paragraph to mush at reading distance.
//
// And it is printed in the FILM'S OWN palette — bg/fg/sub/acc come straight
// from film_ledger_panels, so Barbarian's file is a near-black sheet with a
// blood accent and The Nice Guys' is warm 70s card stock. See palette.js for
// the legibility guard.

// px of authored layout -> metres of paper.
// drei's transform mode divides the object basis by 40 (distanceFactor/400)
// while leaving translation in world units, so one CSS px = scale/40 metres.
// 430px of sheet at scale 0.0465 is a 0.50m sheet — A3-ish, pinned open.
const SCALE = 0.0235
const SHEET_PX = 430

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

export default function CaseFile({ film, links, anchor, onClose, onJump, onEnter }) {
  const body = useTypeset(film.panel)
  const [show, setShow] = useState(false)
  const scroller = useRef(null)
  const P = useMemo(() => sheetOf(film.palette), [film.palette])
  // Entering a film's room is Phase 1's headset boundary: the rig stands
  // down in XR and there is nowhere for "step inside" to fly the camera to,
  // so the affordance simply does not exist there (Phase 3+ item).
  const inXR = useInXR()

  // let the camera get most of the way there before the paper appears —
  // arriving and the sheet arriving at once reads as a pop-up again
  useEffect(() => {
    setShow(false)
    const t = setTimeout(() => setShow(true), 300)
    return () => clearTimeout(t)
  }, [film.slug])

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0
  }, [film.slug])

  const kin = links.filter((l) => l.from === film.slug || l.to === film.slug)
  const [x, y, z] = anchor

  return (
    <Html
      transform
      // beside the card, turned in toward the reader
      position={[x + 0.375, y - 0.045, z + 0.30]}
      rotation={[0, -0.34, 0.008]}
      scale={SCALE}
      zIndexRange={[12, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <style>{`
        .cf-body p { margin: 0 0 14px; }
        .cf-body p:last-child { margin-bottom: 0; }
        .cf-body .take {
          border-left: 3px solid ${P.acc};
          padding: 2px 0 2px 14px;
          font-style: italic; opacity: .92;
        }
        .cf-body .meta {
          font-family: system-ui, sans-serif; font-size: 11px;
          letter-spacing: .07em; text-transform: uppercase; color: ${P.sub};
        }
        .cf-body strong { font-weight: 700; }
        .cf-sheet::-webkit-scrollbar { width: 7px; }
        .cf-sheet::-webkit-scrollbar-thumb { background: ${rgba(P.ink, .22)}; }
        .cf-sheet::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div
        className="cf-sheet"
        ref={scroller}
        style={{
          width: SHEET_PX,
          maxHeight: 520,
          overflowY: 'auto',
          pointerEvents: 'auto',
          opacity: show ? 1 : 0,
          transition: 'opacity .5s ease',
          position: 'relative',
          padding: '26px 30px 30px',
          boxSizing: 'border-box',
          color: P.ink,
          fontFamily: 'Georgia, "Iowan Old Style", serif',
          background: `linear-gradient(158deg, ${P.paper} 0%, ${P.paper} 58%, ${P.paper2} 100%)`,
          border: `1px solid ${P.edge}`,
          // the sheet sits ON the wall: a real drop shadow is what seats it
          boxShadow: P.dark
            ? '0 26px 60px rgba(0,0,0,.85), 0 1px 0 rgba(255,255,255,.06) inset'
            : '0 26px 60px rgba(0,0,0,.7), 0 1px 0 rgba(255,255,255,.5) inset',
        }}
      >
        {/* the film's own glyph, printed into the stock */}
        {P.glyph && (
          <div
            style={{
              position: 'absolute', top: 96, right: 6, fontSize: 220, lineHeight: 1,
              color: P.acc, opacity: P.dark ? 0.1 : 0.085, pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {P.glyph}
          </div>
        )}

        <div style={{ position: 'relative' }}>
          {/* the score is stamped in the corner, over the glyph, the way a
              number gets written on a file rather than typeset into it */}
          <div style={{
            position: 'absolute', top: -4, right: 0, fontSize: 34, fontWeight: 700,
            color: P.acc, lineHeight: 1,
          }}>
            {film.score.toFixed(1)}
          </div>

          <div style={{
            fontFamily: 'system-ui, sans-serif', fontSize: 10, letterSpacing: '.3em',
            textTransform: 'uppercase', color: P.acc, marginBottom: 14,
          }}>
            case file
          </div>

          <div style={{ fontSize: 26, fontStyle: 'italic', lineHeight: 1.14, paddingRight: 66 }}>
            {film.title}
          </div>

          <div style={{
            fontFamily: 'system-ui, sans-serif', fontSize: 11, letterSpacing: '.06em',
            color: P.sub, marginTop: 9, textTransform: 'uppercase',
          }}>
            {[
              film.year,
              film.director?.join(', '),
              film.runtime ? film.runtime + ' min' : null,
              'watched ' + film.watched,
            ].filter(Boolean).join('  ·  ')}
          </div>

          <div style={{ height: 1, background: rgba(P.ink, 0.18), margin: '16px 0 0' }} />

          {body
            ? <div className="cf-body" style={{ marginTop: 18, fontSize: 15, lineHeight: 1.62 }}
                   dangerouslySetInnerHTML={{ __html: body }} />
            : <div style={{ marginTop: 18, fontSize: 14, color: P.sub, fontStyle: 'italic' }}>
                No case file written for this one yet.
              </div>}

          {kin.length > 0 && (
            <div style={{ marginTop: 24, borderTop: `1px solid ${rgba(P.ink, 0.18)}`, paddingTop: 15 }}>
              <div style={{
                fontFamily: 'system-ui, sans-serif', fontSize: 10, letterSpacing: '.26em',
                textTransform: 'uppercase', color: P.sub, marginBottom: 11,
              }}>
                pinned to
              </div>
              {kin.map((l, i) => {
                const otherSlug = l.from === film.slug ? l.to : l.from
                return (
                  <button
                    key={i}
                    onClick={() => onJump(otherSlug)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                      background: rgba(P.acc, 0.07), border: `1px solid ${rgba(P.acc, 0.3)}`,
                      borderLeft: `3px solid ${P.acc}`, padding: '8px 11px', marginBottom: 7,
                      font: 'inherit', color: P.ink,
                    }}
                  >
                    <span style={{
                      display: 'block', fontFamily: 'system-ui, sans-serif', fontSize: 10,
                      letterSpacing: '.14em', textTransform: 'uppercase', color: P.acc,
                    }}>
                      {l.relation}
                    </span>
                    <span style={{ display: 'block', fontSize: 13, marginTop: 3, lineHeight: 1.42 }}>
                      {l.note || 'linked'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                cursor: 'pointer', background: 'none',
                border: `1px solid ${rgba(P.ink, 0.32)}`, color: P.sub,
                fontFamily: 'system-ui, sans-serif', fontSize: 10.5, letterSpacing: '.2em',
                textTransform: 'uppercase', padding: '9px 15px',
              }}
            >
              put it back
            </button>

            {/* the portal. Masking-tape tab, same paper language as the
                sheet it hangs off of — this is how you walk INTO the
                photo rather than just reading its back. */}
            {!inXR && (
              <button
                onClick={() => onEnter?.(film.slug)}
                style={{
                  cursor: 'pointer', background: rgba(P.acc, 0.14),
                  border: `1px solid ${rgba(P.acc, 0.5)}`, color: P.acc,
                  fontFamily: 'system-ui, sans-serif', fontSize: 10.5, letterSpacing: '.2em',
                  textTransform: 'uppercase', padding: '9px 15px', fontWeight: 700,
                }}
              >
                step inside
              </button>
            )}
          </div>
        </div>
      </div>
    </Html>
  )
}
