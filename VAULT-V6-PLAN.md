# The Vault v6 — Build Plan

**Written 2026-08-12. Supersedes `VAULT-REDESIGN-HANDOFF.md` (that doc describes the dead CSS-3D artifact era).**

The Vault is Dixon's personal movie-night archive rendered as a first-person 3D
space: a broken-down motel room, Memento-style, where every film he has watched
hangs as a Polaroid, connected by red string, readable up close. Live at
https://dixxxvhb.github.io/movie-vault/ — repo github.com/dixxxvhb/movie-vault.

Not a DWD project. No DWD branding, no Tamara Mark.

---

## 1. Locked decisions (Dixon, 2026-08-12)

| Decision | Ruling |
|---|---|
| Navigation | **Click-to-station.** Stand and mouse-look 360°. Click a wall or object → camera flies to an authored viewpoint. No free-walk. |
| Card fronts | **Real TMDB posters, bespoke SVG as fallback.** Poster is cropped square and pushed through a Polaroid grade. |
| Inspect | **Lean in, card turns, read in place.** Camera flies to the card; it lifts off the wall and turns; `panel_html` renders as a DOM overlay pinned to the card. Stays in the world — no full-screen takeover. |
| Build order | **Room feel first.** Harness → real room + lighting + post → then fill walls with content. |
| VR | Designed toward, shipped late. Build in meters, budget for 72fps. |

---

## 2. Current state (what M1 actually is)

`src/App.jsx` (167 lines) + `src/Polaroid.jsx` + `src/vaultTextures.js`.

- One back wall plane, four gray placeholder planes for floor/ceiling/sides.
- `OrbitControls` clamped to ±0.9 rad yaw — **you cannot turn around**.
- Polaroids are unlit `meshBasicMaterial` planes, faces drawn to canvas.
- Click → modal reading "full hot-take lands in the next pass."
- No postprocessing, no texture work, no normal maps, no atmosphere.

It is a diorama. Everything below replaces it; only the data bridge survives.

### Gotchas burned in M1 — do not rediscover these

1. Polaroid faces must not be blown out by the room lamp. M1 solved this with
   `meshBasicMaterial` (fully unlit). v6 needs faces that *respond* to light or
   they look pasted on — use `meshStandardMaterial` with low roughness response
   plus an emissive floor, tuned against the lamp, not `meshBasic`.
2. Swapping a material's `map` from `null` → texture does **not** compile
   `USE_MAP` into the shader. You must mount a **new material instance**
   (React `key` flip). This was the "blank white cards" bug.
3. **Chrome-MCP cannot reach this PC's localhost**, and the in-app Browser pane
   will not composite WebGL frames while hidden. Historically every visual check
   cost a full redeploy. **M0 fixes this** — see below.

---

## 3. The data (this is the headline)

`public/vault-data.json` currently carries slug, title, score, watched date,
palette, SVG front. That is roughly 8% of what exists. Supabase project
`swjqlfcqvcrnydpyjyog`, verified 2026-08-12:

| Table / column | Rows | Role in v6 |
|---|---|---|
| `film_ledger_panels.panel_html` | 34 | The inspect read. Full case files — plot, hot take, conversation residue. Long-form prose. |
| `film_ledger_panels.photo_svg` | 34 | Fallback front art |
| `film_log.hot_take` | 34/34 | Back-of-card handwriting |
| `film_log.long_form` | 8 | Extended notes on the inspect overlay |
| `film_log.vibe_tags` | 32 | Clustering, filters, the taste map |
| `film_titles.poster_path` | 110/119 | **The Polaroid photo.** Verified: `image.tmdb.org/t/p/w500{path}` returns 200, no API key. |
| `film_titles` genres / director / runtime / overview | ~110 | Detail panel, connection logic |
| `film_links` | 33 | **The red string.** Already authored, with `note`, `weight`, `directional`, and 24 typed relations (`nolan-arc`, `execution-meritocracy`, `reveal-as-event`, `antibodies`, `unreliable-search`, …) |
| `film_quotes` | 45 | Scraps pinned near their film |
| `film_watchlist` (20 `queued`) | 38 | The door wall — what's next |
| `film_lessons` | 64 | Memento tattoos. Dixon's taste rules, scrawled. |
| `film_taste_profile` | 1 row | Genre lean, weekly rhythm — drives the mirror wall |

Nothing here needs inventing. It needs drawing.

**Taste profile rule:** single latest row wins, never mirror-write. See memory
`project-movie-vault-code-sync`.

---

## 4. Room design — four walls, four jobs

The room is a box in meters. Camera eye height 1.65m. Room ~6m × 5m × 2.6m.

- **North — The Ledger.** Salon hang, rank = height. Perfect score at eye line,
  tiers descending to the baseboard. This is the wall you spawn facing.
- **East — The Investigation.** Corkboard. Red string between films
  (`film_links`), pins, index cards carrying the link `note`. Hover a film → its
  bloodlines light.
- **South — The Door.** The queue. 20 `queued` watchlist films as unopened
  envelopes / taped-up scraps by the doorway. Where "what's next" lives.
- **West — The Mirror.** 64 lessons as scrawled notes, tape, marker on the
  mirror. Taste profile summary. The Memento tattoo wall.
- **Floor props.** Shoebox (archive films) on a table; nightstand drawer (the
  hazy / half-remembered). Both open on click, camera dives in.

---

## 5. Technical architecture

### Camera rig
Replace `OrbitControls` entirely.

- Idle: fixed position at room center, full 360° yaw + clamped pitch mouse-look.
- **Stations**: authored `{position, target, fov}` viewpoints — one per wall,
  one per prop, one per card at inspect range.
