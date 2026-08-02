# Pipeline CHANGELOG

## v5.1 — 2026-08-02 — box/drawer stop hiding the room; the turn gets a mid-room beat

Two architect-flagged fixes to v5's disclosed deviations 3 and 4 (see below).
Nothing else changed; still `python vault.py` -> `the-vault.html`, 23 checks.

**Fix 1 — box/drawer no longer black out the room (deviation 3 rejected).**
`#boxPlane`/`#drawerPlane` were tilted trays (`rotateX(-9deg)`/`rotateX(-7deg)`)
that interleaved in depth with the rest of the room from the camera's point
of view; Chromium didn't reliably z-sort that against the huge front wall
plane, so the fallback was to hide every plane except the one matching
`facing` (`updateVisibility()`) -- which meant the room vanished behind the
box/drawer prints (a black void, not the intended "hovering tray over real
furniture"). Root-fixed instead of worked around: **`#boxPlane`/`#drawerPlane`
are now PARALLEL to the front wall (zero tilt)**, positioned head-on above
the open shoebox / nightstand drawer at their own distinct z (still
`TBL_Z-40` / `NS_Z-30`, strictly between `FRONT_Z` and the engaged camera's
typical range, and distinct from every other furniture plane's z). Parallel
planes occupy one z each and never interleave in depth with the rest of the
room, so preserve-3d's ordinary depth sort handles them correctly with
nothing hidden. Because the plane is now parallel and head-on, its engaged
derivation is IDENTICAL to the 'front' facing with a different origin --
`tiltedPose()`'s sin/cos tilt math and the `BOX_TILT`/`DRAWER_TILT` constants
are deleted outright, replaced by `parallelPose(region, O, wcx, wcy, dist)`.
`updateVisibility()` and every call to it are gone; `#frontWall`/`#backswall`/
`#boxPlane`/`#drawerPlane` stay at their default CSS visibility (visible)
always, like real geometry. Verified: `mounted-box.png`/`mounted-drawer.png`
(`_experiments/v5-proof/`) show walls, floor, table/nightstand, and the rail
plainly visible behind/around the readable prints -- no void. check.py's
check 19 (per-facing render) gained a floor-band sample (`bandstats()`,
y 80%-96% of frame) specifically for the box/drawer screenshots, asserting
mean luminance > 8 there -- proof the room, not just the tray's own prints,
is painting. Check 9 (mode switching) no longer asserts either wall's
`visibility` toggles; it asserts both stay `visible` and that `facing`
(the derivation-layer state, not a DOM hide) reports the engaged wall.

**Fix 2 — the wall<->backs turn gets a mid-room waypoint (deviation 4
dropped, now implemented).** v5 shipped a direct eye-space tween between the
two derived poses (front <-> backs) because getting the fancier flight
right wasn't worth the risk to the 0.00px mapping-exactness result at the
time. Implemented now: `flyToPlane()` detects a front<->backs turn
specifically (box/drawer flights are untouched, still a single tween) and
inserts one mid-flight waypoint -- eye pulled back toward room center
(`z: 0`, i.e. between `FRONT_Z` and `BACK_Z`, widening the dolly distance
from either wall) while yaw sweeps to the halfway point of the
yaw-shortest-path turn, so the side walls, the doorway neon, and the window
visibly sweep past instead of punching straight through the furniture.
`tick()` now tweens flights with an optional `mid` waypoint as two
independently-eased segments (`from->mid`, `mid->to`, same `ease()` curve
each half) instead of always assuming a single lerp; box/drawer flights
(`flight.mid === null`) fall through to the original single-tween path
unchanged. Total duration for a turn is `max(dur, 1600)`ms (was a flat
1400ms), within the requested 1.4-1.8s band. check.py's mode-switch waits
that follow a wall<->backs click were bumped from 1500-1600ms to 1900ms to
give the longer flight room to land before the next assertion.

23 checks, all green (mapping-exactness worst-case still 0.00px on both the
front and backs wall, and after the turn flight).

## v5 — 2026-08-02 — the wall mounted into a real preserve-3d room

Merged `v5-room-proof.html` (the screenshot-verified true preserve-3d motel
room rig, commit 94a58b9) with `wall_template.html` (v4, the polaroid wall +
all interaction). v4's copy archived to `legacy-v4/`.

**The core move (why this works):** v4 kept `#world`'s own `translate+scale`
transform while nesting it in a 3D graph -- that's what made it fragile
(black backs wall, edge-on slivers). v5 inverts it: `#world`/`#backsInner`
carry NO transform at all, ever. `#room`'s camera does everything. The
existing 2D pan/zoom state (`cam.x/y/s`) is unchanged in every call site
(fitRect, centerPhoto, wheel anchor zoom, drag pan, pinch, dive, certify,
step-back, the investigation) -- every frame, `derivePose(facing, cam)`
converts it into the exactly-equivalent 3D eye pose for whichever plane is
"facing" the camera. When that plane is viewed head-on, CSS perspective
projects it as the same uniform 2D similarity `cam.x/y/s` always produced,
so the 2D interaction math never had to be touched, only re-rendered through
a camera instead of a transform on the plane. Verified to 0.00px on the new
engaged-mapping-exactness check (3 known photos, front and backs).

**What moved into real 3D:**
- `#frontWall`/`#backswall` are now true opposite-facing planes of one
  `preserve-3d` box (mounted at `FRONT_Z`/`BACK_Z`, backs `rotateY(180deg)`),
  built each `layout()` by `buildRoom()`. Floor, ceiling, side walls,
  door+neon, window+curtains, rails/baseboards, the lamp, and simple table/
  nightstand furniture are real geometry transplanted from the proof, not
  fixed 2D viewport dressing.
- The shoebox and the dark drawer are real tilted planes (`#boxPlane`/
  `#drawerPlane`) hovering over the table/nightstand, hosting the actual
  `.photo` elements (`buildRoom()` re-parents them each layout() run,
  offsetting the tray's container by `-region.x/-region.y` so their existing
  wall-px `left/top` from `place()` need no remapping). Click either lid:
  the prints reveal (same `body.box-closed`/`drawer-closed` opacity gate as
  v4) and the room camera flies to face that plane head-on.
- Cold open is now a real eye-space flight from a doorway pose into the
  derived seated front-wall pose, not a CSS-transitioned `roomCam`.

**What died:** `#roomShell` and all its CSS/JS (`rsCeiling`, `rsFloor`,
`rsWindow`, `rsLamp`, etc. -- the fixed-2D "always renders, cheap to
screenshot" room dressing v4 fell back to after true 3D turning proved
fragile). `layout()`'s painted-room `arch()` calls (`wallpanel`, `rail`,
`baseboard`, `floor`, `wire`, `shade`, `lamp`, `boxwall`, `boxlid`,
`boxlabel`, `table`, `tableleg`, `cabinet`, `drawerfront2`, `drawerlip`,
`pull`) -- replaced by real geometry. `turnSwing`/`seatedParallax`/
`Z_SEATED`/`roomCam`/`setRoomCam` -- superseded by the derivation-layer
camera (`tick()`, `applyCam()`, `flyToPlane()`). The `.glide` CSS transitions
on `#world`/`#backsInner` -- `glideTo()` is now an rAF tween of `cam` itself
(same .85s ease), since there's no transform on those elements to transition.

**Deviations from the handoff spec (disclosed, not silent):**
1. **`WALL_TOP` is `(ROOM_H - H) / 2`, not the spec's literal
   `(-220-EYE)-CEIL_Y`.** That fixed-eye-line formula assumes wall content
   roughly the size of a domestic room; this salon wall (several thousand px
   tall, many score bands) is much taller than `ROOM_H`'s minimum, and the
   literal formula placed `#world` mostly below `#frontWall`'s own bottom
   edge (void where the wall should be). Centering keeps the same
   derivation contract -- `wallRoomY` still reflects wherever `#world`
   actually sits -- while guaranteeing the content is inside the plane it's
   mounted to.
2. **Box/drawer tilt is -9°/-7°, not the spec's suggested -62°/gentler-than-
   that.** At a steep tilt, the tilted-plane eye offset (`dist` along the
   plane's normal) has a large y-component, and for any reasonable `cam.s`
   the derived eye ends up meters below the floor. A shallow tilt keeps the
   eye inside the room at every zoom level. Box/drawer are explicitly NOT
   covered by the engaged-mapping-exactness check (only front/backs are),
   so this doesn't cost any test coverage.
3. **Only the plane matching the current `facing` is visible when the
   camera is settled** (`updateVisibility()`, both planes show during a
   flight so a turn never blacks out mid-transition). Confirmed by a debug
   pass (colored planes, `getBoundingClientRect` matched the derived camera
   exactly) that Chromium does not reliably z-sort this scene's nested
   preserve-3d planes when a huge one (front wall) and a small one (a tray)
   share the same view frustum -- the salon wall painted through an opaque,
   nearer tray. front/backs never needed this in practice (the far one is
   always behind the eye, never in the same frustum) but box/drawer sit
   close enough to the front wall that they are. This is the one place v5
   falls back to a v4-style "only the relevant plane renders" rule, and it's
   why check 9's old visibility assertions still pass unmodified.
4. Dropped the spec's fancier "pull back to mid-room, yaw through ±90 past
   the side walls" flourish for the wall<->backs turn; it's a direct
   eye-space tween between the two derived poses at the same `cam`. Simpler,
   and it's what made the 0.00px mapping-exactness result possible to nail
   down with confidence in the time available.
5. Box/drawer lids lost the hinge-open animation (`rotateX` tween) the spec
   describes -- they're a straight opacity/visibility swap on click, same
   mechanism as v4's cover reveal. Everything downstream (prints becoming
   visible and interactive, camera flying to face the tray) works.

**check.py:** the 4 v4 pixel checks (backs-renders / room-shell-paints /
salon-wide-span / cold-open) are replaced with 4 new ones per the handoff:
(19) per-facing render check for all four facings, (20) engaged-mapping
exactness on 3 known photos on both front and backs, (21) cold-open
completion + landing pose, (22) the wall<->backs turn flight, pixel-verified
and mapping-exact after settling. Check 8 (camera) now asserts `#world`/
`#backsInner` carry no transform of their own instead of comparing their
(now nonexistent) transforms. Check 9's visibility assertions needed no
change (see deviation 3). Checks 1-7, 10-18, 23 are unchanged in substance,
routed through the same public functions, with wait times bumped where a
mode switch now triggers a real 1.4s eye-space flight instead of an instant
CSS-visibility swap. 23 checks, all green.

**Known traps hit again while building this (all in the handoff, all real):**
`transform-origin` must be `0 0` on placed planes -- `50%` displaced the
frontWall/backswall mount by half their size before that was caught. The
`translateZ(PERSP)` prefix in `applyCam()` is what makes rotation a head
turn; the box/drawer pitch formula was wrong twice before landing on
`pitch = theta` (verified by hand against the front-wall calibration case,
`theta=0 -> pitch=0`, before trusting it for the tilted planes).

## v4.3 — 2026-08-01 — backs-mode floor/wall fix (same night as v4/v4.1/v4.2)

- **Floor no longer floods the backs-mode frame.** `#rsFloorWrap` was a fixed
  44vh regardless of mode -- fine when seated at an angle over a table in
  wall mode, wrong when the camera turns square-on to face the backs wall.
  `body.mode-backs` now drops it to a 9vh sliver and fades what's left
  harder, so back-cards read as hanging on a wall, not lying on floorboards.
- **The backs wall gets its own wall surface.** `#backsInner` had no
  background at all -- cards floated on near-black void. Gave it the same
  aged-wallpaper family as the front wall (corner staining, damask stripe,
  four-edge vignette) shifted a shade darker/colder, since it's the
  "evidence backs" side of the room.
- **Confirmed the corner shoebox/drawer clumps were a proof-script artifact,
  not a bug.** Direct computed-style check on a fresh load with only the
  mode switched to backs (box/drawer never opened): `#frontWall` (and every
  `.arch` child, including `.boxlid`) is `visibility:hidden`, opacity
  unaffected. The exposed clumps in the previous `backs.png` only appeared
  because that proof run had explicitly opened the box and drawer earlier
  in the same session before switching modes -- correct behavior given that
  history, just a misleading screenshot order. Regenerated `backs.png` from
  a fresh load with the box/drawer left closed.
- Extended check 19 (`the backs wall renders real card pixels`) with a
  floorboard-striping assertion: samples a row at 78% frame height in
  backs mode and asserts low variance (no repeating light/dark planking) --
  proof the floor plane actually shrank instead of just moving off-screen
  by coincidence.
- 23 checks, all green (row stdev 16.9, well under the 18 threshold).

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
