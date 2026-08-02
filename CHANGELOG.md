# Pipeline CHANGELOG

## v4.2 — 2026-08-01 — final polish (same night as v4/v4.1)

- **Shoebox/drawer "still visible when closed" — false alarm, traced and
  closed.** Investigated the flagged `v-wall.png`: on a genuinely fresh load
  the covers ARE opaque and every archive/hazy print IS at opacity 0
  (confirmed directly via computed style). The committed screenshot showed
  them open because check.py's own test flow (check 17) opens both before
  the final record screenshot and nothing re-closed them first. Fixed
  check.py to re-add `box-closed`/`drawer-closed` right before the `v-wall.png`
  screenshot, so the committed "at rest" proof shot actually shows the room
  at rest.
- **Run-down pass.** `.arch.wallpanel` now carries a full vignette (darkens
  toward all four edges, not just the bottom), a damask-depth double stripe,
  four uneven corner stains, one water-run streak, and the existing peeling
  seam. `.arch.baseboard` gets five scuff blotches at varied opacity/position.
  `.arch.lamp` is a real warm light cone thrown onto the wall (`screen`
  blend, three-stop falloff) instead of a flat blob; `.arch.shade` is a
  visible two-tone lampshade with a rod, not a gray rectangle. Kept subtle
  per instruction — the polaroids stay the visual anchor.
- **Proof screenshots** (1280x900, fresh renders) saved to
  `_experiments/v4-proof/`: `seated-room.png`, `wall.png`, `backs.png`,
  `box-closed.png`, `box-open.png`, `drawer-open.png`, `coldopen-t05.png`.
  `.gitignore` widened (`_experiments/**/*.png`) to actually cover that
  nested path — the existing `_experiments/*.png` rule only matched direct
  children.
- 23 checks, all still green, zero page errors.

## v4.1 — 2026-08-01 — visual QA fixes (same night as v4)

A real-browser eyeball pass on the freshly-built v4 found the check.py-green
render was badly broken visually. Root causes and fixes:

- **Backs mode was a black screen.** The nested-preserve-3d approach (both
  walls sharing one room anchor, each with a per-mode Z that was supposed to
  exactly cancel its own depth push-back) was mathematically sound in
  isolation but fragile in composition — in practice it rendered the backs
  wall as a foreshortened sliver (or nothing). Fix: `#frontWall` and
  `#backswall` are now both plain flat 2D layers at the same depth (no
  rotation, no Z math to get subtly wrong); only one is ever visible
  (`visibility`, driven by `body.mode-backs`). The "turn" is now a short,
  honest, but purely decorative yaw swing on `#room` (`turnSwing()`) timed to
  the visibility swap, not the thing the correctness of the view depends on.
- **The room was a flat wall floating in a void.** Two bugs: `#viewport` had
  an opaque background painting over the room dressing beneath it, and the
  dressing itself (`#floor`/`#ceiling`/`#leftwall`/`#foreground`) was wired
  into the same fragile 3D graph as the walls, at a physical scale that
  didn't relate to the huge salon-wall content plane, so it rendered off in
  space or fully occluded. Fix: floor, ceiling, left wall (window + animated
  neon wash), free-standing lamp glow, and foreground silhouette are now
  `#roomShell` — fixed, viewport-relative 2D dressing that sits behind
  `#viewport` (now transparent) and always renders correctly regardless of
  camera state. Also gave the wallpaper (`.arch.wallpanel`) a full opaque
  aged-ivory base with a peeling seam and stains instead of a highlight that
  faded to void after 14% of the wall's height — this also fixed the
  "narrow centered column, big dead margins" complaint, which was really the
  same wall-plane-in-a-3D-graph distortion as the black-screen bug.