- Transitions: rAF-driven eased flights between stations (`~700ms`, ease-in-out
  cubic). Never snap.
- Escape / click-out returns to the parent station.

### Level of detail (the zoom-in problem)
Canvas text on a 3D plane turns to mush up close. Three tiers:

1. **Wall distance** — card is a texture off a shared atlas. Poster + title +
   score only.
2. **Approach** — swap to an individual high-res canvas texture (1024px).
3. **Inspect** — `drei/<Html>` DOM overlay, transform-matched to the card,
   renders `panel_html` as real typography. Crisp, selectable, scrollable.

### Materials and atmosphere (this is what sells it)
Currently absent entirely. Non-negotiable for "immersive":

- Procedural stained wallpaper: base color + normal map + roughness variation,
  water stains, a peeled corner. Generate to canvas at build or runtime.
- One practical lamp with real falloff + a second cool source (neon through
  blinds) for color contrast.
- `@react-three/postprocessing`: bloom, vignette, film grain, faint chromatic
  aberration, subtle depth of field at inspect range.
- Dust motes in the lamp cone (instanced points, slow drift).
- Card drop shadows that actually respond to the lamp, not a fixed dark slab.

### The red string
`Line2` / `TubeGeometry` along a catmull-rom curve with gravity sag between pin
points. Color `#C42B2B` (Dixon's ruling — the one amendment to his red-string
ban). Dim by default, ignite on hover of either endpoint. Link `note` surfaces
as an index card at the string's midpoint.

### Performance budget
34 cards today, assume 150+. Instance the pins and frames, share one atlas for
distant cards, cap `dpr` at 2, target 60fps desktop / 72fps XR. Lazy-load
poster textures by wall visibility.

---

## 6. Data pipeline v2

`scripts/emit_vault_data.py` grows from "ledger only" into the full exporter.

1. Pull all film tables from Supabase into `data/*.json` (existing 4 files plus
   `titles.json`, `quotes.json`, `watchlist.json`, `lessons.json`).
2. **Download posters at build time** into `public/posters/{slug}.jpg`
   (`image.tmdb.org/t/p/w500{poster_path}`, verified keyless). Vendoring them
   removes the runtime CDN dependency and any CSP surprise. Skip if the file
   already exists — this is idempotent and cheap.
3. Emit one `public/vault-data.json` with `films[]` (all fields), `links[]`,
   `lessons[]`, `queue[]`, `quotes[]`, `taste{}`.
4. `npm run data` → commit → `git push origin master` **is** the deploy
   (GitHub Action builds and publishes).

---

## 6b. Doctrine conflicts found mid-build (2026-08-13)

Reading `film_lessons` for the Mirror wall surfaced two of Dixon's own standing
design rules that this build was breaking. Recorded here so they are not
re-broken by accident:

1. **"Banned design drawer: noir, evidence board, typewriter, VHS, marquee,
   neon. All AI slop."** The v6 room shipped a pink neon window. **Fixed** — the
   window is now a cold streetlight, which does the same lighting job (cool
   counterpoint to the warm practical) without wearing a costume.
2. **"No corkboard, no red string, no pins"**, and the Thread exception is
   explicitly narrow: *"a thin temporary line of light, opt-in on hold, gone on
   release, with the room dimming while held. If it ever reads as yarn or
   becomes a standing web, the exception dies and the ban wins."*
   This build has a **standing web with pins**, which the rule forbids — but
   Dixon asked for exactly that in session ("all of it connected through strings
   like a serial killer") and confirmed it in the plan review. Kept, and pulled
   toward the rule: the web only exists inside the Investigation station (opt-in
   rather than always-on) and **the room dims while it is up**. Open question
   for Dixon: hold-to-reveal instead of a mode, and whether the pins stay.

## 7. Milestones

### M0 — Dev harness (do this first, it pays for itself immediately)
`npm run shot` — Playwright script that builds, serves, loads the app headless
at `device_scale_factor` 2, waits for a settle signal, and writes PNGs of each
station to `_shots/`. Use the already-installed system Chrome; **never run
`playwright install`**. Without this, every visual iteration costs a redeploy.

Also: a `?debug` mode (flat color per wall, station labels, fps counter).

### M1.5 — The real room
Box geometry in meters, four distinct walls, materials + normal maps, lamp +
neon, postprocessing stack, dust, 360° mouse-look, station system with the four
wall stations. **No content yet.** Goal: standing in it feels like a place.

### M2 — The Ledger wall, properly
Poster fronts through the Polaroid grade, SVG fallback, salon hang with tier
bands, pins with real shadows, hover lift, LOD tier 1→2.

### M3 — Inspect
Card flight, lift-and-turn animation, `<Html>` case-file overlay rendering
`panel_html`, back-of-card hot take, attached quotes, linked-film chips.

### M4 — The Investigation
`film_links` as red string. Hover ignition. Relation-type filtering.

### M5 — The other three walls
Queue/door, mirror/lessons, shoebox + drawer archive.

### M6 — Polish and XR
Cold open (coma-wake blink), ambient room audio, `@react-three/xr` entry,
Quest testing.

---

## 8. Verification doctrine

- **Never verify this repo's rendering at DPR 1 only.** History: a wall-texture
  size bug shipped blank to Dixon's display scaling because headless checks ran
  at DPR 1. Screenshot checks run at `device_scale_factor` 2 permanently.
- **DOM-only checks are not sufficient.** A previous version passed every
  structural check while rendering a black void. Pixel-sampling checks — is the
  wall visible, are the cards non-uniform, is the lamp cone brighter than the
  corners — are mandatory.
- Dixon reviews the deployed Pages site in real Chrome before anything is
  called done.
