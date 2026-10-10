# STATUS

The running list. Open, agreed, done. Keep it current so a new session or a new
agent picks up without Dixon re-explaining.

Plan: `docs/plans/2026-09-04-no-vacancy-plan.md`
Source material: `docs/plans/2026-09-04-six-designs.md`

---

## Rooms for the eight Oct 4 and Oct 7 films (2026-10-10)

Dixon's pick from the Oct 10 check-in. Same shape as the Sep 27 fifteen: a template room in the film's own place, verbatim take scraps placed by hand, a sound recipe each. Headless check of every room in swiftshader: zero console errors, framing looked at.

| Film | Room |
|---|---|
| Dunkirk | The Mole: the queue down the boards, crates, a stretcher, the sea below, a little boat alongside, the boats' light coming out of the haze. The board at the end carries the three clocks (THE MOLE ONE WEEK, THE SEA ONE DAY, THE AIR ONE HOUR); the verdict is pinned to it. Sound: surf, a watch tick, a tone that climbs and never arrives |
| Gone Baby Gone | Helene's apartment at the end: Patrick and Amanda on the couch, the TV on low, the MISSING poster still up |
| Hot Fuzz | Sandford's square: Village of the Year sign, fete table, bench, police car, the swan, the Crown, the church, Angel mid-air with two guns |
| The Death of Stalin | The dacha study: rug, desk, the record still on the player, him on the floor, the Committee round him. One scrap (one-clause take), Yudina's note on the floor |
| Upgrade | The hospital bed he dreamed: Grey in bed, Asha in the chair, the monitor at 60 (PulseBeat) |
| Primal Fear | The courtroom between sessions: bench, witness stand, both counsel tables, rail, gallery. Duplicates (subtle) on everything |
| Frailty | The cellar under the rose garden: the stair, one bare bulb, the axe on the bench, his list, a set on a crate showing the security tape, a PeripheralFigure in the corner |
| Terminator 2 | The steel mill catwalk: Sarah and John at the rail, the arm rising out of the pit with its thumb up |

- `emit_vault_data.py` now prints `rooms: N / M` and names any wall film with no CONFIGS entry and no bespoke room (the Default fog disc). Checked against the pre-change configs: it named exactly these eight.
- Staging is from memory of the films, not checked against stills. Hot Fuzz's square and Frailty's security-tape set are compositions, not literal sets.

### Open after this pass
- `emotional_key` is null for all 65 films in the current `vault-data.json` (it was emitted for 47 on the session-two slice, `6be2f8c`). Pipeline regression, not looked into yet.
- The eight are template rooms, not Two-Scene builds, same as the fifteen.

---

## Wall pass, Oct 4 catch-up (2026-10-05)

Leonard's brief, every item pre-decided. Commit `5e9f8ea`, marker "published through gone-baby-gone 2026-10-04".

| What | Notes |
|---|---|
| 5 panels | Gone Baby Gone (his three lines lead the back as `p.take`, nothing around them), Primal Fear, Upgrade, The Death of Stalin, Terminator 2. Every quoted span checked verbatim against `film_log` and `film_session_notes` in SQL before the write |
| Re-scores | Spotlight 8.9 to 9.4, Memories of Murder 9.2 to 8.9, Primal Fear 8.3 to 9.0. Panels refreshed; `span.rescored data-was` on the meta line; the card front prints the first number struck through. Calibration keeps first-night numbers |
| Links | 13 of Leonard's + 2 proposed (Masters of the Universe to Inglourious Basterds, Pressure to Valkyrie). The Amateur to American Assassin dropped: American Assassin is unseen. Archive ends now resolve (Rogue One to Dune) |
| Hydration | 7 thin rows linked through `film-enrich` action `link`. The 4 umbrellas copy genres, language, keywords and cast from their first film but keep `tmdb_id` null: `film_titles.tmdb_id` is UNIQUE and the first films already own theirs. Bond copies from Casino Royale, the poster it already wore. Sinners' thin duplicate skipped (duplicate of `5373f321`) |
| Docket guard | Emitter withholds TMDB-Documentary titles (American Nightmare, Tickled) from wall, average, Shoebox, Drawer, quotes. No schema marker yet; the DB side (`film_rank`, brief, debt, calibration, the clerk) is unguarded until Dixon rules |
| Quote | "Make me a fucking martini, you fat fucking retard!" Patrick Kenzie, verified against subtitles, transcript and clip (20:38) |

