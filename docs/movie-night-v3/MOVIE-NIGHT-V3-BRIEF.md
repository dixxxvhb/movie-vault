# MOVIE NIGHT v3 BRIEF: from discipline to structure

**For:** Dixon (decisions), then a Claude Code session (repo `~/Code/movie-vault` + Supabase `swjqlfcqvcrnydpyjyog`)
**From:** Leonard (Cowork), 2026-08-26, ~1:45am
**Magnitude:** 5.0. This is a rethink of how the ritual remembers, not a reskin of the skill file.

---

## 0. The diagnosis in one paragraph

The skill is not failing because the rules are wrong. The rules are excellent, there are 71 of them, and 32 are permanent law. It is failing because every rule is enforced by a model remembering to run four separate queries per title from a cold start, against a database where "has he seen this" lives in five different places that disagree with each other. Repeats and wall-misses are not a discipline problem. They are a schema problem wearing a discipline costume. The fix is to make the database answer the question in one call, make the triggers close the loop automatically, and shrink the skill to the parts a human friend would actually need to remember.

## 1. Evidence (all queried live tonight)

**"Seen" is fragmented across five sources and none is complete.**

| Source | What it says | What is wrong with it |
|---|---|---|
| `film_log` | 44 films, ground truth for the wall | Only trustworthy source, but the protocol makes it one of four checks, not the first |
| `film_titles.seen_before` | 76 flagged | **32 of the 44 logged films are flagged `false`.** The flag was patched by hand four times (Aug 17, Aug 21, Aug 25) and drifted every time. The Matrix re-pitch on Aug 25 was this exact bug |
| `film_taste_profile.vault_archive` | archive scores + hazy list | Stardust still listed as hazy (watched Aug 2). Franchise entries never got seen flags. `current_mood` still says "Coherence is tonight's pick" (Jul 15). Two dated `vault_counts_*` snapshots sit inside a profile that is supposed to contain no counts. `notes_md` still quotes 5-point scores |
| `film_recommendations` | 124 rows | **42 open `suggested` rows have `title_id = null`.** The trigger that closes recs on log insert matches on `title_id` only, so those 42 never close. Rogue One, Barbarian, Annihilation, Nightcrawler and others sit "open on the shelf" while hanging on the wall. Any seen-check that trusts rec status gets lied to |
| `film_watchlist` | 20 queued | Fine, the flip trigger works. But 16 of the 20 have no `added_reason` and no `queue_rank` semantics anyone uses |

**The nightly contract is honored by memory, so it breaks.** Inside Man (Aug 21) and Se7en (Aug 24) have scores but no hot take, no vibe tags, no panel row. The live wall is at 41 films against 44 logged. This is the third documented lapse of the same weight-5 rule. A rule that has been violated three times after being made permanent law is not a rule, it is a wish.

**Session start is expensive and manual.** The skill tells a fresh session to read 71 lesson rows, 10 notes, the profile, the services, and recent log before saying a word. That is 15k+ tokens of setup that has to be re-done every night, and when a session is short on patience it skips steps. The 23KB skill file also carries pipeline detail (build steps, data file shapes, retired-artifact history) that a night session never needs.

**The in-app engine and the chat ritual disagree.** `film-recs` (the figgg button) reads the whole taste profile blob including the stale mood and snapshots, and its avoid list is `seen_before` plus the 20 most recent log rows in prose. It has its own deterministic guard on `film_log` title_ids, which is why it is actually *less* likely to re-pitch a wall film than chat is. The chat side has no deterministic guard at all.

**Registry hydration is behind.** 19 titles have no `tmdb_id`, 25 have no `watch_providers`, so runtime and availability checks fall back to search every time.

## 2. The principle for v3

**Anything a weight-5 lesson has had to repeat is a candidate for a trigger, a view, or a function. Rules for the model; constraints for the database.** The skill should describe the friendship and the taste. The schema should enforce the bookkeeping.

## 3. Fix the old (structural, one Code migration)

### 3a. One canonical answer: `film_status` view

One row per title. Computed columns:

- `state`: one of `ledger` (in film_log), `certified`, `archive` (memory score), `hazy` (seen, no score), `seen` (confirmed seen, unbucketed), `abandoned`, `queued`, `watching`, `pitched` (open rec), `dismissed`, `fresh`.
- `live_score`, `live_watched_at` (latest film_log row, `distinct on` per the existing rule), `memory_score`, `is_rewatch_candidate`, `open_rec_id`, `last_pitched_on`, `pitch_count`, `runtime_minutes`, `providers`, `provenance` (the added_reason or seen_note), `veto` (Prisoners and any future standing veto, from a tiny `film_vetoes` table or a flag).

