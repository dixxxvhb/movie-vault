# Pipeline CHANGELOG

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
