import { useEffect } from 'react'
import { get as getSetting } from '../../../settings.js'
import { claimFlash } from '../../../flashPolicy.js'
import { playOneShot } from '../../audio/engine.js'

// CHAPTER SIX: A GUEST IN PARIS. Plan §0.2, wow target 1.
//
// The film tells itself in five chapters. Walking into its cinema is the
// sixth, and the visitor is the one it is about. Black, a projector's rattle,
// the chapter card in the film's own register (white on black), then a hard
// cut to the street in the rain and a slow push toward the doors.
//
// Skipped by ?nocold and ?spot= (the harness, deep links) and by
// motion.coldOpen = false. ?arrival forces it for a check. Any key or tap ends
// it. The cut from black is a full-view luminance event, so it asks the flash
// budget; if the budget says no, it fades instead.
//
// Plain DOM on document.body, driven by timers: this component lives inside
// the Canvas, where a DOM portal would land behind the WebGL layer, and a pane
// that is not ticking animation frames still runs timers.

const HOLD_BLACK = 700
const HOLD_CARD = 3400
const FADE_OUT = 650

export function arrivalWanted() {
  const q = window.location.search
  if (q.includes('arrival')) return true
  if (q.includes('nocold') || q.includes('spot=')) return false
  return getSetting('motion.coldOpen') !== false
}

export default function ArrivalCard({ onDone }) {
  useEffect(() => {
    const el = document.createElement('div')
    el.setAttribute('role', 'img')
    el.setAttribute('aria-label', 'Chapter six: a guest in Paris')
    el.style.cssText = 'position:fixed;inset:0;z-index:2000;background:#000;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;opacity:1;cursor:pointer'
    el.innerHTML =
      '<div data-card style="opacity:0;transition:opacity 500ms ease-in;text-align:center;color:#f4efe6;padding:0 24px">' +
      '<div style="font:600 clamp(14px,1.6vw,20px)/1 \'Josefin Sans\',system-ui,sans-serif;letter-spacing:.42em;margin-bottom:1.6em">CHAPTER SIX</div>' +
      '<div style="font:italic 700 clamp(40px,7vw,104px)/1.02 \'Bodoni Moda\',Georgia,serif">A Guest in Paris</div>' +
      '</div>'
    document.body.appendChild(el)
    const card = el.querySelector('[data-card]')

    const timers = []
    const at = (ms, fn) => timers.push(setTimeout(fn, ms))
    for (let i = 0; i < 9; i++) at(120 + i * 62, () => playOneShot('tick', { gain: 0.5 }))
    at(HOLD_BLACK, () => { card.style.opacity = '1' })
    at(HOLD_BLACK + HOLD_CARD, end)

    let ended = false
    function end() {
      if (ended) return
      ended = true
      const cut = claimFlash('basterds-arrival', 1) > 0
      el.style.transition = cut ? 'opacity 60ms linear' : `opacity ${FADE_OUT}ms ease-out`
      el.style.opacity = '0'
      el.style.pointerEvents = 'none'
      onDone && onDone()
      timers.push(setTimeout(() => el.remove(), FADE_OUT + 80))
    }
    const skip = (e) => {
      if (e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return
      end()
    }
    window.addEventListener('keydown', skip)
    el.addEventListener('pointerdown', skip)
    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener('keydown', skip)
      el.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
