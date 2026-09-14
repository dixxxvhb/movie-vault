# Movie Night v4 (Code side)

Written 2026-09-13 by Fable. Owner of execution: builder-opus. Fable reviews the report, not the diff.
Supabase project: swjqlfcqvcrnydpyjyog (figgg film tables). Migrations live in `supabase/migrations/`, named `<timestamp>_movie_night_v4_<nn>_<slug>.sql`; match the v3 house style there.

Goal: stop the database silting up, make taste derive from evidence instead of doctrine, cut ceremony in chat.
No em dashes anywhere in this work, docs included.

## Decision (why)
| Metric | Value | Problem |
|---|---|---|
| open recs (`suggested`) | 119, 62 older than 21d | rec graveyard blocks fresh pitches |
| active lessons / weight 5 | 69 / 31 | law inflation; digest is a manual |
| `film_session_brief()` | 27,123 chars | a third of a context before hello |
| certified titles | 2 | definitive list starving |

`film_status` DOES have `title_id`; schema.md's recipe is correct.

## Scope THIS pass (order of operations step 1)
Build items 1, 2, 4 (WITHOUT the subtitled row), 5, 7, 8, 9, 10 below in the migration. Item 3: ship ONLY the weight-4 meaning and the digest diet; DO NOT ship the law-cap trigger yet (Chat and Dixon demote 31 laws to 10 first). Item 6 (TMDB enrichment) is deferred; do not add its columns yet.
Docs: SKILL.md + references edits as listed. Do NOT repackage `movie-night.skill` yet; that happens after the retro pass.

## Hard rules
- Run every UPDATE's WHERE as a SELECT first and put the counts in the report.
- Additive only. No drops of tables or columns. Replacing the check constraint on `film_recommendations.status` is the one constraint change allowed.
- Rule 6 stands: `film_taste_signals` and `film_calibration` are report-only; nothing here ever changes a score.
- Apply the migration to the live project via the Supabase MCP `apply_migration` (same name as the file). Never `supabase db push`.
- Acceptance: `select length(film_session_brief()::text)` under 8,000 on current data.
- Do your own recon first: read `docs/movie-night/references/schema.md`, the v3 migrations 05 and 07, and inspect the live tables (`film_recommendations`, `film_log`, `film_lessons`, `film_taste_profile`, `film_titles`, `film_session_notes`) before writing SQL. Column names below are guesses; the live schema wins.

## Items

### 1. Recs expire
- Status set gains `expired`. Backfill: `suggested` older than 21 days becomes `expired`.
- `film_expire_recs() returns int`, idempotent, called inside `film_session_brief()` before assembly.
- `film_status` precedence: `expired` ranks below `dismissed`. `film_check` verdict for an expired-only title: `FRESH (pitched <Mon YYYY>, passed)`.
- Insert trigger: reject a new `suggested` row when open suggested count >= 15, error text exactly `open rec cap 15, dismiss or expire first`.

### 2. Prediction loop
- `film_recommendations.predicted_score numeric(3,1)`, `predicted_on date`.
- On `film_log` insert the existing accept trigger also appends `{title, predicted, live, date}` to `film_taste_profile.content -> calibration -> predictions[]` when a matching rec with a prediction exists. Recorded, never applied (same pattern as paired_measurements).
- View `film_calibration`: n, mean signed error, mean abs error, error by emotional_key and by tag (top 5 each). One line of it goes in the brief as `calibration_line`.

### 3. Weight semantics + digest diet (no trigger yet)
- Weight 4 = standing rule, loaded on demand. Weight 5 = law, cap 10 (trigger comes in a later pass).
- `lessons_digest` in the brief becomes `law[]` (weight 5, active, verbatim) + `taste_summary` (see 4). Weight 4 and below not loaded.

### 4. `film_taste_signals` view
Report-only. Dims over film_log joined to film_titles (films only): tag (n>=3), emotional key, runtime band (short <100, mid <130, long <160, epic), decade, director (n>=2), genre (n>=3). Columns: dim, key, n, avg_score. No subtitled row this pass.
Brief `taste_summary`: top 3 and bottom 3 dims by avg_score with n>=3, one line each, shape `tag: slow-burn 8.9 (n=7)`.

