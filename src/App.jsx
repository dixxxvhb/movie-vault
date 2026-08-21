import React, { useEffect, useMemo, useState, useRef } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration, HueSaturation, BrightnessContrast } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { ROOM } from './Room.jsx'
import { STATIONS } from './CameraRig.jsx'
import { CARD_W, CARD_H } from './Polaroid.jsx'
import { setDragDistance } from './pointer.js'
import MotelWorld from './MotelWorld.jsx'
import FilmWorld from './rooms/FilmWorld.jsx'
import Develop from './rooms/Develop.jsx'
import { getRoomConfig } from './rooms/registry.js'
import ColdOpen from './ColdOpen.jsx'
import Guide from './Guide.jsx'
import Lens, { useVibes } from './Lens.jsx'
import Find, { buildIndex } from './Find.jsx'
import { startRoomTone, stopRoomTone } from './roomTone.js'
import { isSoundOn, setSoundOn } from './rooms/audio/engine.js'
import { subscribeGrade } from './rooms/gradeBus.js'
import { XR } from '@react-three/xr'
import { xrStore, XRPlayer, XRFloorZone, EnterVR, useInXR } from './xr.jsx'

const HD = ROOM.D / 2
const HW = ROOM.W / 2

// Phase 2 spec's "cold detail": Memento's own wash runs longer and settles
// its grain slower than every other film's (Develop.jsx's `slow` flag). A
// set, not a single string check, so a later bespoke room can opt in too.
const SLOW_WASH_SLUGS = new Set(['memento'])

// deterministic tiny hash -> pinned-photo jitter, stable per slug
function jitter(slug) {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) & 0xffff
  return {
    rot: ((h % 7) - 3) * 0.016,
    dy: (((h >> 3) % 5) - 2) * 0.006,
  }
}

// HEIGHT IS THE SCORE.
//
// The hang used to be a rank-ordered grid: sorted list, eight per row. That
// encodes ordinal position, not feeling — a 9.9 and a 9.5 sat side by side in
// the same row, and the distance from the best film to the worst read as "four
// rows down". You could not look at the wall and know anything.
//
// Now y maps linearly to the score itself. Same score, same height. The gap
// between two Polaroids IS the gap in how he felt about them, and the shape the
// cards make is the true shape of his taste: a crowd up in the nines, a thin
// tail, and two films alone down by the baseboard.
// The axis used to be hard-floored at 5.0, which silently CLAMPED anything
// below it — two films at 4.8 and 3.1 would have hung at exactly the same
// height and the wall would have lied. The floor now drops to whatever the real
// minimum is, and only ever drops: with today's data (min 5.2) the wall is
// pixel-identical to before, and the first sub-5 score rescales it honestly
// instead of piling up on the baseboard.
const SCORE_FLOOR_DEFAULT = 5.0
const SCORE_MAX = 10.0
const Y_FLOOR = 0.66          // lowest score hangs here
const Y_CEIL = 2.22           // a perfect 10 hangs here
const WALL_Z = -HD + 0.014
// the inspected card floats off the wall; aim a little in front of the paper
const LIFT_LOOK = 0.02

const X_STEP = CARD_W + 0.012  // horizontal pitch when cards must sit side by side
const Y_CLEAR = CARD_H * 0.86  // closer than this vertically and they collide

export function makeScoreToY(films) {
  const min = films?.length
    ? Math.min(SCORE_FLOOR_DEFAULT, ...films.map((f) => f.score))
    : SCORE_FLOOR_DEFAULT
  return (score) => {
    const t = (THREE.MathUtils.clamp(score, min, SCORE_MAX) - min) / (SCORE_MAX - min)
    return Y_FLOOR + t * (Y_CEIL - Y_FLOOR)
  }
}