### Open after the pass
- ~~STALE PANEL: The Matrix and Nightcrawler~~ fixed the same night: The Matrix re-scored Aug 18 (decree, The Departed night), Nightcrawler Aug 26 (decree, his words added). Both carry the struck first number.
- `film_expire_recs()` will flip American Nightmare's sealed envelope to expired after 2026-10-25 20:28 UTC.
- Hot-take split (Dixon approved 2026-10-05, briefed to Leonard in film_mailbox): 14 film_log takes mix Leonard's narration into Dixon's words. Leonard moves the narration to long_form. Next wall pass: re-pull, then re-check every panel that quotes an old take (The Matrix's p.quote prints "Screamed out loud at 'dodge this.'" inside Dixon's quote marks).
- Envelope timestamp on the polaroid back: not built. Needs `vault_pull()` to carry the envelope plus a ruling on re-sealed rows (The Death of Stalin) and duplicates (Memories of Murder has two, one sealed 107 seconds before its log).

---

## Full audit, every room and view (2026-09-27)

Three read-only audits (motel and HUD, the template engine, the bespoke and
archive rooms), then fixes, then a headless sweep of every film room, the
archive rooms, the motel and `?text`. Swiftshader in the cloud container, so
fps numbers from that sweep mean nothing; errors, framing and leaks do.

