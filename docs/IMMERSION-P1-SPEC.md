# Immersion Phase 1 — Implementation Spec
Architect: Fable session 2026-08-21. Source design: `docs/VAULT-IMMERSION-BRIEF-v2.md` (read §0-§4 before coding; §5 is per-room content used in Wave B).
Codebase facts referenced below were verified against the current source; line numbers are approximate anchors, not gospel — read the code at each anchor.

## Non-negotiables (from the brief + repo law)
- Plain JS/JSX. No TypeScript. No new deps without architect sign-off.
- Zero imported assets: no images, fonts, audio files from anywhere. All textures are procedural CanvasTexture (repo pattern), all text via canvas 2D (system fonts: Georgia serif is house style).
- No em dashes in any UI copy we author. Hot takes render VERBATIM (they may contain anything; never edit them).
- No emojis in UI. No DWD colors/fonts. Banned default costume: noir/evidence-board/typewriter/VHS/marquee/neon (a film's own world may contain them when the film does).
- StrictMode is ON: every effect double-fires in dev. All mounts idempotent, all timers cleaned up.
- Verification loop: `npm run dev` (already running on 5173) + `python scripts/peek.py --url "http://localhost:5173/?..." --out <name>` then READ the PNG. Full gate: `npm run shot`. NEVER run `playwright install`. Never verify at DPR 1 only (peek/shot already handle DPR 2).

## Architecture decisions (locked)

### World state
- New state in App.jsx (~line 152 neighborhood): `const [world, setWorld] = useState('motel')` with values `'motel' | 'entering:<slug>' | 'film:<slug>' | 'exiting:<slug>'`.
- Do NOT overload `station` — it feeds CameraRig, XRPlayer, originFor, and the dock active test.

### MotelWorld extraction (pure refactor first)
- Move App.jsx render block ~lines 335-431 (Room, CameraRig, WallZones, Signs, ScoreMarks, Nights, Polaroids, QueueWall, LessonsWall, Archive, WallQuotes, CaseFile, Strings) into `src/MotelWorld.jsx`, props-through, ZERO behavior change.
- Keep at App level: `<XR>`, `<color attach="background">` (now world-aware), XRPlayer, XRFloorZone (mount ONLY when world==='motel'), `<Post/>`.
- Verify with `npm run shot` (all stations green) before proceeding. Commit separately: "extract MotelWorld, no behavior change".

### Enter interaction
- Inspecting stays exactly as-is (click card -> flip + case file).
- While a film is inspected (`selected` set, world==='motel'): pressing **Enter**, or clicking the new masking-tape tab labeled `step inside` rendered at the bottom of the CaseFile sheet (same visual language as its paper: add a button row in CaseFile.jsx next to "put it back"), begins the portal.
- Portal enter sequence:
  1. `setWorld('entering:'+slug)`. Push a literal camera station (App view memo, existing pattern ~App.jsx:305-318): pos converging to 0.12m in front of the card face, look at card center, fov tightening to 28. CameraRig flies it (780ms).
  2. Simultaneously mount DOM overlay `<Develop/>` (new, `src/rooms/Develop.jsx`, pattern-copy ColdOpen.jsx): a chemical-wash white-out with animated grain that peaks at ~780ms, fully covering the swap.
  3. At peak (timer ~800ms, cleaned up properly): `setWorld('film:'+slug)`, `setSelected(null)`. MotelWorld unmounts, FilmWorld mounts. Overlay fades out over ~600ms revealing the room. Total under 1.8s. Any input during entry skips to the end state (interruptible, like ColdOpen).
  4. ON SWAP, always: `setDragDistance(0)` (src/pointer.js latch), `document.body.style.cursor='auto'`.
- Exit: Esc (top of the Esc chain, App.jsx ~192-214), or the persistent bottom-left affordance `back to the wall` (fixed DOM, paper-scrap styling), or browser back. Reverse wash -> `setWorld('motel')` -> restore station to the entered film's card-inspect view (`setSelected(slug)` so you land back at the photo). Preserve pre-entry station in a ref.
- Deep link: `?room=<slug>` added to BOTH the URL read block (App.jsx ~173-187: if present, `setWorld('film:'+slug)` directly, no transition) and the write effect (~220-228). `?film=` and `?room=` are mutually exclusive; room wins.
- Browser back: on entering push a history entry (pushState with `?room=`), listen for popstate to exit. Keep it simple; replaceState remains the mechanism for film/print as today.

### FilmWorld
- `src/rooms/FilmWorld.jsx`: given `slug` + `film` data, resolves config from registry and renders:
  - its OWN `<color attach="background">` from config.
  - its own lights (Motel's lights die with MotelWorld; a film room supplies everything).
  - reuses `<CameraRig station={<literal from config>} stationKey={...}/>` (CameraRig accepts literal station objects; drag-look + zoom come free).
  - the family scene component + `<InfoSurfaces/>`.
  - camera.far bump if config.far set (`camera.far = x; camera.updateProjectionMatrix()`), restored on unmount to 60.
- HUD while in a film room: hide `.vault-dock`, `.vault-hint`, Guide's `?` button. Show instead a minimal film HUD strip (title, score, `i` hint, back affordance).
- `i` key toggles info surfaces off for pure ambience (state in FilmWorld).
- In an XR session: entering rooms is disabled for Phase 1 (hide the affordance when `useInXR()`); note it in code comments as a Phase 3+ item.

### Registry + configs
- `src/rooms/registry.js`: `getRoomConfig(slug)` -> config object. Configs in `src/rooms/configs.js` (Wave B fills all 41; Wave A ships with a DEFAULT config derived from film palette so every slug already resolves).
- Config shape (Wave A defines + documents it in configs.js header):
```js
{
  family: 'mind-bender'|'dread'|'momentum'|'spectacle'|'intimate-tension'|'weird-fable',
  grade: { bg:'#0d1418', fogColor:'#0d1418', fogDensity:0.06, key:'#4FB6D9', keyIntensity:2.2, fill:'#223', ambient:0.18, sat:0, contrast:0, hue:0 },
  camera: { pos:[0,1.62,4], look:[0,1.4,0], fov:50, far:undefined },
  place: { /* family-specific staging params, Wave B */ },
  info: { hotTakePos:[..], hotTakeRot:[..], scorePos:[..], metaPos:[..] } // optional overrides
}
```
- Grade pass: `<Post/>` becomes world-aware: when world is film, feed `HueSaturation` + `BrightnessContrast` (postprocessing lib, already a dep) from config.grade {hue, sat, contrast}; keep Bloom/Noise/Vignette. Keep `<Post/>` MOUNTED across the swap (avoids composer remount flash); only its props change.

### Info surfaces (`src/rooms/InfoSurfaces.jsx`)
Diegetic objects, built from film data + palette, canvas textures (copy the async pattern Polaroid.jsx:27-32 AND the material key flip "blank"->"mapped"; dispose textures on unmount — new precedent, do it):
- **Hot take sheet**: the centerpiece. Large paper/board plane (~1.2m wide), hot take VERBATIM in a handwritten-feel (Georgia italic) layout, film palette colors. Auto-size text to fit (canvas measureText wrap).
- **Score object**: big numeral (Georgia bold), film accent color, placed per config.
- **Meta line**: watched date + context, small.
- **Vibe chips**: small tags with the palette glyph, one row.
- Positions from config.info with sensible per-family defaults.

### Data pipeline (Wave A)
- `data/hot_takes.json` already exists (slug -> {hot_take, context}).
- Extend `scripts/emit_vault_data.py`: films gain `hot_take` and `context` from it (null-safe). Re-run `npm run data`. Do not touch other outputs; drift guard must stay green.

### Placeholder room (Wave A ships this so EVERY film is enterable day one)
- `src/rooms/families/Default.jsx`: a "developing memory" void: fog in the film's bg color, a floor disc, one key light in the film accent, drifting grain particles (copy Dust pattern from Room.jsx:197, keyed on count), and the info surfaces. It should already feel like a place, not an error state.

## Wave A deliverables + gates
1. MotelWorld extraction commit, `npm run shot` green.
2. Portal + Develop overlay + FilmWorld + Default family + InfoSurfaces + emitter change + `?room=` + Esc/back/HUD swap.
3. Verify: `python scripts/peek.py --url "http://localhost:5173/?room=memento&nocold&noguide" --out room-memento-default` and `...?room=the-departed...` — READ the PNGs (room visible, hot take legible, not a black void). Also peek the wall to prove no regression, and `npm run shot` full suite green (station shots unchanged).
4. Commit. Do NOT push (architect reviews first).

## Wave B (next spec section, do not start in Wave A)
Six family components + 41 real configs transcribed from brief §5 + three-state treatments. Separate task.

## Known sharp edges (respect these)
- pointer.js drag latch survives unmounts: reset on world swap.
- Cursor style left 'pointer' on unmount-mid-hover: reset on swap.
- `<color attach="background">` does not revert on unmount: set explicitly per world.
- Swapping `map` on a live material renders white: material `key` flip.
- Dust-style `<points>` must be keyed on count (buffer resize throw).
- XRFloorZone hardcodes ROOM dims + resets motel state: motel-world only.
- `#boot` hide happens in App data fetch; don't move it.
- Import cycles broke the dev server once (pointer.js exists because of it): rooms/* must not import from App.jsx; shared helpers go in their own modules.