Precedence is encoded once, in SQL: ledger beats certified beats archive beats hazy beats seen beats everything. No more "check four places."

### 3b. One-call gate: `film_check(text)` function

`select * from film_check('the matrix')` returns the `film_status` row(s) with fuzzy matching (enable `pg_trgm`; it is not installed) plus a one-line `verdict`: for example `ON THE WALL 9.8 (2026-08-04)`, `HAZY, rewatch only, disclose`, `OPEN REC since 08-15, never answered`, `FRESH`. Also returns `similar_titles` so a remake/reboot year mismatch surfaces (the Masters of the Universe lesson). The pitch gate in the skill collapses from four queries to one line: **no title is pitched without its `film_check` verdict quoted in the card.** Slate building becomes `select * from film_status where state = 'fresh' and ...`.

### 3c. Close the loop automatically

- **Trigger on `film_log` insert:** set `film_titles.seen_before = true` and a seen_note if empty; flip watchlist (exists); close open recs by `title_id` **and** by fuzzy `suggested_title` match (the 42-row hole); write a `film_night_debt` marker (see 3d).
- **Trigger on `film_recommendations` insert:** if `title_id` is null, resolve `suggested_title` against `film_titles` with trigram match; if no match, insert a thin title row and attach it. After backfill, add `check (title_id is not null)`. A rec without a title id can never be written again.
- **Backfill now:** the 32 stale seen flags, the 42 orphan recs, Stardust out of the hazy list, franchise seen flags.

### 3d. Make the contract enforce itself: `film_night_debt` view

Lists every film_log row missing any of: hot take, vibe tags, panel row, film_links (only if a note that night mentions a bloodline; otherwise skip), session note on that date. Plus `wall_behind` (log rows newer than the last publish marker). **Rule for the skill:** every session opens with `select * from film_night_debt` and pays it before pitching. Debt is visible, not remembered. Tonight it would show Inside Man and Se7en immediately.

Publish marker: `film_mailbox` already exists with zero rows and an unread index. Repurpose it as the Code-to-Leonard channel: Code writes `published through <slug> at <time>` after every deploy; Leonard writes `wall is N behind` when it cannot publish. Both sides read it at session start. The table exists, it just never got a job.

### 3e. Retire the profile as a fact store

- Archive and hazy lists move out of the jsonb and into the registry: add `film_titles.memory_score numeric(3,1)` and `seen_bucket text` (R/F/L/C/?), replacing the fragile "parse a number out of seen_note" that the Vault README admits it does. `film_status` reads them directly.
- Delete `current_mood`, both `vault_counts_*` keys, and `vault_archive` from the jsonb once migrated. Keep `lanes`, `twist_calibration`, `rating_anchors`, `weekly_rhythm`, `vault_model` (rules + certified_films + paired_measurements), `franchises`, `directors`, `comfort_show`, `runtime_prefs`.
- Rewrite `notes_md` in the 10-point era, no em dashes (the lanes array has em dashes in it right now; it is fed to Sonnet verbatim).
- Point `film-recs` at `film_status` for its avoid list and at a `film_lessons_digest` (weight 4+ taste rows) instead of the whole profile blob.

### 3f. Hydrate the registry

Run `film-tmdb` across the 19 missing `tmdb_id` rows and the 25 missing providers. Then a nightly cron (Supabase `pg_cron` or the existing dispatch function) refreshes `watch_providers` for queued + open-rec titles only, so availability checks stop rotting between sessions.

## 4. Improve the existing (skill file restructure)

### 4a. Progressive disclosure

Split the 23KB monolith. `SKILL.md` stays under ~8KB and holds only: who Leonard is, the etiquette, the two gates (pick and debrief) now expressed as `film_check` and `film_night_debt` calls, the content contract, the standing vetoes, the tone. Everything else moves to reference files loaded on demand:

- `references/schema.md`: tables, gotchas, column names, the taste profile shape.
- `references/vault-pipeline.md`: the publish procedure, data files, drift guard, design canon. Only a Code session reads it.
- `references/vault-model.md`: three states, seven rules, certify flow, calibration.
- `references/session-open.sql`: the exact queries a session runs at open (see 4b).

The skill-creator packaging supports this layout; the canonical copy stays in `docs/movie-night-SKILL.md` plus `docs/movie-night/references/`.

