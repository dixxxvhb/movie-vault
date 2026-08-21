// The develop-bloom animation itself (brief §3: "a rewatch is the chemical
// bath"). Runs once per room instance, from either developBus.js's
// `?develop=<slug>` query or its `triggerDevelop(slug)` export. Interpolates
// the room's own faded grade toward archiveConfig.js's developedGradeFor()
// over ~3s, published two ways at once so both halves of "the existing grade
// pipeline" actually move:
//
//  - gradeBus.setGradeOverride — the Post pass (sat/contrast/grain/
//    vignette/bg), the same one-way pipe every other room already uses to
//    reach App.jsx without rooms/* importing it.
//  - the returned config clone — GenericRoom's own key/fill point lights
//    read config.grade directly (they are NOT gradeBus-aware, only the Post
//    pass is), so FadedRoom hands this live-interpolated config down
//    instead of the static one it was given, and the room's actual light
//    output ramps too ("key lights ramp in", not just the color grade).
//
// Never reverts mid-visit once triggered — certifying is permanent, not a
// flicker — and any input skips straight to the end (Develop.jsx's own rule:
// nobody should be stuck behind an animation because they moved the mouse).
import { useEffect, useRef, useState } from 'react'
import { setGradeOverride, clearGradeOverride } from '../gradeBus.js'
import { developQuerySlug, subscribeDevelop } from './developBus.js'
import { developedGradeFor } from './archiveConfig.js'

const DURATION = 3000
const GRAIN_TAIL_MS = 900 // grain settles a beat slower than everything else — Develop.jsx's own "chemical bath" read
// the pre-develop dip: a hair dustier/darker than fadedConfigFor's own
// numbers so the bloom has somewhere visible to climb FROM even on a room
// whose faded grade already reads close to its own preset
const FADED_EXTRA = { grain: 0.11, vignette: 0.72, bloomIntensity: 0.08 }

function lerp(a, b, t) { return a + (b - a) * t }
function smoothstep(t) { return t * t * (3 - 2 * t) }
function lerpHex(a, b, t) {
  const pa = parseInt((a || '#000000').slice(1), 16)
  const pb = parseInt((b || '#000000').slice(1), 16)
  const c = (shift) => Math.round(lerp((pa >> shift) & 255, (pb >> shift) & 255, t))
  return '#' + [c(16), c(8), c(0)].map((v) => v.toString(16).padStart(2, '0')).join('')
}

export function useRoomDevelop(config, item, slug) {
  const [liveGrade, setLiveGrade] = useState(null)
  const rafRef = useRef(null)
  const startedRef = useRef(false)

  useEffect(() => {
    let disposed = false
    let removeInputListeners = () => {}

    function begin() {
      if (startedRef.current || disposed || !slug) return
      startedRef.current = true
      const from = config.grade
      const to = developedGradeFor(item)
      const t0 = performance.now()

      function apply(t) {
        const e = smoothstep(t)
        const grainT = smoothstep(Math.min(1, (performance.now() - t0) / (DURATION + GRAIN_TAIL_MS)))
        const g = {
          ...to,
          bg: lerpHex(from.bg, to.bg, e),
          fogColor: lerpHex(from.fogColor, to.fogColor, e),
          key: lerpHex(from.key, to.key, e),
          fill: lerpHex(from.fill, to.fill, e),
          keyIntensity: lerp(from.keyIntensity ?? 0.9, to.keyIntensity, e),
          ambient: lerp(from.ambient ?? 0.06, to.ambient, e),
          sat: lerp(from.sat ?? -0.94, to.sat, e),
          contrast: lerp(from.contrast ?? -0.05, to.contrast, e),
          fogDensity: lerp(from.fogDensity ?? 0.08, to.fogDensity, e),
          grain: lerp(FADED_EXTRA.grain, to.grain, grainT),
          vignette: lerp(FADED_EXTRA.vignette, to.vignette, e),
          bloomIntensity: lerp(FADED_EXTRA.bloomIntensity, to.bloomIntensity, e),
        }
        setGradeOverride(g)
        setLiveGrade(g)
        return t >= 1
      }

      const evts = ['pointerdown', 'keydown', 'wheel']
      function finish() {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        apply(1)
        removeInputListeners()
        removeInputListeners = () => {}
      }
      evts.forEach((e) => window.addEventListener(e, finish, { once: true, passive: true }))
      removeInputListeners = () => evts.forEach((e) => window.removeEventListener(e, finish))

      function tick(now) {
        const t = Math.min(1, (now - t0) / DURATION)
        const done = apply(t)
        if (!done) rafRef.current = requestAnimationFrame(tick)
        else { removeInputListeners(); removeInputListeners = () => {} }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    if (developQuerySlug() === slug) begin()
    const unsub = subscribeDevelop((s) => { if (s === slug) begin() })

    return () => {
      disposed = true
      unsub()
      removeInputListeners()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      clearGradeOverride()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  if (!liveGrade) return config
  return { ...config, grade: liveGrade }
}
