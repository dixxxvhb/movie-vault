# STATUS

The running list. Open, agreed, done. Keep it current so a new session or a new
agent picks up without Dixon re-explaining.

Plan: `docs/plans/2026-09-04-no-vacancy-plan.md`
Source material: `docs/plans/2026-09-04-six-designs.md`

---

## Done

| What | Commit | Notes |
|---|---|---|
| Wall refreshed to 47 films | `841a56a` | Se7en, Inside Man, The Big Short, The Amateur, L.A. Confidential + 3 bloodlines. avg 8.55 |
| `scripts/PULL.sql` | `3074cc6` | 13 queries, one per data file, each returns its file's final contents. Caught the 10 hand-authored archive slugs a naive slugify would have orphaned |
| Two live WCAG 2.3.1 failures fixed | `43569e6` | `flashPolicy.js`. 3.5 Hz to 2.17 Hz, red saturation 0.862 to 0.668, swing 0-40 to 6.1-34.0 |
| `settings.js` | `b6b6d73` | One versioned profile, OS-derived defaults, four presets, URL overrides |
| `input.js`, `walkKeys.js` retired | `f8067d3` | 16 named actions, rebindable, gamepad, keyboard + snap turn wired. Verified: ArrowRight then W moves (0, 2.00) to (1.82, 1.82) |
| `?text` route | `02221ef` | Whole Vault as a document, split ahead of the 3D bundle. 460 KB to 50 KB on that path |
| Derived citation graph | `c778382` | 20 of 21 taste laws now cite their evidence films, 40 citations, no hand-authored table |

## Done, session two (the slice)

| What | Commit | Notes |
|---|---|---|
| Pipeline: emotional_key + forward bloodlines | `6be2f8c` | 47 keys emitted; the 4 "dropped" links point at queued films and now resolve with state. Zero dropped for the first time |
| Portrait phone fits the wall | `4aed73e` | Stations declare `frame`, the world width they must show; the rig dollies back on narrow viewports. Desktop byte-identical |
| THE HOUSE LIGHTS | `f18f244` | A switch by the door in every room, derived from the shell. Film state and motel state, ~700ms apart. All 26 template rooms, every shell kind, 60fps in both |
| FRAGMENTS | `bfa5831` | The take is printed on the room's own props, not a card. Auto-split, verified lossless across all 47 takes. The floating card stands down |
| THE LAWS | `5e55bc0` | `visits.js`, the first persistence. The Mirror fills in behind you: walk the films a law cites and it writes itself |
| House lights in the bespoke 16 | `9ccb970` | Rig moved up to FilmWorld. Every room has the switch now, zero lines changed in any bespoke file. Blend applied after the room's own grade override, so it composes with Stby's swerve instead of fighting it |
| Options panel + real pause | `d2746d8` | 14 switches, 11 radio groups, 4 presets, in every world. `frameloop="never"` actually stops the loop |
| Settings that do things | `c2f1201` | cut-instead-of-fly, head bob, cold open, dust, high contrast. Edge luminance 42.0 to 55.8 in high contrast |
| Flash budget + Threshold | `9e3df53` | One shared 700ms floor across all full-view events. A content warning that names the specific hazards, before any WebGL runs |

**Final QA, all green:** 41 rooms in both house states, zero console errors.
The loop with real visits. `?text` at 47 films with zero canvas. The gate on a
clean profile. 60fps in every room in both states. Bundle 420 KB gzipped.

**The slice is proven.** Stand in Malignant for seven seconds, stand in Sorry
to Bother You for seven seconds, walk to the Mirror, and the doctrine those two
films taught him has written itself on the wall. Real visits, no test hook.

## Movie Night v4, pass 1

Brief: `docs/plans/2026-09-13-movie-night-v4.md`. Database side only. Applied
live to Supabase `swjqlfcqvcrnydpyjyog` through the MCP, never `db push`.

| What | Commit | Notes |
|---|---|---|
| Recs expire | `977b224` | `film_recommendations.status` gains `expired`; 61 suggested rows older than 21 days backfilled. `film_expire_recs()` is idempotent and runs at the top of the brief. `film_status` ranks `expired` below `dismissed`; `film_check` reads `FRESH (pitched Aug 2026, passed)` |
| Open rec cap | `977b224` | Insert trigger refuses a 16th open suggested row with `open rec cap 15, dismiss or expire first`. Tested in a rolled-back transaction |
| Prediction loop | `977b224` | `predicted_score`, `predicted_on`. The log trigger appends `{title, predicted, live, date}` to the profile's `calibration.predictions[]`. `film_calibration` reports n, mean signed error, mean absolute error, error by key and by tag. Reported, never applied |
| `film_taste_signals` | `977b224` | Report-only. tag (n>=3), emotional key, runtime band, decade, director (n>=2), genre (n>=3). 63 rows on current data. No subtitled row this pass |
| `film_sessions`, `film_key_tags` | `977b224` | The night's shape written at session open; the key-to-tag map created empty for Chat to seed |
| `film_pitch_pool` | `977b224` | Fresh or expired, on an active service, inside the runtime budget, ranked by key match then taste signal then never-pitched. Works with `film_key_tags` empty |
| `film_recall(q)` | `977b224` | Full text over hot takes and long form, session notes, lesson rules and evidence, plus trigram on titles. GIN indexes added |
| `film_rank(title_id)` | `977b224` | Rank over ledger plus certified. Top 5 verified identical to the wall's hang order in `emit_vault_data.py` |
| `film_certify_shelf` | `977b224` | Archive, memory 9 or better, uncertified, top 3. In the retro always, in the brief only on a week with no sessions |
| Brief diet | `977b224` | `film_session_brief()` 27,523 chars to 7,221. Acceptance was under 8,000 |
| Retro grows | `977b224` | Calibration report, certify shelf, law audit (active weight 5 against the cap of 10) |
| SKILL.md to v4 plus four references | `ea7e4c4` | Session open writes the session row, pick gate gets Mode and Pool first, predictions on every pitch, the rank line out loud, weight 4 vs weight 5 semantics, `film_recall` before memory |