| What | Commit | Notes |
|---|---|---|
| Rooms for the 15 placeholder films | `6b8086c` | Se7en, One Battle After Another, Gladiator, The Big Short, L.A. Confidential, Fight Club, Operation Finale, Valkyrie, Memories of Murder, Frost/Nixon, Spotlight, Inside Man, The Town, The Amateur, In the Grey. Each was the Default fog disc (no walls, doors or sound). Now a template room in the film's own place, authored scraps, a recipe each. Every slug on the wall has a config or a bespoke room. In the Grey's staging is a guess (a briefing room): its real sets were not checked |
| Maverick rebuilt | `6b8086c` | The cockpit box was a black void with the record against the lens. Now the carrier deck at golden hour |
| Engine | `6b8086c` | Shells paint from the unlit grade (the house switch leaked a texture set per tick: 41 to 173 live textures over three flips); scraps sit on a carrier's real surface instead of inside it (Catch Me If You Can, Coherence, Obsession showed no take); Develop's wash claims the flash budget; `content.roomReactsToYou` read at last; press flashes visible through hover; PulseBeat no longer pins the key; config defects (tdkr rope, Ex Machina forest, train seats through walls, doors over the mirror and through ceilings, spawns outside bounds, Rogue One's glow through the lens, switch anchors) |
| Motel and HUD | `e605e72` | Tab works; Enter in Find or on a button no longer enters a room; URL overrides session-only; sound button tells the truth; phone header wraps and clears the gear; text size, invert Y, hold-to-toggle, mono, keep signage wired; dialog roles, focus trap, contrast to 4.5:1; queued-film links; wall textures disposed |
| Bespoke and archive rooms | `1f17dc1` | Barbarian's smash cut and Stby's swerve claim the flash budget and honour room events; Memento's tube flicker and Enemy's two-clock blink go through `flicker()`; Motu, BR2049, Baby Driver scaled by `flashGain()`. `kit/paint.js` `useOwned`: barbarian +58 GPU textures per visit to 0, nightcrawler +17..46 to 0. Memento and Sicario stop re-rendering App every frame. `i` hides the record in all twelve rooms that ignored it. No Country's wind obeys the sound switch. House lights in the print and hazy rooms |

### Open after the audit
- `audio.captions`, `reading.plain` (needs `plain_summary` in the data), `motion.moveVignette`,
  `content.skip` / `content.warnBefore` (needs per-film hazard flags; the Threshold promises a
  skip that does not exist yet). Stored, shown, not read.
- Text size reaches the 2D chrome only, not in-world signs and numerals.
- 78 em dashes in `vault-data.json` notes and reasons (hot takes stay verbatim). Fix in the
  pipeline, not the client.
- Barbarian's smash-cut override carries key/fill/ambient that no light reads; only bg and the
  post grade move. Wire it through FilmWorld if the daylight cut should relight the room.
- The 15 new rooms are template rooms, not Two-Scene builds. Each still wants its film sheet.
- Door-hop Back was fixed in code but not walked headless (needs a 3D door click).

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

## Movie Night v5, the friend and the clerk (2026-09-22)

Plan: `docs/plans/2026-09-22-movie-night-v5.md`. Leonard moves into a claude.ai Project
(`docs/movie-night-project/INSTRUCTIONS.md`); the skill becomes a silent clerk; panels, links
and publishing become a weekly Code wall pass.

| What | Where | Notes |
|---|---|---|
| Project instructions | `docs/movie-night-project/` | Personality, taste doctrine, picking, debrief, games, care. README has the setup steps |
| SKILL.md v5 + `references/clerk.sql` | `docs/movie-night/` | `session-open.sql` removed. Packaged to `~/Desktop/movie-night.skill` |
| Lessons | Supabase | 10 v4-night rows set inactive, 3 v5 rows at weight 4; law still 10 |
| `film-debrief` skill | `~/.claude/_archive/` | Stale 0-5 scale twin, retired |

**Setup done by Dixon 2026-09-22:** Movie Night project created with the instructions, skill re-saved. Next: after about a week of nights, re-check pick acceptance and note length (see the plan's Why section).

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

### Open after pass 1, all closed by pass 2 below

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

## LE GAMAAR, Session 1 done (2026-09-22)

Plan: `docs/plans/2026-09-22-le-gamaar-basterds-room.md` (build log §18). Watch it:
`preview_start vault-dev-b` (port 5191), then `/dailies.html`.

| What | Commit | Notes |
|---|---|---|
| Wall to 53 films | `f4ce63c` | avg 8.6, all 53 posters; mailbox marker written |
| One-command pull | `f4ce63c` | `python scripts/pull.py` then `npm run data`. `vault_pull()` + `vault-pull` fn. Token: `~/.vault-cron-token` (the cron secret) |
| film-enrich v4 | `f4ce63c` | keeps cast (`cast_top`), `images` action, strict `link` action. Source now in `supabase/functions/` |
| Cast + Familiar Faces | `add1b54` | `data/cast.json` (119 slugs), headshots in `public/cast/`, `faces` in vault-data |
| Greybox, whole building | `47067ad` | `src/rooms/bespoke/basterds/` zones.js + Basterds.jsx; lazy chunk 3.9 KB gz |
| content.js, ?text, Threshold, interact key | this commit | `?text` has "Inside the room"; F/Enter/Space/pad A now use touchables in every room |
| THE DAILIES | `f4ce63c` | `dailies.html` (dev only) + `scripts/dailies.py` |

**Session 2 done (2026-09-22):** the street (facade to the film's own, marquee + ladder state,
rain, Morris column doors), the five lobby cards with stills, the floorboard (chapter 1 under
glass), the vitrine, the counter, Chapter Six arrival. Build log §18.

**Session 3 done (2026-09-22):** the seating chart, the Box, the screen and its reels, the
booth, behind the screen, the fire. Build log §18.

**Session 4 done (2026-09-23):** La Louisiane (`dabfdc7`: Who am I? deck, three fingers,
Bridget's shoe and its pair on her seat, banner, clock, Wilhelm's table), the sound recipe
(`f877036`, six zone buses), house lights = history (`d47f34e`: switch on the lobby wall, the
screen's history card, pinned notes), polish (`ec92df6` + final: beam via HazeCone, chandelier,
pilasters, Zoller's card). 60 fps every zone at DPR 2; 7 lights. Build log §18.

**Le Gamaar FINISHED (2026-09-23, ~1:40am):** every item on `docs/films/inglourious-basterds.md` built, checks JSON green, kit extracted to `src/rooms/kit/`. Only Dixon's walk is open.

**Two-Scene rebuild (2026-09-23), merged to master:** the room is now the pilot for
`docs/VAULT-TWO-SCENE-STANDARD.md` (the format for every film: Arrival, Threshold, ONE Room).
The street doors cut into one picture-palace volume holding everything (chapter cases, seating
chart, booth at the balcony front with the round port, opera box, La Louisiane in the arch,
Stolz der Nation playing, the fire). First kit pieces in `src/rooms/kit/architecture.jsx`.
Film sheet and what's left: `docs/films/inglourious-basterds.md`.

**Left (optional, plan §15.5):** signature lines on seat-card backs (need a checked source per
line), the walkable Box. **Dixon's gate:** walk it himself in about a week and run the §0 test.
Open for Dixon: merge the duplicate Sinners row in `film_titles`. (Valkyrie's panel landed in
`cc87451`; the header at 390 was fixed in `e605e72`.)

## Agreed, not started


**LE GAMAAR, the Inglourious Basterds room (planned 2026-09-22).** Plan:
`docs/plans/2026-09-22-le-gamaar-basterds-room.md`. A walkable cinema (street, lobby with five
chapter cards, auditorium seating chart of the whole cast, projection booth with chapter
reels, behind-the-screen fire, La Louisiane cellar card game), plus the Morris column
(Familiar Faces, cross-film doors by shared actor). Four build sessions. Session 1 starts
with the owed wall pass (47 to 53 films) and the PULL.sql emotional_key fix. Rules opened
up the same day (brief §1): faces, stills, logos, real fonts and dialogue as text are all in;
recorded film audio is the one hard line. Owed to Dixon: 3D actor figures (recommended not yet).

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

## Movie Night v4, pass 2

Brief: `docs/plans/2026-09-13-movie-night-v4.md`, order of operations step 3.
Database side only, applied live to Supabase `swjqlfcqvcrnydpyjyog` through
the MCP, never `db push`. Migrations `20260914015644` and `20260914015720`.

| What | Notes |
|---|---|
| Law-cap trigger | `film_lessons`, before insert or update. An eleventh active weight-5 row raises `law cap 10: supersede or demote a weight-5 first`. Updating a law in place passes, because the row does not count itself. Proved in a rolled-back DO block with the count sitting at exactly 10 |
| Digest verbatim again | No code change needed. Pass 1's `law_n <= 10` test flipped on its own once the retro demoted 31 laws to 10. `law_verbatim` true, brief 7,213 chars, acceptance was under 8,000 |
| Registry enrichment | `film_titles` gains `original_language`, `origin_country text[]`, `keywords text[]`, `tmdb_fetched_at`. All 231 rows with a `tmdb_id` backfilled, zero failures. Idempotent: a second run fetched 0 and skipped 231 |
| `film-enrich` edge function | New, `verify_jwt` off at the gateway, cron secret or Dixon's JWT checked in-function, same pattern as `film-tmdb`. The TMDB key stays a Supabase secret and never touches the PC |
| `scripts/enrich_titles.py` | Calls the function and prints fetched, skipped, failed. Needs `FILM_ENRICH_TOKEN` in the environment, nothing else |
| Subtitled signal | `film_taste_signals` gains the `subtitled` dim: `yes` when `original_language` is not `en`, `no` when it is, `?` when unknown. `taste_summary` picked it up with no change because it reads every dim |
| Pitch pool reads keywords | `film_pitch_pool` matches the night's key against TMDB keywords as well as genres, and the taste `why[]` includes keyword tag signals |
| Skill repackaged | `docs/movie-night/movie-night.skill` rebuilt from the v4 SKILL.md plus the four references. The installed skill is v4 now, not v3 |
| `references/schema.md` | The four title columns and the law-cap trigger are documented as live. Nothing is marked "pass 2, not live" any more |

### Open after this pass

- Subtitled has no `yes` row yet: 49 scored films are English, 2 are unknown.
  The dim is live and will fill itself the first time he logs a subtitled film.
- `film_key_tags` is still empty, so the pitch pool's keyword matching does
  nothing until Chat seeds the key-to-tag map.
- Enrichment is a manual run. Nothing schedules `film-enrich` yet; the 90 day
  staleness window is there for when it does.

## Standing hazards

- ~~Flash~~ **CLOSED.** `flashPolicy.js` covers `DwellConcede` and `Enemy`
  (rate and saturation), and `claimFlash` now gates every full-view luminance
  event through one shared budget with a hard 700ms floor, which caps the
  whole app at 1.4 Hz no matter how many systems fire. `ResetFlash` and
  `ScheduledCut` route through it and both respect `content.roomEvents`.
  Barbarian's smash cut, Stby's swerve and `Develop`'s wash route through it
  too since the 2026-09-27 audit. Still unrouted: `ColdOpen`'s blink (it
  already honours `motion.coldOpen`).
- ~~No content warning~~ **CLOSED.** `Threshold.jsx` renders before any WebGL
  work, names the specific hazards with the specific films, and offers the
  calm and steady presets in the same breath. Verified: zero canvas elements
  behind the gate.
- ~~No pause~~ **CLOSED.** `frameloop="never"` while Options is open.
- **`?text` is the only screen-reader path.** The canvas has no focusable
  proxies yet. This is the largest remaining accessibility gap.
- **Some Options switches are stored but unread.** Wired: flash level,
  keyboard turn, travel, head bob, cold open, dust, high contrast, room
  events, rooms react to you, text size, mono, hold-to-toggle, invert Y, keep
  signage. Not yet: captions, plain language, move vignette, per-room content
  skip and warn-before.

| Weekly enrich cron `film-enrich-weekly`, Sundays 09:00 UTC | see git | Same cron-secret pattern as provider refresh. Proved live: 200, fetched 0 / skipped_fresh 231. Open: Dixon re-saves `movie-night.skill` in Chat |

## Oct 7 wall pass and sweep

- Published through Hot Fuzz: 65 films, average 8.70. Frailty, Dunkirk and Hot Fuzz have full backs, no bespoke fronts. Death of Stalin re-scored 9.1 to 9.3 (struck first number kept).
- Rank lines ("#N of M, tied at S with ...") are now computed by `emit_vault_data.py` from the live scores. Hand-typed ones had gone stale at 53, 57 and 62. Keep writing the sentence in that shape and the emitter keeps it true.
- Frailty linked to TMDB 12149 (US release 2002, so its year is 2002, matching every other title). Duplicate Sinners row merged into 5373f321.
- By design, not bugs: the four franchise rows (Bond, Bourne, LOTR, Apes) have no year or tmdb_id; the "No. N" label in each panel is hidden by CaseFile; `lessons.json` is taste-scope only, so the Oct 7 "rewatch to rescore" rule stays off the wall.