- **Shoebox and nightstand weren't objects.** The literal free-floating 3D
  furniture (`#shoebox`/`#nightstand`, positioned in an unrelated physical
  scale from the wall content) is gone. In its place: the box and the
  cabinet drawer are drawn where they always were (on the front wall, same
  salon-plane coordinates as v3's `boxwall`/`cabinet` arch elements), but now
  carry a real **closed cover** (`.arch.boxlid`, `.arch.drawerfront2`) that
  fully hides every print underneath (`body.box-closed` / `.drawer-closed`
  set opacity 0 on every `.st-arc`/`.st-hazy` photo) until clicked — then the
  cover animates away and the wall camera flies to the reveal.
- **Stale v3 hint text.** `MODE_HINT.backs` still said "flip it" and didn't
  mention turning; rewritten for all three modes to describe v4 interactions
  (turning to face the backs wall, diving to read in place, opening the
  shoebox/drawer from the wall hint).
- **check.py was green while all of the above was broken** because every
  check asserted DOM state (classes, computed styles) and none of it looked
  at actual pixels. Added checks 19-22: real `page.screenshot()` +
  Pillow pixel/region sampling for the backs wall (not near-black), the room
  shell (floor/window-neon/ceiling regions all painted), wall framing
  (wallpaper spans a wide fraction of the frame, not a narrow column), and
  the cold open (t=0.5s vs t=4s frames genuinely differ, and it's awake by
  budget) on a completely fresh, unskipped load. 23 checks total, up from 19.

## v4 — 2026-08-01 — The Motel Room (first-person, CSS 3D shell)

The wall was a room painted in 2D. Now the viewer is actually inside one:
first-person, waking from a coma, in a run-down motel room. Full spec in
`VAULT-V4-HANDOFF.md`. `vault.py`'s token contract is untouched; the whole
transformation lives in `wall_template.html`. v3 is archived at
`legacy-v3/wall_template.html`.

### What structurally changed

- **`#viewport` now has real 3D perspective** (`perspective:1100px;
  perspective-origin:50% 45%`). A new `#room` (`transform-style:preserve-3d`)
  is the scene root; a single camera object (`roomCam.{yaw,pitch,z}`) drives
  its transform, eased with the same glide feel as the old 2D camera.
- **The flip mechanic is gone, for good.** The salon wall (`#world`, all its
  existing layout/salon/threads/Investigation code, reused verbatim) is now
  the **front wall**, pushed back into the room on `#frontWall`
  (`translateZ`). A brand new **backs wall** (`#backswall` / `#backsInner`,
  turned 90° via `rotateY`) carries a second, independent set of `.photo`
  elements (`p.backEl`) mounted back-out — the panel content (`p.sec`) lives
  there, not behind a `rotateY(180deg)` card flip. Reading a card is just the
  camera diving to whichever wall is currently facing it; a `.read` class
  (not `.flipped`) marks the centered element on either plane.
- **One 2D coordinate system, two sides of the same room.** The existing
  pan/zoom/pinch camera (`cam.x/y/s`) is applied identically to `#world` and
  `#backsInner` — turning to the backs wall doesn't reset your place in the
  hang. `Z_ENGAGED` is picked to exactly cancel `#frontWall`'s own depth
  offset, so the front wall renders at zero perspective distortion and all
  the wall's existing screen-pixel math (`fitRect`, `centerPhoto`, dive)
  keeps working unchanged.
- **The room shell**: floor (worn carpet, repeating gradients), ceiling
  (water-stain bloom), a left wall with a night window and a flickering neon
  sign washing pink light in (`@keyframes neonflicker`, CSS-only), and a
  foreground silhouette plane low in frame to sell "I'm sitting here." All
  `.arch`-style gradient divs, no images.
- **Furniture, not painted regions.** The Shoebox and the Dark Drawer's
  cabinet are now real 3D boxes (`#shoebox`, `#nightstand`, a handful of
  `.f` planes each) sitting on the floor between the viewer and the wall.
  Clicking either tips the lid / slides the drawer (`.open` class) and flies
  the *wall* camera over to `regions.box` / `regions.hazy` — same content,
  same salon-plane coordinates as v3, now reached through a piece of
  furniture instead of a chip alone.
- **Cold open**: page loads black, two blurred blinks, the room brightens
  mid-second-blink (the lamp buzzing on), and the camera rights itself from
  an askew/low start into SEATED over ~2.5s. Skippable on any click or
  keypress (`finishColdOpen()`), runs once, ≤4s total. Seated idle carries a
  couple degrees of mouse-parallax and a handful of CSS dust motes.
- **Modes are unchanged in meaning**: Wall / Backs (now a literal turn, via
  `roomCam.yaw`) / The Investigation (still front-wall-only, still hold to
  light kin / click to follow / ember trail / step back — none of that code
  moved). Go-to chips (def/box/hazy/all) still `fitRect` within the wall's
  own plane.

### check.py

Rewritten for the new reality (19 checks, up from 17): cold-open skip,
front+back mount counts, `.read` instead of `.flipped` everywhere (reached
via `p.sec`/`p.backEl` since panel content no longer lives under `p.el`),
room-camera yaw actually turning for backs vs. wall/invest, shoebox/nightstand
open+fly behavior, `--sc` checked on both planes for archive/hazy. Ranks,
salon hang, states, links, Investigation, step back, certify/undo, SVG
fronts, and the restore-path convergence check are unchanged in intent, just
re-pointed at the new DOM.

## v3 — 2026-08-01 — The Room (same night as v2; Dixon's escalation)

Dixon's four rulings (recorded from the session): height = rank on a salon
hang, ember trail in the merged Investigation mode, hybrid front art (SVG
scenes now, ComfyUI experiments owed for Crown + Nines), open shoebox.

### What structurally changed

- **The wall is a room.** `layout()` paints architecture into `#world`
  (`.arch` elements): wall paneling, picture rail, baseboard, wood floor, and
  one hanging lamp over the Crown. Salon hang replaces tier-band grid rows:
  the Crown alone at the eye line (`EYE`), each band descending toward the
  baseboard, centered on `WALL_CX`, per-photo deterministic jitter. Rank now
  reads as height; the tape carries a penciled rank number (`.rank` moved onto
  the tape).
- **The Shoebox is an actual open box** on a side table (prints riffled,
  scaled `--sc:.56`, heavier rotation, no tape) and **the Hazy Wing is now The
  Dark Drawer**, a cabinet of undeveloped frames (`--sc:.5`). Both are
  "evidence in waiting": archive fronts render as grayscale contact prints
  with an "awaiting development" pencil note; no bespoke scene until
  certification.
- **The Investigation** replaces Constellations + The Thread as one mode.
  Hold lights the red lines (unchanged law: thin light, opt-in). NEW: clicking
  a lit kin follows the line — camera flies, the link's note flashes on a
  `#notecard` in the handwriting, the trace re-lights from the new photo, and
  the walked segment stays behind as a faint **ember** (mode-long, cleared on
  exit; Dixon's "ember trail" ruling, still inside the red-string ban's
  letter). The old constellation force-reflow survives as the **step back**
  sub-toggle inside the mode (`#stepbackChip`), links-become-distance, exits
  back to the hang.
- **Bespoke fronts.** New `film_ledger_panels.photo_svg` column (migration
  `add_photo_svg_to_film_ledger_panels`); 24 hand-authored SVG scenes, one per
  definitive film, built from each film's own palette vars so they inherit
  panel colors. New build input `photos.json` (pull from DB), new template
  token `__PHOTOS__`. A slug without a scene falls back to its glyph.
- **Certification is the DNA coming back**: certify plays a 1.2s development
  bloom (`.developing`), drops the "awaiting" mark, rescales to 1, and the
  print flies from the box to its ranked spot on the wall. Undo reverses all
  of it. CERTIFY tray protocol unchanged.
- Mode dimming: the room dims in Backs (40%) and fully in the Investigation
  (`#dimmer`). Newest ledger print gets whiter tape + a bright border
  (`.fresh`) for one build cycle.
- `check.py` updated for the v3 layout (salon band ordering, invest mode,
  step back, fronts present, awaiting/develop cycle); same never-install
  browser resolution.

### Sync additions

- Step 1.5 of the sync: pull fronts →
  `select jsonb_object_agg(slug, photo_svg) from film_ledger_panels where photo_svg is not null;`
  → save as `photos.json`. New scenes are authored per new film (Code side,
  design grammar in the SVGs themselves: 236x236 viewBox, palette vars only,
  dead-center subject) and stored in `photo_svg` in the same pass as the panel
  row.

### Closed same night

- ComfyUI photographic experiments: run (4 renders, `_experiments/`), Dixon
  ruled 2026-08-01 to stay all-SVG for now. Fronts are SVG scenes, period.
- Artifact republished to the stable URL (v3 live there; Dixon has more
  upgrades planned, future republishes reuse the same URL).

## v2 — 2026-08-01 — The Polaroid Wall (spatial rebuild)

5.0-magnitude redesign of the rendering and build pipeline, executing the
locked Polaroid Wall concept as an interactive spatial wall. Spec:
`VAULT-REDESIGN-HANDOFF.md` (was on the desktop; copy in this folder).

### What structurally changed

- **`vault.py` rewritten as a renderer.** It no longer emits a stacked-panel
  page. It emits: the hand-authored `<section class="panel ...">` blocks
  verbatim inside a hidden `#source` container, plus JSON payloads (ledger
  meta, links), injected into `wall_template.html`. The runtime JS builds each
  polaroid photo and moves the section into the photo's back face. The
  hand-authored panel HTML was NOT restructured; the wrapper is build-time.
  That is why `film_ledger_panels` rows round-trip unchanged.
- **`wall_template.html` is new** and part of the pipeline: all CSS and the
  camera/mode engine live there, token-substituted by vault.py
  (`__PALETTES__`, `__FACTS_JS__`, `__SECTIONS__`, `__META__`, `__LINKS__`).
- **One camera, one wall.** Pan (drag), zoom (wheel/pinch), dive (click).
  Three wall regions: the ranked definitive wall (tier bands), the Shoebox
  (archive), the Hazy Wing (dark region). Four modes: The Wall, The Backs
  (flip + see-also flights), Constellations (deterministic force reflow,
  links become distance, only mode that moves photos), The Thread
  (press-and-hold light lines, red by Dixon's 2026-08-01 ruling, gone on
  release).
- **`links.json` is a new build input**, written from the `film_links` table
  before building (optional; empty is valid). See-also lines render on photo
  backs respecting `directional`; off-wall references render unlinked with a
  "(no photo yet)" mark.
- **`restore.py`**: logic unchanged except the generated comment no longer
  embeds the source name (it broke the byte-identical guarantee between the
  two restore paths). Source name still printed to stdout.
- **`check.py` rewritten**: 14 checks (superset of the old 8) against the
  spatial layout: counts, state styling, hazy no-certify, rank/tie order,
  camera pan+zoom, mode switching, wall dive, back flip + see-also, link
  directionality, goto flight, constellation reflow/restore, thread
  light/vanish (real mouse hold), certify end-to-end (guard, tray, re-rank,
  undo), restore convergence byte-compare. Browser resolution: sandbox
  chromium at /opt/pw-browsers/chromium, else PW_CHROMIUM, else system
  Chrome/Edge channel. Never `playwright install`.

### Contract guarantees, status

1. Supabase source of truth — panels unchanged structurally; new `silverlake`
   panel inserted into `film_ledger_panels` same pass. ✓
2. Two restore paths byte-identical (ledger AND build) — check 14. ✓
3. Drift guard survives verbatim in vault.py. ✓
4. Rewatch dedupe (`distinct on (slug) ... watched_at desc`) unchanged. ✓
5. Verification rewritten with more coverage, not less (8 → 14). ✓

### Data changes in the same pass

- `film_links` table created (RLS `dixon_only`, unique
  (from,to,relation), self-link check, weight 1..3) and seeded with 28
  hand-authored links from `film-links-seed.json`. All titles resolved, zero
  misses.
- **Under the Silver Lake panel authored and inserted** (slug `silverlake`).
  The Jul 30 watch (6.7) had a `film_log` row but no panel row; the wall was
  silently one film behind. Sourced from the verbatim hot take and the Jul 31
  session note. Definitive list is now 24 films.

### Superseded

- v1 stacked-panel pipeline archived in `legacy-v1/` (vault.py, restore.py,
  check.py, last v1 build).
- The old desk filters (set/sort/index views) are replaced by the spatial
  regions + modes. The CERTIFY tray protocol is unchanged.