// Cards that share a height would stack on top of each other, so they spread
// sideways from the centre — a beeswarm. Nothing is moved vertically to make
// room, because moving a card vertically would be lying about its score.
function layout(films, scoreToY) {
  const placed = []
  for (const film of [...films].sort((a, b) => b.score - a.score)) {
    const y = scoreToY(film.score)
    let x = 0
    for (let k = 0; k < 40; k++) {
      // 0, +1, -1, +2, -2 … keeps each cluster centred on the wall
      const step = Math.ceil(k / 2) * (k % 2 === 0 ? -1 : 1)
      x = step * X_STEP
      const clash = placed.some(
        (p) => Math.abs(p.position[1] - y) < Y_CLEAR &&
               Math.abs(p.position[0] - x) < X_STEP * 0.98
      )
      if (!clash) break
    }
    const j = jitter(film.slug)
    placed.push({
      film,
      // jitter x only — y is data, and must stay honest
      position: [x + j.dy * 0.6, y, WALL_Z],
      rotation: j.rot,
    })
  }
  return placed
}

// The whole postprocessing stack comes off in a headset. Two reasons, either one
// sufficient: a screen-space composer has no correct answer for a stereo pair
// (it runs per-eye and the grain/aberration then differ between your eyes, which
// reads as eye strain within about a minute), and the stack alone costs more
// than the entire 72fps budget allows. The room loses its bloom and grain in VR
// and gains being a place you can stand in.
// `grade` is null in the motel and a film's { hue, sat, contrast } once one
// of its rooms is open. The composer itself never unmounts across that swap
// (an EffectComposer remount is a frame of flash) — only which effects it
// carries changes.
function Post({ grade }) {
  if (useInXR()) return null
  return (
    <EffectComposer>
      {/* QA sweep 2026-08-21: 0.42/0.72 let several rooms' hot-take sheet
          (sitting close to the room's key light by default) bloom into a
          solid wash that ate the verbatim text — backed off intensity and
          raised the threshold so accents still glow but a lit card doesn't
          detonate. */}
      <Bloom intensity={0.3} luminanceThreshold={0.85} luminanceSmoothing={0.25} mipmapBlur />
      {/* barely there. At 0.0006 the fringing read as a rendering fault on
          every card edge rather than as lens character. */}
      <ChromaticAberration offset={[0.00022, 0.0003]} blendFunction={BlendFunction.NORMAL} />
      <Noise opacity={0.05} blendFunction={BlendFunction.OVERLAY} />
      <Vignette eskil={false} offset={0.24} darkness={0.92} />
      {grade && <HueSaturation hue={grade.hue || 0} saturation={grade.sat || 0} />}
      {grade && <BrightnessContrast brightness={0} contrast={grade.contrast || 0} />}
    </EffectComposer>
  )
}