### 4b. A real session opener: `film_session_brief()`

One RPC returning compact JSON so a night session starts warm in one call instead of six: last 7 nights (title, score, vibe tags, the key each night played in), open queue with provenance, open recs with age, active services, tonight's debt, the last session note verbatim, the lessons digest (weight 5 as one-line reminders, weight 3-4 taste rules in full), and lane saturation (any 9.5+ in the last 7 days with its lane). The skill's "first move" becomes: run the brief, pay the debt, then talk.

### 4c. Lessons hygiene

71 active rows, 32 at weight 5. Several weight-5 rows are already verbatim in the skill (em dashes, Prisoners, Flowers in the Attic, DWD branding, the clock). Per the skill's own retro cadence: graduate those into the skill file and drop them to weight 4 "already in doctrine" so the digest stays readable. Merge the three near-duplicate seen-check rows (Aug 3, Aug 14, Aug 25) into one, superseding properly. Retire the vault.py / restore.py rows (Jul 26, Jul 28) as inactive; they describe a dead pipeline and contradict the Aug 1 row.

### 4d. Pitch card format (mandatory, small)

Every pitched title renders the same four lines: title (year, runtime, where it is streaming and when that was checked), the `film_check` verdict verbatim, the bloodline it continues (from `film_links`, or "wildcard"), and disclosures (rewatch, subtitles, bracket). Not cutesy, not labeled, just the same four lines every time. The verdict line is what makes the rule self-auditing: if it says FRESH and he says "seen it," that is a registry gap, not a Leonard gap, and it gets written on the spot.

## 5. Add the new

- **Rewatch shelf.** `film_status where state in ('hazy','archive')` ranked by expected payoff: hazy first (the bad-memory-asset lesson), then archive by gap between memory score and how the taste profile would predict it. Gives the ritual a standing supply of disclosed rewatches instead of improvising them.
- **Seen-audit lightning round as a function.** `film_audit_menu(lane text, n int)` returns 6 to 8 fresh registry titles in a lane for him to buzz, and his answers get written in one statement. The Aug 17 lesson, made into a button.
- **Key ledger.** Add `emotional_key text` to `film_log` (tense, cozy, fun, dread, awe, sad, camp). The weekly rhythm rules all talk about keys; nothing stores them, so key rotation is being reconstructed from vibe tags every night. One word per row and `film_session_brief` can compute "last two nights were tense, tense; lead with light."
- **Paired measurements, automatic.** A trigger on `film_log` insert where `is_rewatch` and the title has a `memory_score` appends the pair to `vault_model.paired_measurements`. The rule says report and never apply; the trigger only records.
- **Abandonments as first-class.** `film_titles.abandoned_on` + `abandon_note` instead of burying walkouts in seen_note text. Cosmos is the first row.
- **Version check assist.** `film_check` returns every registry title with the same normalized name across years, and the skill instructs a release search when the newest hit is under two years old. Half of the Masters of the Universe lesson becomes a query result.
- **film-recs parity.** The in-app button reads the same `film_status` and lessons digest that chat does. One taste, two surfaces, no drift.
- **Retro as a function.** `film_retro()` returns parity counts, open recs older than 21 days, profile keys that are dated snapshots, and weight-5 rules without evidence. The skill's every-15-films retro becomes a one-call report.

## 6. What Leonard can do tonight without Code

- Pay the visible debt: backfill Inside Man and Se7en hot takes, vibe tags, panels, and the Fincher bloodline link from the Aug 24 note, with your words.
- Repair the 32 stale seen flags and close the orphan recs that point at wall films (safe, SELECT-first per the Aug 1 rule).
- Pull Stardust out of the hazy list and delete `current_mood` and the two snapshot keys from the profile.

Everything in sections 3, 4b, 4c and 5 is Code work (migrations, functions, repack).

## 7. Decisions needed from Dixon

1. **Scope:** all of it as one Code session, or 3a-3d first (the repeat fix) and the rest next week?
2. **Memory scores into the registry** (3e): yes, or keep them in the profile jsonb?
3. **`emotional_key` on film_log:** your vocabulary for keys, or let Leonard propose seven and you edit?
4. **Repurpose `film_mailbox`** as the Code/Leonard channel, or drop the table?
5. **Skill split** into SKILL.md + references (4a): yes/no. It changes how you re-save the skill (one .skill package instead of one file).
6. **Tonight's cleanup** (section 6): go now, or wait for the migration so it is done once?