### 5. `film_sessions` + `film_key_tags` + `film_pitch_pool`
- Table `film_sessions(id uuid pk default gen_random_uuid(), created_at, session_date date not null, energy check in flat/ok/up, key_wanted text, runtime_budget int, company text, mode check in pick/slate, note text)`.
- Table `film_key_tags(key text, tag text)`, created empty with a primary key on (key, tag); Chat seeds it.
- Brief returns `tonight` (today's row or null) and `recent_sessions[]` (last 7: date, energy, key_wanted).
- `film_pitch_pool(p_key text, p_budget int, p_n int default 12)`: fresh or expired titles per `film_status`, runtime <= budget (null budget = no limit), on an active service, ranked by key-tag match, then taste-signal avg for its tags/genres/director, then never-pitched first. Returns title, year, runtime, providers, why[] (matched signals). Must work with `film_key_tags` empty.

### 7. `film_recall(q text)`
Full-text over film_log hot_take + long_form, film_session_notes, film_lessons rule + evidence, plus a trigram match on film_titles.title. Returns kind, dated, title, snippet, rank; limit 20. GIN expression indexes on the three tsvectors and pg_trgm on title (enable the extension if absent).

### 8. `film_rank(p_title_id uuid)`
Returns rank, total, above_title, above_score, below_title, below_score over the definitive list (latest live score per title from the ledger plus certified). Must match the wall's order for the top 5 (compare against `scripts/PULL.sql` or `emit_vault_data.py` ordering).

### 9. `film_certify_shelf` view
Archive titles with memory_score >= 9 and certified_on null, top 3 by memory_score. Include in `film_retro()` output; in the brief as `certify_shelf[]` only when there are zero `film_sessions` rows in the last 7 days.

### 10. Brief diet
`film_session_brief()` returns: queue[] top 8 by queue_rank; open_recs[] last 14 days only, after `film_expire_recs()`; lessons_digest = law[] + taste_summary; tonight; recent_sessions[]; calibration_line; certify_shelf[] (weekly gate); last_note; gems[] = last 3 session notes truncated to 200 chars. Under 8,000 chars.

## Docs (docs/movie-night/)
SKILL.md, bump header to v4 dated 2026-09-13:
- Session open: 1 `date`; 2 brief, read `tonight`, if null and night shape not obvious from last_nights ask ONE question in Leonard's voice (energy, key, runtime, company; whichever is unclear) and write the film_sessions row, else write it from inference and say the assumption in half a sentence; 3 pay the debt; 4 mailbox.
- Pick gate step 0 Mode: "just pick" or any single-title ask = `pick` (one card, one sentence, no backup, no slate); else `slate` (three cards). Record mode on the session row. Step 0b Pool first: candidates from `film_pitch_pool(key, budget)`; Leonard may add one wildcard title per slate, flagged.
- Step 9 persist: `predicted_score` and `predicted_on` on every row. Say the prediction only in slate mode or when asked; always record it.
- Card line 4 gains `pitched <Mon YYYY>, passed` when expired.
- Content contract after step 1: call `film_rank(title_id)` and say the rank line ("#14 of 51, between X 8.7 and Y 8.5"). Compare live score to prediction out loud when the gap is 1.0 or more; write nothing, the trigger records it.
- Notes and lessons: weight 4 = standing rule on demand, weight 5 = law, cap 10 (trigger enforces once shipped). Before writing a 5, name which existing 5 it replaces or why it is the tenth. "When he asks what he said about something, run `film_recall` before answering from memory."
- Retro adds: calibration report (mean signed error, worst dim), certify shelf, law audit.
- Tone adds one line: the prediction is Leonard's bet, and Leonard takes the loss in public.

references/:
- schema.md: film_sessions, film_key_tags, predicted_score/predicted_on, expired status, all new views/functions; pitch recipe gains the two prediction fields. Mention the four title columns and the law-cap trigger as "pass 2, not live".
- session-open.sql: film_sessions insert, film_pitch_pool call, film_rank call, film_recall example.
- vault-model.md: "Calibration, part two: predictions" under Calibration, reported-never-applied wording.
- vault-pipeline.md: note that emit_vault_data.py should emit calibration.json later; do not build it.

## Verification (report these)
1. Migration applied; `list_migrations` shows it.
2. Counts: rows expired by backfill; open suggested after.
3. `select length(film_session_brief()::text)` before and after.
4. `film_check` on one known-expired title returns FRESH with the disclosure (paste the line).
5. `film_recall('fincher')` row count and first 3 rows.
6. `film_rank` for the current #1 and one mid-list title; top 5 matches the wall's order (paste both lists).
7. A 16th suggested insert raises the cap error (test inside a rolled-back transaction).
8. `git log --oneline -5`, committed and pushed to master with explicit paths.

Report format: a checks JSON `{applied, expired_backfilled, open_suggested_now, brief_chars_before, brief_chars_after, recall_fincher_n, rank_top5_matches_wall, cap_trigger_fires}` then at most 15 lines of notes and anything you deviated from.