export default function App() {
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState(null)   // slug being inspected
  const [station, setStation] = useState('center')
  const [hover, setHover] = useState(null)
  // the archive containers: null, 'shoebox' or 'drawer'. Only ever one open —
  // you are crouched over one box at a time.
  const [openBox, setOpenBox] = useState(null)
  const [picked, setPicked] = useState(null)     // archive print held up
  const [tone, setTone] = useState(false)
  // The film room's own sound toggle — independent of the motel's `tone`
  // (roomTone.js's air handler). Lazy-init from whatever's persisted so a
  // returning visitor who already unmuted once doesn't have to again.
  const [sound, setSound] = useState(() => isSoundOn())
  // A bespoke room (Memento's gaze-driven split) can publish a grade override
  // via rooms/gradeBus.js without rooms/* ever importing this file — this is
  // the one subscription that closes the loop, merged onto the room's own
  // config.grade below, at the Post call site.
  const [gradeOverride, setGradeOverrideState] = useState(null)
  useEffect(() => subscribeGrade(setGradeOverrideState), [])
  const [lens, setLens] = useState(null)        // a vibe tag, or null
  const [lensOpen, setLensOpen] = useState(false)
  const [finding, setFinding] = useState(false)

  // Where you are. 'motel' is the room you already know; 'entering:<slug>'
  // and 'exiting:<slug>' are the ~1.4s portal wash in either direction;
  // 'film:<slug>' is standing inside a film's own room. Deliberately its own
  // piece of state rather than folded into `station` — station feeds
  // CameraRig/XRPlayer/originFor/the dock's active test for the MOTEL, and
  // overloading it here would mean every one of those has to learn to ignore
  // values that mean nothing to it.
  const [world, setWorld] = useState('motel')
  // the develop wash currently on screen, or null. Its own state (not derived
  // from `world`) because it has to keep fading out for ~600ms AFTER `world`
  // has already flipped to the other side — if it were only mounted while
  // world matched 'entering:'/'exiting:', it would vanish mid-fade the instant
  // the peak swap happened.
  const [transition, setTransition] = useState(null)
  // the station you were standing at before you stepped inside a photo, so
  // exiting can put you back rather than just dumping you at 'ledger'.
  const preEntryStation = useRef('ledger')

  const filmSlug = world.startsWith('film:') ? world.slice(5)
    : world.startsWith('entering:') ? world.slice(9)
    : world.startsWith('exiting:') ? world.slice(8)
    : null
  const motelMounted = world === 'motel' || world.startsWith('entering:')
  const filmMounted = world.startsWith('film:') || world.startsWith('exiting:')

  // Stepping into a photo. Only ever from the motel, only ever a Ledger film
  // that is currently inspected (CaseFile is the only place this is called
  // from), and never in a headset — there is no rig to hand the camera off
  // to mid-flight in XR, and the affordance that calls this is hidden there
  // (see CaseFile.jsx).
  const enterFilm = (slug) => {
    if (world !== 'motel' || !slug || xrStore.getState().session != null) return
    preEntryStation.current = station
    setWorld('entering:' + slug)
    setTransition({ id: 'enter:' + slug + ':' + Date.now() })
    const url = new URL(location.href)
    url.searchParams.set('room', slug)
    url.searchParams.delete('film')
    url.searchParams.delete('print')
    history.pushState(null, '', url)
  }

  // Stepping back out. Esc, the persistent "back to the wall" affordance, and
  // browser back all funnel here.
  const exitFilm = () => {
    if (!world.startsWith('film:')) return
    setWorld('exiting:' + world.slice(5))
    setTransition({ id: 'exit:' + world.slice(5) + ':' + Date.now() })
  }

  // The wash's peak is where the world actually swaps underneath the white-
  // out — MotelWorld/FilmWorld trade places while the screen is fully covered.
  const handleDevelopPeak = () => {
    setDragDistance(0)
    document.body.style.cursor = 'auto'
    if (world.startsWith('entering:')) {
      setWorld('film:' + world.slice(9))
      setSelected(null)
    } else if (world.startsWith('exiting:')) {
      const slug = world.slice(8)
      setWorld('motel')
      setSelected(slug)
      setStation(preEntryStation.current || 'ledger')
    }
  }

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'vault-data.json')
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        const b = document.getElementById('boot'); if (b) b.style.display = 'none'
        // Addresses. ?room=<slug> is standing inside a film's own world;
        // ?film= is a card on the Ledger wall; ?print= is a print in one of
        // the two archives. Reload lands you back in front of the thing you
        // were looking at instead of in the middle of the room, and any one
        // of the three is a link you can send someone. room and film are
        // mutually exclusive — room wins, straight in, no transition.
        const q = new URLSearchParams(location.search)
        const room = q.get('room')
        const want = q.get('film')
        const print = q.get('print')
        if (room && d.films.some((f) => f.slug === room)) {
          setWorld('film:' + room)
        } else if (want && d.films.some((f) => f.slug === want)) {
          setStation('ledger')
          setSelected(want)
        } else if (print) {
          const box = (d.shoebox || []).some((a) => a.slug === print) ? 'shoebox'
            : (d.drawer || []).some((a) => a.slug === print) ? 'drawer' : null
          if (box) {
            setOpenBox(box)
            setStation(box)
            setPicked(print)
          }
        }
      })
      .catch((e) => console.error('vault-data load failed', e))
  }, [])

  // Browser back exits a film room. On entering we push a history entry
  // (?room=<slug>); the mechanism for film/print stays replaceState, as
  // before this feature existed.
  useEffect(() => {
    const onPop = () => { if (world.startsWith('film:')) exitFilm() }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world])

  useEffect(() => {
    const k = (e) => {
      // "/" is the universal open-the-search key; ignore it while typing
      if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(e.target?.tagName || '')) {
        e.preventDefault()
        return setFinding(true)
      }
      if (e.key === 'Enter' && world === 'motel' && selected && xrStore.getState().session == null) {
        return enterFilm(selected)
      }
      if (e.key !== 'Escape') return
      // a film room is the outermost layer there is — Esc closes it before it
      // starts closing anything back in the motel
      if (world.startsWith('film:')) return exitFilm()
      // panels first: Esc should shut what is in front of you before it starts
      // walking you back across the room
      if (finding) return setFinding(false)
      if (lensOpen) return setLensOpen(false)
      if (lens) return setLens(null)
      // Esc steps back one layer at a time rather than teleporting you to the
      // middle of the room from inside a shoebox.
      if (picked) return setPicked(null)
      if (openBox) { setOpenBox(null); return setStation('center') }
      setSelected(null)
      setStation('center')
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, openBox, finding, lensOpen, lens, world, selected, station])

  // A film is a place, so it gets an address. `?film=<slug>` started life as a
  // screenshot-harness hack; keeping the address bar in step with what is open
  // makes a case file something you can send someone, and makes reload land you
  // back where you were instead of in the middle of the room. Standing inside
  // a film's own room writes `?room=<slug>` instead, and the two never coexist.
  // Mid-transition (entering/exiting) the address bar is left alone —
  // transient, and enterFilm() already pushed the room address once.
  useEffect(() => {
    if (!data) return
    const url = new URL(location.href)
    if (world.startsWith('film:')) {
      url.searchParams.set('room', world.slice(5))
      url.searchParams.delete('film')
      url.searchParams.delete('print')
    } else if (world === 'motel') {
      url.searchParams.delete('room')
      if (selected) url.searchParams.set('film', selected)
      else url.searchParams.delete('film')
      if (picked) url.searchParams.set('print', picked)
      else url.searchParams.delete('print')
    }
    history.replaceState(null, '', url)
  }, [selected, picked, data, world])

  const scoreToY = useMemo(() => makeScoreToY(data?.films), [data])
  const vibes = useVibes(data?.films)
  const findIndex = useMemo(() => buildIndex(data), [data])

  // where a search result actually lives, and what it takes to stand in front
  // of it
  const goTo = (hit) => {
    setFinding(false)
    if (hit.kind === 'ledger') { setOpenBox(null); setPicked(null); setStation('ledger'); return setSelected(hit.slug) }
    if (hit.kind === 'shoebox' || hit.kind === 'drawer') return openBoxAt(hit.kind, hit.slug)
    setOpenBox(null); setPicked(null); setSelected(null); setStation('door')
  }
  const placed = useMemo(() => (data ? layout(data.films, scoreToY) : []), [data, scoreToY])

  // Search results have to be able to OPEN a box, not toggle it: landing on a
  // print in the shoebox must work whether or not the shoebox happened to be
  // open already.
  const openBoxAt = (which, slug = null) => {
    setSelected(null)
    setOpenBox(which)
    setStation(which)
    setPicked(slug)
  }

  // one open box at a time, and opening one takes you to it
  const goBox = (which) => {
    setSelected(null)
    setPicked(null)
    const next = openBox === which ? null : which
    setOpenBox(next)
    setStation(next || 'center')
  }

  // quotes: ledger ones tape to the wall, archive ones ride along with their
  // print, and the orphans go loose in the drawer
  const quotesBySlug = useMemo(() => {
    const out = {}
    for (const q of data?.quotes || []) {
      if (q.where !== 'archive' || !q.slug) continue
      ;(out[q.slug] ||= []).push(q)
    }
    return out
  }, [data])
  const ledgerQuotes = useMemo(
    () => (data?.quotes || []).filter((q) => q.where === 'ledger'),
    [data]
  )
  const looseQuotes = useMemo(
    () => (data?.quotes || []).filter((q) => q.where === 'loose'),
    [data]
  )
  const pickedFilm = useMemo(() => {
    if (!picked) return null
    return [...(data?.shoebox || []), ...(data?.drawer || [])]
      .find((a) => a.slug === picked) || null
  }, [picked, data])
  const byPlace = useMemo(
    () => Object.fromEntries(placed.map((p) => [p.film.slug, p])),
    [placed]
  )
  const openFilm = selected ? byPlace[selected]?.film : null
  // the film whose room is (becoming) open — always a Ledger film in Wave A,
  // since CaseFile (Ledger-only) is the sole entry point
  const roomFilm = filmSlug ? byPlace[filmSlug]?.film : null
  const roomConfig = useMemo(
    () => (roomFilm ? getRoomConfig(filmSlug, roomFilm) : null),
    [filmSlug, roomFilm]
  )

  // string is strung between pins, which sit at the top of each card
  const pinPoints = useMemo(
    () => Object.fromEntries(placed.map((p) => [p.film.slug, p.position])),
    [placed]
  )
  const thread = station === 'investigation'

  // An inspected card gets its own viewpoint, derived from where it hangs. You
  // step in close and stand square to BOTH objects — the Polaroid on the left,
  // the case file hanging beside it on the right — with the room still visible
  // past them. The old framing put the camera far enough back that the sheet
  // had to be a screen-edge panel to be readable; standing in reading distance
  // is what lets the file be a physical thing.
  //
  // Entering a photo overrides all of that with one more viewpoint: converged
  // tight on the card face itself, the camera closing in as the develop wash
  // rises to cover the swap.
  const view = useMemo(() => {
    if (world.startsWith('entering:')) {
      const p = byPlace[world.slice(9)]
      if (p) {
        const [x, y, z] = p.position
        return {
          key: 'enter:' + world.slice(9),
          station: { pos: [x, y, z + 0.12], look: [x, y, z], fov: 28 },
        }
      }
    }
    if (!selected) return { station, key: station }
    const p = byPlace[selected]
    if (!p) return { station, key: station }
    const [x, y, z] = p.position
    return {
      key: 'card:' + selected,
      station: {
        pos: [x + 0.30, THREE.MathUtils.clamp(y, 1.16, 1.98), z + 1.02],
        look: [x + 0.15, THREE.MathUtils.clamp(y, 1.10, 1.96) + LIFT_LOOK, z + 0.2],
        fov: 46,
      },
    }
  }, [world, selected, station, byPlace])

  return (
    <>
      <Canvas
        shadows={false}
        dpr={[1, 2]}
        camera={{ position: STATIONS.center.pos, fov: STATIONS.center.fov, near: 0.05, far: 60 }}
        gl={{ antialias: true }}
        onPointerMissed={() => setSelected(null)}
      >
       <XR store={xrStore}>
        {/* gradeOverride can carry `bg` too — Memento's own film-palette bg
            is card-front white (right for a Polaroid, wrong for a 3D void),
            and config.grade.bg falls back to that same palette when a
            bespoke room's CONFIGS entry doesn't set its own; the bus lets
            the room correct it without configs.js needing a matching edit */}
        <color attach="background" args={[filmMounted && roomConfig ? (gradeOverride?.bg || roomConfig.grade.bg) : '#05040a']} />

        <XRPlayer station={view.station} />
        {motelMounted && (
          <XRFloorZone onBack={() => { setSelected(null); setPicked(null); setOpenBox(null); setStation('center') }} />
        )}

        {motelMounted && (
          <MotelWorld
            data={data}
            thread={thread}
            view={view}
            openBox={openBox}
            picked={picked}
            selected={selected}
            hover={hover}
            lens={lens}
            scoreToY={scoreToY}
            placed={placed}
            byPlace={byPlace}
            pinPoints={pinPoints}
            quotesBySlug={quotesBySlug}
            ledgerQuotes={ledgerQuotes}
            looseQuotes={looseQuotes}
            // hidden mid-flight into a photo: the sheet floating in front of a
            // camera that has already moved past it reads as a glitch, not a
            // transition
            openFilm={world === 'motel' ? openFilm : null}
            setSelected={setSelected}
            setStation={setStation}
            setOpenBox={setOpenBox}
            setPicked={setPicked}
            setHover={setHover}
            goBox={goBox}
            openBoxAt={openBoxAt}
            onEnter={enterFilm}
          />
        )}

        {filmMounted && roomFilm && roomConfig && (
          <FilmWorld slug={filmSlug} film={roomFilm} config={roomConfig} />
        )}

        <Post
          grade={filmMounted && roomConfig
            ? (gradeOverride ? { ...roomConfig.grade, ...gradeOverride } : roomConfig.grade)
            : null}
        />
       </XR>
      </Canvas>

      {transition && (
        <Develop
          key={transition.id}
          slow={SLOW_WASH_SLUGS.has(transition.id.split(':')[1])}
          onPeak={handleDevelopPeak}
          onDone={() => setTransition(null)}
        />
      )}

      {/* HUD.
          The dock and the hint carry real CSS rather than inline styles,
          because both of them need media queries: inline styles cannot express
          "stop showing this below 620px", and that is exactly what the phone
          layout needed. */}
      <style>{`
        .vault-dock {
          position: fixed; left: 0; right: 0; bottom: 0;
          display: flex; align-items: center; gap: 8px;
          padding: 14px 18px 16px;
          overflow-x: auto; overflow-y: hidden;
          scrollbar-width: none;
          background: linear-gradient(to top, rgba(4,3,2,.72), rgba(4,3,2,0));
        }
        .vault-dock::-webkit-scrollbar { display: none; }
        .vault-dock > * { flex: 0 0 auto; }
        .vault-hint {
          position: fixed; right: 20px; bottom: 62px;
          color: #7d735f; font-size: 12.5px; font-family: system-ui, sans-serif;
          pointer-events: none; text-shadow: 0 1px 6px rgba(0,0,0,.9);
        }
        @media (max-width: 720px) {
          .vault-hint { display: none; }
          .vault-dock { padding: 10px 12px 12px; }
        }
      `}</style>

      {world === 'motel' && (
        <div style={hud.brand}>
          <div style={hud.title}>The Vault</div>
          {data && <div style={hud.sub}>{data.count} films · avg {data.avg} · scored live</div>}
        </div>
      )}

      {/* The dock. One row that scrolls sideways rather than wrapping: at
          390px the wrapped version stacked into three rows and the hint line
          rendered on top of the bottom one. Places on the left, modes after
          the rule — "the door" is somewhere you stand, "investigation" is
          something you switch on, and the old flat row said they were the same
          kind of thing. Hidden entirely once a film's own room is open — that
          room has its own, much smaller, HUD below. */}
      {world === 'motel' && (
        <div className="vault-dock">
          {[
            ['center', 'stand'],
            ['ledger', 'the ledger'],
            ['door', 'the door'],
            ['mirror', 'the mirror'],
            ['shoebox', 'the shoebox'],
            ['drawer', 'the drawer'],
          ].map(([k, label]) => (
            <button
              key={k}
              aria-label={label}
              onClick={() => {
                if (k === 'shoebox' || k === 'drawer') return goBox(k)
                setOpenBox(null)
                setPicked(null)
                setStation(k)
              }}
              style={{ ...hud.navBtn, ...(station === k ? hud.navOn : null) }}
            >
              {label}
            </button>
          ))}

          <span style={hud.rule} />

          <button
            aria-label="investigation"
            onClick={() => { setOpenBox(null); setPicked(null); setStation('investigation') }}
            style={{ ...hud.navBtn, ...(station === 'investigation' ? hud.navOn : null) }}
            title="the red string between films that rhyme"
          >
            investigation
          </button>
          <button
            aria-label="lens"
            onClick={() => { setLensOpen((v) => !v); setFinding(false) }}
            style={{ ...hud.navBtn, ...(lens || lensOpen ? hud.navOn : null) }}
            title="dim everything that is not a given vibe"
          >
            {lens ? 'lens · ' + lens : 'lens'}
          </button>
          <button
            aria-label="find"
            onClick={() => { setFinding((v) => !v); setLensOpen(false) }}
            style={{ ...hud.navBtn, ...(finding ? hud.navOn : null) }}
            title="find a film anywhere in the room  ( / )"
          >
            find
          </button>
          <button
            onClick={() => { tone ? stopRoomTone() : startRoomTone(); setTone(!tone) }}
            style={{ ...hud.navBtn, ...(tone ? hud.navOn : null) }}
            title="air handler, two floors down"
          >
            {tone ? 'room tone ·on' : 'room tone'}
          </button>
          <EnterVR style={{ ...hud.navBtn, ...hud.navVr }} />
        </div>
      )}

      {world === 'motel' && (
        <div className="vault-hint">
          {openBox
            ? 'click a print to hold it up · esc to put the box away'
            : 'drag to look · scroll to zoom · click a wall to approach · / to find · esc to stand back'}
        </div>
      )}

      {/* The film room's own HUD: a title strip and the one affordance that
          is always there to get you back out, however you got in. */}
      {world.startsWith('film:') && roomFilm && (
        <>
          <div style={hud.filmStrip}>
            <div style={hud.filmTitle}>
              {roomFilm.title}{roomFilm.year ? ` (${roomFilm.year})` : ''}
            </div>
            <div style={hud.filmScore}>{roomFilm.score.toFixed(1)}</div>
            <div style={hud.filmHint}>i to hide the record</div>
            <button
              onClick={() => { const next = !sound; setSoundOn(next); setSound(next) }}
              style={{ ...hud.filmSoundBtn, ...(sound ? hud.navOn : null) }}
              title="this room's generative audio — independent of the motel's room tone"
            >
              {sound ? 'sound ·on' : 'sound'}
            </button>
          </div>
          <button
            onClick={exitFilm}
            style={hud.backToWall}
            title="esc, or browser back, does the same thing"
          >
            back to the wall
          </button>
        </>
      )}

      {lensOpen && (
        <Lens vibes={vibes} value={lens} onPick={setLens} onClose={() => setLensOpen(false)} />
      )}

      {finding && <Find index={findIndex} onGo={goTo} onClose={() => setFinding(false)} />}

      {/* What a print says when you hold it up. Deliberately thin next to a
          case file — there is no hot take here, because he never wrote one. */}
      {pickedFilm && (
        <div style={hud.print}>
          <div style={hud.printTitle}>
            {pickedFilm.title}{pickedFilm.year ? ` (${pickedFilm.year})` : ''}
          </div>
          <div style={hud.printScore}>
            {pickedFilm.memory != null
              ? `${pickedFilm.memory.toFixed(1)} from memory`
              : 'never scored'}
            {pickedFilm.affinity === 'favorite' && <span style={hud.printFav}> · favourite</span>}
          </div>
          <div style={hud.printMeta}>
            {[
              pickedFilm.director?.join(', '),
              pickedFilm.runtime ? `${pickedFilm.runtime} min` : null,
              pickedFilm.genres?.join(' · '),
            ].filter(Boolean).map((line, i) => <div key={i}>{line}</div>)}
          </div>
          {/* A snap line is the film in one sentence, in his words. It beats
              the seen_note, which is bookkeeping ("vault archive — memory
              10.0") and reads like the machinery talking. */}
          <div style={hud.printNote}>{pickedFilm.snap || pickedFilm.note}</div>
        </div>
      )}

      {data && world === 'motel' && (
        <Guide
          counts={{
            films: data.count,
            links: data.links?.length || 0,
            queue: data.queue?.length || 0,
            lessons: data.lessons?.length || 0,
            shoebox: data.shoebox?.length || 0,
            drawer: data.drawer?.length || 0,
          }}
        />
      )}

      <ColdOpen />
    </>
  )
}