### Open, this pass deliberately did not do it

- **The retro pass.** Chat and Dixon demote the 31 active weight-5 laws to 10.
  Until that lands, the brief carries first sentences instead of verbatim law
  (`lessons_digest.law_verbatim` says which). Everything else is waiting on it.
- **The law-cap trigger.** The cap of 10 is documented and audited in
  `film_retro().law_audit`, not enforced. It ships after the demotion.
- **TMDB enrichment.** The four title columns are deferred; the brief says so
  and `references/schema.md` marks them "pass 2, not live".
- **Repackage `docs/movie-night/movie-night.skill`.** Untouched on purpose.
  The installed skill is still v3 until this is repackaged after the retro.

### Hazard worth naming

The open rec cap is live at 15 while the table is still being drained. Open
suggested was 13 at the end of this pass, so there is room, but the cap can
refuse a pitch mid-session. The error text says what to do; it is not a bug.

## Agreed, not started

**Phase 1, the pipeline.** Half done. Remaining, and still blocking:
- [ ] Emit the 78 `pitched` titles with their reasons (the far wing)
- [ ] Emit the 154 recommendations with reasoning (every proposed ending needs them)
- [ ] Emit full `film_status` state per title, plus `certified_on` / `certified_score`
- [ ] `plain_summary` per film, 2-3 sentences, ~8th-grade. Hand-written, never auto-simplified
- [ ] `data/archive.json` is 64 against 65 live. `PULL.sql` query 10 fixes it

**Phase 2, the slice.** House lights done everywhere. Still owed:
- [x] ~~Fragments in the 16 bespoke rooms~~ **CLOSED, do not reopen.** Tried
      deriving carriers from each room's collider registry so the take could
      auto-place without per-room authoring. Built it, looked at it, reverted
      it. Two reasons. The placement was bad: a scrap ends up edge-on beside a
      door frame, which is worse than no scrap. And more importantly the
      premise was wrong. The floating-card problem is a TEMPLATE-room problem.
      The bespoke sixteen already hand-place his writing in world (Memento's
      wall of notes, Sicario's mission brief on its stand, Sorry to Bother
      You's RegalView poster), and a generic fallback degrades rooms that
      already solved it better. If a specific bespoke room ever reads as
      card-y, author `info.fragments` for that one room.
- [ ] The bloodline door between the two, opening on the authored note
- [ ] The pocket you cannot see from the door, and one go-stand-somewhere-else
      sightline per room
- [ ] Ear to the door (needs the walkway)
- [ ] Judge the whole thing on a phone

**Then:** spine (zustand store, controller, lazy rooms, render path,
deterministic mode), shell and arrival, the building, the rooms, below grade,
the ending.

## Owed to Dixon (decisions only he can make)

1. The Court (multi-storey, floor = score band) or the flat strip? Judges split.
2. The basement guess: does dialling a number beside his cheapen the numbers?
3. Dawn as a soft ending at ~40 minutes, or no clock?
4. The 78 pitched doors are public. Comfortable?
5. The owner's verb. What do you want at 1am with the take just written?

## Verified this session, worth not re-deriving

- **All 60fps.** Wall, malignant, enemy, memento, darkknight, br2049, sicario,
  stby, barbarian: zero console errors, 60fps each when measured in isolation.
  A sweep that opens nine pages in one browser reports 22fps for the wall and
  35 for memento; that is measurement contention, not a regression. Measure
  one page per browser instance.
- **The mobile arrival WAS broken and is now fixed** (`4aed73e`). At 390x844
  the wall used to crop on both sides with Memento off the left edge. Stations
  now declare the world width they must show and the rig steps back to fit.
  Before and after: `_shots/sweep-mobile.png` and `_shots/frame-phone.png`.
  Still true that the wall sits small in portrait with dead ceiling and floor
  above and below it; the arrival composition is Phase 4 work.

## Standing hazards

- ~~Flash~~ **CLOSED.** `flashPolicy.js` covers `DwellConcede` and `Enemy`
  (rate and saturation), and `claimFlash` now gates every full-view luminance
  event through one shared budget with a hard 700ms floor, which caps the
  whole app at 1.4 Hz no matter how many systems fire. `ResetFlash` and
  `ScheduledCut` route through it and both respect `content.roomEvents`.
  Still unrouted and worth doing: Barbarian's smash cut, `Develop`'s wash,
  `ColdOpen`'s blink (the last already honours `motion.coldOpen`).
- ~~No content warning~~ **CLOSED.** `Threshold.jsx` renders before any WebGL
  work, names the specific hazards with the specific films, and offers the
  calm and steady presets in the same breath. Verified: zero canvas elements
  behind the gate.
- ~~No pause~~ **CLOSED.** `frameloop="never"` while Options is open.
- **`?text` is the only screen-reader path.** The canvas has no focusable
  proxies yet. This is the largest remaining accessibility gap.
- **Most Options switches are stored but unread.** Wired: flash level,
  keyboard turn, travel, head bob, cold open, dust, high contrast, room
  events. Not yet: text size, captions, mono, plain language, hold-to-toggle,
  invert Y, per-room content skip.
