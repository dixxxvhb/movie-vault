import { useEffect } from 'react'
import { get as getSetting } from '../../settings.js'
import { claimFlash } from '../../flashPolicy.js'
import { playOneShot } from '../audio/engine.js'

// THE KIT: the Arrival's title card (docs/VAULT-TWO-SCENE-STANDARD.md §2).
// Black, a sound cue, a full-screen card in the film's own register, then a
// cut to the Arrival scene (the caller's onDone flies the rig into its push).
//
// Skipped by ?nocold and ?spot= (the harness, deep links) and by
// motion.coldOpen = false. ?arrival forces it for a check. Any key or tap ends
// it. The cut from black is a full-view luminance event, so it asks the flash
// budget under `flashKey`; if the budget says no, it fades instead.
//
// Plain DOM on document.body, driven by timers: this lives inside the Canvas,
// where a DOM portal would land behind WebGL, and a pane that is not ticking
// animation frames still runs timers.
//
// Props:
//   kicker, title   the two lines (e.g. 'CHAPTER SIX', 'A Guest in Paris')
//   kickerFont, titleFont, color, background   the film's own type and colours
//   cue             a oneshot name played as a rattle under the black ('tick')
//   hold            ms the card stays up

export function arrivalWanted() {
  const q = window.location.search
  if (q.includes('arrival')) return true
  if (q.includes('nocold') || q.includes('spot=')) return false
  return getSetting('motion.coldOpen') !== false
}

const HOLD_BLACK = 700
const FADE_OUT = 650

export default function ArrivalCard({
  kicker, title, onDone, flashKey = 'arrival',
  kickerFont = "600 clamp(14px,1.6vw,20px)/1 'Josefin Sans',system-ui,sans-serif",
  titleFont = "italic 700 clamp(40px,7vw,104px)/1.02 'Bodoni Moda',Georgia,serif",
  color = '#f4efe6', background = '#000', cue = 'tick', hold = 3400,
}) {
  useEffect(() => {
    const el = document.createElement('div')
    el.setAttribute('role', 'img')
    el.setAttribute('aria-label', [kicker, title].filter(Boolean).join(': '))
    el.style.cssText = `position:fixed;inset:0;z-index:2000;background:${background};display:flex;flex-direction:column;` +
      'align-items:center;justify-content:center;opacity:1;cursor:pointer'
    const card = document.createElement('div')
    card.style.cssText = `opacity:0;transition:opacity 500ms ease-in;text-align:center;color:${color};padding:0 24px`
    if (kicker) {
      const k = document.createElement('div')
      k.style.cssText = `font:${kickerFont};letter-spacing:.42em;margin-bottom:1.6em`
      k.textContent = kicker
      card.appendChild(k)
    }
    const t = document.createElement('div')
    t.style.cssText = `font:${titleFont}`
    t.textContent = title
    card.appendChild(t)
    el.appendChild(card)
    document.body.appendChild(el)

    const timers = []
    const at = (ms, fn) => timers.push(setTimeout(fn, ms))
    // The room builds while this card is up, and that can freeze the main
    // thread for seconds; timers keep counting through a freeze, so a plain
    // setTimeout hold would show the card late and cut it short. Instead the
    // card appears on the first painted frame after the black, and the hold
    // only counts frames that actually painted (each capped at 50 ms). A hard
    // cap still ends it in a preview pane that isn't ticking frames.
    // the rattle plays under the black, before the card
    if (cue) for (let i = 0; i < 9; i++) at(120 + i * 62, () => playOneShot(cue, { gain: 0.5 }))
    let shownFor = 0, last = 0, raf = 0, showing = false
    const tick = (now) => {
      if (ended) return
      if (showing) { shownFor += Math.min(50, now - last); if (shownFor >= hold) { end(); return } }
      last = now
      raf = requestAnimationFrame(tick)
    }
    at(HOLD_BLACK, () => requestAnimationFrame((now) => {
      card.style.opacity = '1'; showing = true; last = now
      raf = requestAnimationFrame(tick)
    }))
    at(HOLD_BLACK + hold + 8000, () => end())

    let ended = false
    function end() {
      if (ended) return
      ended = true
      const cut = claimFlash(flashKey, 1) > 0
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
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      window.removeEventListener('keydown', skip)
      el.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
