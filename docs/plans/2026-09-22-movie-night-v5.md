# Movie Night v5: the friend and the clerk

2026-09-22. Decided with Dixon in a Claude Code session (Opus). Status: built, waiting on Dixon's claude.ai setup.

## Why

v3 and v4 fixed real failures (re-pitching seen films, skipped logging) by turning every step into a database operation. The result protected the record and killed the fun.

- Acceptance fell from 16 of 25 pitches (week of Jul 13) to 2 of 38 (week of Sep 7) and 1 of 30 (week of Sep 14).
- July session notes ran 2,000 to 12,000 characters of theories and bits; September's ran about 700, mostly slates that whiffed. Sep 14: "pool was the same nine titles for every key."
- v4 made `film_pitch_pool` the source of picks, so Leonard could only pitch what the registry already held.
- Every night ended in a fixed set of questions (key, tags, take, panel) because the content contract demanded them.
- The skill had amnesia, so everything had to be filed in a table or it was lost. That is why the bookkeeping grew.

## Decision

| Piece | Home | Job |
|---|---|---|
| Leonard | claude.ai **Movie Night project**, instructions in `docs/movie-night-project/INSTRUCTIONS.md` | Personality, taste doctrine, how to pick, how to debrief, games, care. The project's shared memory carries the friendship night to night. |
| The clerk | the **movie-night skill**, `docs/movie-night/` (v5) | Silent seen-check, one rec row for the pick (sealed-envelope prediction), the log from his own words, the wall rank, a silent night note, CERTIFY. One-line receipt, nothing else visible. |
| The wall | **Claude Code**, weekly | Panels, bloodline links, publish, debt, mailbox, retro. |

The database still wins on facts. Project memory holds everything else.

Lessons: 10 rows that encoded the v4 night (pitch cards, predicted-score cards, same-session panels, per-session service checks, intake ceremony, the division of labor, the old debrief and note rules, the lesson ritual) set `active = false` on 2026-09-22; 3 replacement rows at weight 4 (v5 split, debrief, night note). Law count unchanged at 10.

Retired: `~/.claude/skills/film-debrief` (0 to 5 scale, versioned profile rows; stale since July and competing for the same trigger in Code sessions), moved to `~/.claude/_archive/`.

## The weekly wall pass (Claude Code, in this repo)

Run when Dixon asks, or weekly. Brief for the session:

1. `select * from film_night_debt;` That is the worklist. Missing hot takes, tags or keys: fill only from that night's `film_session_notes` verbatims; if a take is not there, leave it and list it for Dixon. Never invent his words.
2. Panels: author a `film_ledger_panels` row per logged film missing one, stocking the chat archive with 2 to 5 labeled verbatims from the night note.
3. Links: `film_links` only for bloodlines a night note actually names.
4. Pull, emit, build, shot, push (see `docs/movie-night/references/vault-pipeline.md`). GitHub Pages deploys on push.
5. Write the publish marker to `film_mailbox`.
6. Every ~15 logged films, `select film_retro();` and report.

## Dixon's setup (one time)

See `docs/movie-night-project/README.md`.

## Open

- Dixon: create the project, paste the instructions, connect Supabase, re-save the skill.
- After a week of nights: check acceptance and note length again (queries in this file's Why section: `film_recommendations` by week and status; `film_session_notes` length by date). If the Project's memory is not holding the small stuff, move more doctrine into the instructions, not back into the skill.
- `film_night_debt` still counts missing panels, so debt grows between wall passes by design. The skill no longer reads it.
