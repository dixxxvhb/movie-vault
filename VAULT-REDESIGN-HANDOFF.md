# The Vault: Polaroid Wall Redesign. Handoff for Claude Code

## Mission
Transform the Vault (Dixon's ranked wall of every film from the movie-night ritual, currently a stacked-panel HTML page) into an interactive spatial **Polaroid Wall**: pan, zoom, roam, with a home mode plus three switchable connection modes. This is a **5.0-magnitude redesign of the rendering and its build pipeline**, executing a concept that is already locked. You are raising execution, not inventing a metaphor.

## Read this first (before writing any code)
1. Supabase project: **`swjqlfcqvcrnydpyjyog`**.
2. Pull the laws from source. They override this brief if anything conflicts:
   ```sql
   select scope, rule, weight from film_lessons where active order by weight desc;
   ```
3. Read the current pipeline before replacing it: `vault.py`, `restore.py`, `check.py`, and the `film_ledger_panels` table.

Database conventions: all tables are `film_*`; RLS is on (authenticated + `is_dixon()`), so go through the Supabase MCP. Every insert needs an explicit `gen_random_uuid()` for `id` (there are no column defaults).

---

## The concept (LOCKED, weight-5 law)
**The Polaroid Wall.** Every film is a photo taken the night it happened. The Memento thesis made literal: an external memory system, the ledger remembers what we can't. Extend this metaphor; never regress to lists or generic galleries.

Three logged states, three kinds of photo:

| State | Photo treatment |
|---|---|
| Ledger / Definitive (watched together, scored live) | Developed and hung. Full color, loud. |
| Archive (seen before, scored from memory) | Faded, shoebox quality, score penciled. Quiet, flat, desaturated. |
| Hazy Wing (seen, too faded to rate) | Undeveloped dark frame, awaiting the chemical bath of a rewatch. Renders **no certify affordance** (Hazy cannot certify). |

Certifying an Archive film = writing on the photo **in pen**: it reclaims its color field and re-ranks in place with a scroll back into view. Clicking any photo flips it to read the back.

**The artifact is stateless.** Certification does not write to the database from the wall. The certify affordance produces a `CERTIFY` paste block (Title | score | his one line) that Dixon pastes into chat; the chat side persists it and triggers a rebuild. Build-time certified entries come in via `certified.json`. Keep this protocol; do not add network calls or client-side persistence.

---

## The experience

### Home base + three modes
The wall is the constant; the mode decides what connections do.

1. **The Wall**: home base. The ranked wall, tiers and bands intact. Holds still.
2. **The Backs**: flip to read. Each back carries "see also" lines in the handwriting; tapping a reference flies the camera over and zooms to the kin photo. Truest to the thesis.
3. **Constellations**: links become **distance**. Connected films physically cluster; zoomed out, Dixon's taste reads as regions.
4. **The Thread**: hold a photo and a single restrained line of light draws to its kin **only while held**; release and it's gone.

### Locked fork rulings (Dixon's calls, do not reopen)
- **Reflow only in Constellations.** Modes 1, 2, and 4 keep the ranked wall fixed so he always knows where things live. Constellations animates the reflow: photos drift into clusters on enter, drift home on exit. The transition is the delight, never a hard cut.
- **Links are hand-authored, never vibe-matched.** See the links layer.

### Physicality and camera
- Photos hung at slight angles, tape, slight corner curl, real drop shadow. A wall, not a grid.
- Pan and pinch-zoom, roam freely, dive into a single photo until it fills the frame and the back is readable.
- Must work with mouse and trackpad; touch is a bonus.

---

## HARD BANS (the usual failure mode, read twice)
Dixon has banned this drawer twice, inside this exact concept:

- **No conspiracy/evidence board.** No standing red-string web, corkboard, pushpins, serial-killer wall. The Thread is the ONLY string-like element and survives the ban solely because it is opt-in and temporary. It must look like nothing yarn has ever looked like: thin, light, on demand, gone on release. If it reads as yarn, it has failed.
- No noir, typewriter, VHS, marquee, or neon.
- **No DWD branding.** No forest green, pink, terracotta, ivory. No Cormorant, Outfit, Bebas. The Vault has its own look on purpose.
- No emojis in UI (small unicode glyphs welcome).
- No localStorage or sessionStorage, ever.

## Design system (preserve and elevate)
- Fonts: **Instrument Serif** (italic display), **Schibsted Grotesk** (body).
- Per-film palettes as CSS custom properties: `--bg`, `--fg`, `--sub`, `--acc`, `--glyph`.
- Ledger loud and full color; Archive quiet and flat; Hazy dark and undeveloped.

---

## The links layer (NEW)
Connections are hand-authored bloodlines named across actual movie-night sessions, never `vibe_tags` matches (tag-matching is noise and kills the detective high).

**Division of labor:** you own the **schema and rendering**. The link **content** is authored by the chat side (Leonard), mined from `film_lessons` and `film_session_notes`. A draft seed (JSON) may accompany this brief; design the schema against it.

Proposed table `film_links` (adjust shape if you have a better one, then say so):
- `id` uuid (explicit `gen_random_uuid()`)
- `from_title_id`, `to_title_id` → fk `film_titles`. **Links may only reference existing title rows.** Some bloodlines below name films not yet watched; skip those until their titles exist.
- `relation` text slug (`sheridan-writer`, `reveal-as-event`, `thin-ensemble`, `antibodies`, `nolan-arc`, ...)
- `note` text: the human sentence that becomes the see-also line on the back
- `weight` int: strength
- `directional` bool: see-also can be one-way
- `source` text: `hand-authored` | `mined-lessons` | `seed`

To avoid an empty wall on night one you may auto-add weak links for shared writer/director, marked `source='seed'` and rendered visibly lower-confidence.

**Bloodlines to design against** (formalized separately; illustrative here):
- Execution meritocracy: Sicario 9.9, the Sheridan writer line.
- Reveal as event: Malignant 5.4 (explained, died) vs Sorry to Bother You 9.4 (staged, soared).
- Thin-ensemble tax: Annihilation 7.4 / Sunshine vs Coherence 8.9 / Sorry to Bother You 9.4.
- Antibodies: The Game 6.8, pre-2000 twist classics strip-mined by their copies.
- Nolan arc: Batman Begins, The Dark Knight, The Dark Knight Rises (in order).
- Fun shelf: The Nice Guys 8.6, counterprogramming the dread lane.

---

## THE BUILD CONTRACT (non-negotiable guarantees; the implementation is yours to rewrite)
The Vault is a **pipeline, not a file**. Panels live in `film_ledger_panels` (source of truth); the artifact regenerates each session via restore, then build, then verify. A redesign that changes panel structure without moving the pipeline gets **silently eaten on the next rebuild**. This has happened once already.

This redesign will cut deep into `vault.py` and `restore.py`. Treat it as a **pipeline rewrite that preserves these guarantees**, not a careful edit of the old scripts:

1. **Supabase is the source of truth.** All panel markup/structure changes are re-stored into `film_ledger_panels` in the same pass. That insert is the only reason the next session can rebuild.
2. **Two restore paths, identical output.** The artifact-staged path and the database-pull path must converge to byte-identical builds (deterministic ordering, explicit tiebreaks on score ties).
3. **Drift guard survives.** If a Ledger title also appears in the Archive or Hazy data lists, the build fails loudly with the film named.
4. **Rewatch dedupe survives.** The meta query keeps `distinct on (slug) ... order by watched_at desc` semantics: latest live score wins.
5. **Verification is rewritten, not gutted.** The current 8 Playwright checks assume the stacked-panel layout and will not survive a spatial wall. **Rewrite the check suite for the new layout with at least equivalent coverage** (all films render, states styled distinctly, ranks correct, modes switch, restore paths converge). Do not delete checks to go green.

Environment: Chromium is preinstalled at `/opt/pw-browsers/chromium`; point the checks there. **Never run `playwright install`.** A `ERR_TUNNEL_CONNECTION_FAILED` on the Google Fonts import is benign and environmental; filter it out.

## Deliverables (what "done" means for you)
1. Rebuilt pipeline (`restore.py`, `vault.py`, new check suite) passing all checks.
2. `the-vault.html` built and verified on disk.
3. All panels re-stored in `film_ledger_panels` in the new structure.
4. `film_links` schema created (+ seed links if provided).
5. A short CHANGELOG of what structurally changed in the pipeline.

**Do NOT attempt artifact delivery.** Pushing to artifact id `the-ledger` (SendUserFile, then update_artifact) happens afterward from a desktop-connected chat session; that tooling is not assumed to exist in your environment. Your job ends at a verified build + stored panels.

## Non-goals
- Reopening the Polaroid Wall concept or the fork rulings.
- Inventing new connection semantics beyond the four modes.
- Authoring link content (schema yes, editorial no).
- Artifact delivery.

If something genuinely cannot be built as specced, flag it and propose an alternative **within the metaphor**. Do not swap metaphors.
