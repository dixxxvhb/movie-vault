# VAULT V4 — "THE MOTEL ROOM"

Handoff spec. Execute in full against `C:\Users\bowle\Code\movie-vault`. The deliverable is a
new `wall_template.html` (v4) + updated `check.py`, with `vault.py` untouched except where noted.
Rebuild `the-vault.html` at the end via the README's build steps and make all checks pass.
Archive the v3 template as `legacy-v3/wall_template.html` (copy, don't delete history).

## Concept

v3 is a flat wall with the room painted on. v4 puts the viewer INSIDE a run-down motel room,
first-person, like a video-game hub/lobby. The polaroid wall is the far wall. The viewer can
turn to a second wall to see the backs of all the cards. The shoebox sits on the floor; the
Dark Drawer becomes a nightstand. Cold open = waking from a coma.

## Non-negotiable invariants

- `vault.py`'s token contract is unchanged: `__PALETTES__ __FACTS_JS__ __SECTIONS__ __META__ __LINKS__ __PHOTOS__` all present exactly once in the new template. vault.py must run unmodified.
- Panel HTML structure (`<section class="panel SLUG">`) unchanged — `film_ledger_panels` rows stay portable.
- All data still inlined; single self-contained file; keep the Google Fonts @import (only external dep).
- Keep IDs where feasible: `#viewport #world #threads #source #dimmer #notecard` and classes `.photo .card .face .img .rank .arch .panel`. Where the redesign genuinely moves something (e.g. flip removal), update `check.py` in the same pass — checks may be rewritten but total rigor must not decrease (≥14 checks).
- Palette/typography: this is Dixon's PERSONAL project — existing vault palette vars, no DWD branding, no emojis in UI.
- Test with the playwright pip package driving system Chrome — NEVER run `playwright install`.

## Architecture — CSS 3D room

- `#viewport` gets `perspective: 1100px; perspective-origin: 50% 45%`.
- New root `#room` inside viewport, `transform-style: preserve-3d`. Camera = ONE inverse transform written to `#room`: `translate3d(...) rotateX(pitch) rotateY(yaw)` driven by a small camera state object `{x,y,z,yaw,pitch,zoom}` with eased tweens (keep the existing glide/flyTo feel, ~0.85s ease).
- Planes (each a flat div positioned in 3D, `backface-visibility:hidden` where sensible):
  - **Front wall** (`#world`, the existing wall — photos, salon bands, rail, baseboard, threads SVG) at `translateZ(-ROOM_DEPTH)`. All existing 2D layout code inside it keeps working in its own plane coordinates — the wall's internal code is REUSED, not rewritten. The old 2D pan/zoom camera is replaced by the 3D camera dollying toward/along this plane.
  - **Backs wall** (`#backswall`, NEW) — right-hand wall, `rotateY(-90deg)` at `translateX(+ROOM_WIDTH/2)`. Same salon layout coordinates as the front wall, but each card renders back-side-out: the panel content (moved from `#source` at runtime, exactly like v3 moved them into `.face.back`). Clicking a back = dive-to-read (camera flies square to that card, panel readable). THE FLIP MECHANIC IS DELETED — no rotateY card flips, no `.flipped`. This is the whole point: nested preserve-3d flip quirks go away.
  - **Floor**: `rotateX(90deg)` plane, worn motel carpet (CSS repeating gradients + noise via layered radial-gradients, a threadbare path worn toward the wall).
  - **Ceiling**: dim plane, water-stain bloom in one corner (radial-gradient).
  - **Left wall**: window with night outside + a neon sign glow (animated flicker, slow 7–9s cycle, CSS only) washing pink/red light into the room. Curtain silhouette optional.
  - **Foreground**: at the seated position, a subtle foot-of-bed / chair-arm silhouette low in frame (a near-camera dark plane) to sell "I'm sitting here."
- **Room dressing = run-down motel**: peeling wallpaper (layered gradients, a curled seam), stains, baseboard scuffs, the existing lamp promoted to a real free-standing lamp between viewer and wall (its glow lights the wall). Reuse/adapt the existing `.arch` gradient-div technique — no images, no libraries.

## Furniture (replaces v3's painted box/cabinet regions)

- **Shoebox** sits ON THE FLOOR near the front wall (a small 3D box: 4–5 planes). Click → lid tips open (transition) → camera flies down/into it → the awaiting-development grayscale contact prints (existing riffle stack, scale ~.56) fill the view. Exit = fly back to seated. Certify's development animation + flight-to-wall survives: the print now flies up out of the box to its slot on the front wall.
- **Nightstand** (replaces the Dark Drawer cabinet) against the wall: simple 3D box with a drawer front, scattered cash on top (a few CSS bill rectangles, slightly askew). Click → drawer slides out on Z → camera dives to look in → Dark Drawer films (scale ~.5) inside. Exit = fly back.

## Camera grammar / modes

- States: `WAKE → SEATED` (home) → `WALL` (dollied to front wall; pan/zoom along it = existing drag/wheel/pinch remapped to camera x/y/z), `BACKS` (yaw to right wall, same nav), `BOX`, `DRAWER`, `READ` (square to one card, either wall). Back-out stack preserved (`diveStack` concept survives).
- SEATED idle: slight mouse-move parallax (±2–3° yaw/pitch, eased), dust motes drifting in the lamp light (few CSS particles, cheap).
- Mode chips on `#desk` update: Wall / Backs (now a turn) / Investigation / Thread-related chips as in v3. **Investigation mode is unchanged in behavior** and lives on the front wall: red lines, ember trails, follow-the-link flights, step-back reflow — all of it, now with the camera flying along the wall plane. Threads SVG stays glued inside `#world` so lines live on the wall (correct: strings are ON the board).
- Clamp camera so you can never see behind the set (no planes exist behind the seated position except the foreground silhouette).

## Cold open

Cold open, waking from a coma: page loads to black → slow eyelid blink (two lid divs, 2 blinks, blurred first frame) → lamp buzzes/flickers on mid-second-blink (audio-free) → camera starts slightly askew/low and unsteadily rights itself into SEATED over ~2.5s. Total ≤4s, skippable on click/keypress. Runs once per load (no localStorage gating needed).

## Performance

Target: iPhone Safari PWA. Budget the GPU for lamp glow + neon flicker + motes; everything else static. Use `will-change` sparingly (room transform + animating planes only). 24 SVG fronts under perspective is fine; avoid animating filters.

## check.py

Update to the new reality. Keep/adapt: panels present in DOM, threads lines + ember, mode chips, salon band ordering on front wall, develop/certify cycle. Add: backs wall has all 24 panels mounted, camera state transitions (SEATED→WALL→BACKS), shoebox open state, nightstand drawer state, cold-open completes/skips. ≥14 checks, all passing, system Chrome via playwright pip.

## Wrap-up

1. Rebuild `the-vault.html` per README (all vault.py tokens resolve).
2. Run full check.py — green.
3. Update repo CHANGELOG.md with a v4 entry (same style as v3's).
4. git commit locally (repo has no remote). DO NOT publish or touch any artifact URL.