const hud = {
  brand: { position: 'fixed', top: 16, left: 20, color: '#efe7d6', pointerEvents: 'none', fontFamily: 'Georgia, serif', textShadow: '0 2px 12px rgba(0,0,0,.8)' },
  title: { fontSize: 26, fontStyle: 'italic', letterSpacing: '.01em' },
  sub: { fontSize: 12.5, color: '#b9ae98', marginTop: 2, fontFamily: 'system-ui, sans-serif' },
  rule: {
    flex: '0 0 auto', width: 1, alignSelf: 'stretch', margin: '2px 4px',
    background: 'rgba(180,160,120,.26)',
  },
  navBtn: {
    background: 'rgba(14,10,8,.62)', color: '#a99c85', border: '1px solid rgba(180,160,120,.22)',
    padding: '7px 12px', borderRadius: 2, fontSize: 11.5, letterSpacing: '.14em',
    textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'system-ui, sans-serif',
    backdropFilter: 'blur(3px)',
  },
  navOn: { color: '#f2e4c8', border: '1px solid rgba(255,190,120,.55)', background: 'rgba(50,32,16,.72)' },
  navVr: { color: '#cbb9d8', border: '1px solid rgba(190,150,220,.4)' },

  // The film room's own, much smaller, HUD — title/score/hint up top, one way
  // back out fixed to the corner. No dock, no lens, no find: those are
  // questions about the wall, and you are not standing at the wall.
  filmStrip: {
    position: 'fixed', top: 16, left: 20, right: 20, display: 'flex',
    alignItems: 'baseline', gap: 14, color: '#efe7d6', pointerEvents: 'none',
    fontFamily: 'Georgia, serif', textShadow: '0 2px 12px rgba(0,0,0,.85)',
  },
  filmTitle: { fontSize: 22, fontStyle: 'italic' },
  filmScore: { fontSize: 15, fontFamily: 'system-ui, sans-serif', opacity: 0.85 },
  filmHint: {
    marginLeft: 'auto', fontSize: 11.5, letterSpacing: '.08em', color: '#a99c85',
    fontFamily: 'system-ui, sans-serif', textTransform: 'uppercase',
  },
  // independent of the motel's room-tone toggle (`navBtn` in the dock) — this
  // one lives in the film room's own strip, which is otherwise pointerEvents
  // 'none', so the button opts itself back in
  filmSoundBtn: {
    pointerEvents: 'auto', cursor: 'pointer', background: 'rgba(14,10,8,.62)',
    color: '#a99c85', border: '1px solid rgba(180,160,120,.22)', borderRadius: 2,
    padding: '6px 11px', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase',
    fontFamily: 'system-ui, sans-serif', backdropFilter: 'blur(3px)',
  },
  backToWall: {
    position: 'fixed', left: 20, bottom: 22, cursor: 'pointer',
    background: 'rgba(20,15,10,.68)', color: '#cdbfa4',
    border: '1px solid rgba(180,160,120,.3)', borderRadius: 2,
    padding: '9px 16px', fontSize: 11, letterSpacing: '.16em',
    textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif',
    backdropFilter: 'blur(3px)',
  },

  print: {
    position: 'fixed', top: 96, right: 22, width: 276, padding: '16px 18px 18px',
    background: 'rgba(12,9,7,.82)', border: '1px solid rgba(180,160,120,.22)',
    color: '#cdc2ab', fontFamily: 'system-ui, sans-serif', pointerEvents: 'none',
    backdropFilter: 'blur(4px)', borderRadius: 2,
  },
  printTitle: { fontFamily: 'Georgia, serif', fontSize: 19, color: '#f0e6d2', lineHeight: 1.25 },
  // pencil, not ink — the same tell the print itself carries
  printScore: { marginTop: 7, fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', color: '#9a927f' },
  printMeta: { marginTop: 12, fontSize: 12.5, lineHeight: 1.65, color: '#8d8472' },
  printNote: { marginTop: 12, fontSize: 12.5, lineHeight: 1.55, color: '#6f6857', fontStyle: 'italic' },
}
