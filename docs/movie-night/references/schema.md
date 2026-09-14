# Schema reference (read before any write)

Project `swjqlfcqvcrnydpyjyog`. RLS is on across `film_*`, restricted to authenticated plus `is_dixon()`. Nothing in a sandbox reaches this database directly; all reads and writes go through the Supabase MCP tools. When unsure about a column, check `information_schema.columns` before guessing. A failed query costs more than the check.

## Tables

| Table | Holds | Notes |
|---|---|---|
| `film_titles` | The registry. One row per title. | **Never `select *`**; it blows the context. Columns you usually want: `id, title, year, media_type, runtime_minutes, seen_before, seen_note, memory_score, seen_bucket, abandoned_on, certified_on, certified_score`. Enrichment columns (v4 pass 2): `original_language, origin_country, keywords, tmdb_fetched_at`. |
| `film_log` | Everything watched together, scored live. | `watched_at` NOT NULL date. `rating numeric(3,1)` 0 to 10. `rating_estimated` boolean NOT NULL. `emotional_key` text (v3). `context` nullable. `is_rewatch` boolean. |
| `film_watchlist` | The queue. | `status` in queued / watching / watched. `added_by` ('me' or 'claude-chat'), `added_reason` (provenance, keep it real), `queue_rank`, `priority_note`. One row per title (unique). |
| `film_recommendations` | Every pitch, ever. | `title_id` NOT NULL (v3). `suggested_title`, `reasoning` (not reason), `source` ('claude-chat' or 'in-app-ai'), `status` suggested / accepted / dismissed / **expired** (v4). `predicted_score numeric(3,1)` and `predicted_on date` (v4) go on every pitched row. One open row per title (unique partial index). A suggested row older than 21 days is expired by `film_expire_recs()`, which the brief calls on the way in. A 16th open suggested row is refused with `open rec cap 15, dismiss or expire first`. |
| `film_ledger_panels` | Source of truth for the hand-authored polaroid backs. | `slug` unique, `palette_css`, `panel_html`, `photo_svg` (bespoke 236x236 front), `authored_on`, `notes`. |
| `film_links` | Hand-authored bloodlines. | `from_title_id, to_title_id, relation, note, weight, directional, source, authored_on`. Unique on (from, to, relation). Note renders verbatim on the polaroid back. |
| `film_lessons` | Every rule he has taught the ritual. | `scope, rule, evidence, taught_by_title_id, weight 1-5, active, learned_on`. Supersede, never delete. |
| `film_session_notes` | The friendship memory. | `note` (not note_md), `note_date`. |
| `film_taste_profile` | Doctrine only (v3). | **Single row**, append-versioned, latest `updated_at` wins. `content` is jsonb (cast `content::text` before `left()`). `notes_md` text. Never mirror-write a second row. |
| `film_services` | Streaming services he has right now. | `provider_name`, `active`, `tmdb_provider_id`. Changes. Never assume. |
| `film_quotes` | Lines that hang as scraps on the wall. | `quote, said_by, origin, season, episode`. |
| `film_mailbox` | Code <-> Leonard channel (v3). | `note`, `read_at`. Code writes publish markers; Leonard writes wall-behind notes. Read unread at open, mark read after acting. |
| `film_vetoes` | Standing never-pitch titles (v3). | `title_id`, `reason`. `film_check` returns VETO for these. |
| `film_sessions` | The night's shape, written at session open (v4). | `session_date` NOT NULL, `energy` flat / ok / up, `key_wanted`, `runtime_budget` int, `company`, `mode` pick / slate, `note`. One row per night. `id` does default to `gen_random_uuid()` on this table. |
| `film_key_tags` | Emotional key to tag map (v4). | Primary key `(key, tag)`. Created empty; Chat seeds it. `film_pitch_pool` works with it empty, it just ranks on taste signals alone. |

Every `film_*` insert needs an explicit `gen_random_uuid()` for `id`. There are no column defaults for id.

## Views and functions (v3)

| Object | Use |
|---|---|
| `film_status` (view) | One row per title with computed `state`: ledger / certified / archive / hazy / seen / abandoned / veto / queued / watching / pitched / dismissed / expired / fresh. Precedence is baked in: ledger > certified > archive > hazy (bucket set, no score) > seen (note, no bucket) > abandoned > veto > queued > watching > pitched > dismissed > expired > fresh. Plus `live_score, live_watched_at, is_rewatch_seen, memory_score, seen_bucket, certified_score, open_rec_id, last_pitched_on, pitch_count, runtime_minutes, providers, provenance`. |
| `film_check(q text)` | Trigram match on `film_status` (`similarity > 0.35`, ordered by similarity then year desc). Returns the film_status columns plus `similarity` and a `verdict` text, e.g. `ON THE WALL 9.8 (2026-08-04)`, `ARCHIVE memory 9.6, rewatch only, disclose`, `HAZY, rewatch only, disclose`, `SEEN, unscored, confirm before pitching`, `OPEN REC since 2026-08-15`, `QUEUED (<provenance>)`, `VETO: only Dixon raises it`, `FRESH (pitched Aug 2026, passed)` for an expired-only title, `FRESH`. A `film_vetoes` row overrides every other verdict, whatever the state says. Multiple years of the same name come back as separate rows; that is the version check. |
| `film_session_brief()` | Returns one jsonb, under 8,000 chars: `now, tonight, recent_sessions[], last_nights[] (title, score, key, date), queue[] (top 8 by queue_rank), open_recs[] (last 14 days: title, age_days, predicted), services[], lessons_digest {law[], law_count, law_verbatim, taste_summary[]}, calibration_line, certify_shelf[] (weekly gate), saturation[], last_note, gems[], debt_n, mailbox_n, emotional_keys`. Calls `film_expire_recs()` first. `law[]` is verbatim once the active weight-5 count is down to the cap of 10; above the cap it carries first sentences, so the brief still fits. The full debt and mailbox lists left the brief; the counts point at their own one-line queries. |
| `film_night_debt` (view) | film_log rows missing hot_take, vibe_tags, emotional_key, a panel row, or a session note dated that night; plus a `wall_behind` row when log rows are newer than the last mailbox publish marker. |
| `film_audit_menu(lane text, n int)` | n fresh registry titles matching the lane (genre or tag) for a lightning-round seen audit. |
| `film_rewatch_shelf` (view) | hazy and archive titles ranked for rewatch: hazy first, then archive by memory score desc. |
| `film_retro()` | Parity counts, open recs older than 21 days, lessons at weight 5 lacking evidence, titles missing tmdb or providers, profile keys that look like dated snapshots, plus (v4) the calibration report, the certify shelf and the law audit. |

## Views and functions (v4)

| Object | Use |
|---|---|
| `film_expire_recs()` | Flips `suggested` rows older than 21 days to `expired` and returns how many. Idempotent. `film_session_brief()` calls it before assembling, which is why the brief is volatile now, not stable. |
| `film_taste_signals` (view) | Report-only. Films only, scored log rows only. Dims: `tag` (n>=3), `emotional_key`, `runtime_band` (short <100, mid <130, long <160, epic), `decade`, `director` (n>=2), `genre` (n>=3), `subtitled` (`yes` when `original_language` is not `en`, `no` when it is, `?` when the language is unknown). Columns `dim, key, n, avg_score`. Rule 6 stands: nothing reads this to move a score. |
| `film_calibration` (view) | Report-only, one row: `n`, `mean_signed_error`, `mean_abs_error`, `by_emotional_key` and `by_tag` (top 5 each). Source is `film_taste_profile.content -> calibration -> predictions[]`, appended by the log trigger. |
| `film_certify_shelf` (view) | Archive titles with `memory_score >= 9` and no `certified_on`, top 3 by memory score. In `film_retro()` always; in the brief only when there are no `film_sessions` rows in the last 7 days. |
| `film_rank(p_title_id uuid)` | `rank, total, above_title, above_score, below_title, below_score` over the definitive list (ledger live scores plus certified). Ordered score desc then title, which is the wall's own hang order in `scripts/emit_vault_data.py`. |
| `film_recall(q text)` | One call over hot takes and long form, session notes, lesson rules and evidence, plus a trigram match on titles. Returns `kind, dated, title, snippet, rank`, limit 20. Run it before answering "what did I say about X" from memory. |
| `film_pitch_pool(p_key text, p_budget int, p_n int default 12)` | Candidates before cards: fresh or expired titles on an active service, runtime within budget (a null budget means no limit), ranked by key-tag match (genres and TMDB keywords), then the taste-signal average for the title's genres, director and keywords, then never-pitched first. Returns `title_id, title, year, runtime_minutes, providers, why[]`. |

Live as of pass 2 (2026-09-13): the weight-5 law-cap trigger enforces the cap of 10 in the database, and
`film_titles` carries `original_language`, `origin_country text[]`, `keywords text[]` and `tmdb_fetched_at`,
backfilled from TMDB by the `film-enrich` edge function (driven by `scripts/enrich_titles.py`).

## Triggers (v3, what happens on its own)

- `film_log` insert: watchlist flips to watched; `film_titles.seen_before = true` (seen_note filled if empty); open recs for that title close to accepted, matched by `title_id` and by trigram on `suggested_title`; if `is_rewatch` and the title has `memory_score`, a pair `{title, memory, live, date}` is appended to `film_taste_profile.content -> vault_model -> paired_measurements` (recorded, never applied).
- `film_recommendations` insert with null `title_id`: resolves `suggested_title` by trigram; inserts a thin title row if nothing matches. The NOT NULL check runs after.
- `film_log` insert, v4 addition: if a matching open rec carried a `predicted_score`, `{title, predicted, live, date}` is appended to `film_taste_profile.content -> calibration -> predictions[]`. Recorded, never applied, same as paired_measurements.
- `film_recommendations` insert, v4 addition: a 16th open `suggested` row raises `open rec cap 15, dismiss or expire first`.
- `film_titles` update setting `certified_on`: `certified_score` and `certified_line` required together.
- `film_lessons` insert or update, v4 pass 2: a weight-5 row that would be the eleventh active law raises `law cap 10: supersede or demote a weight-5 first`. Updating a law in place is fine; the row does not count itself.

## Taste profile shape (v3, doctrine only)

`content` keys: `lanes[]`, `directors[]`, `franchises{}`, `horror`, `comfort_show`, `runtime_prefs`, `discussion`, `twist_calibration`, `rating_anchors`, `weekly_rhythm{}`, `emotional_keys[]` (the seven), `vault_model{rules[], states{}, summary, ruled_by, ruled_on, paired_measurements[]}`, `calibration{predictions[]}` (v4, written by the log trigger, read by `film_calibration`). No counts, no moods, no title lists. Archive scores, hazy buckets, certifications and abandonments live on `film_titles`. If you find a dated snapshot key in the profile, that is drift; report it at retro.

## Write recipes

Log a film:
```sql
insert into film_log (id, title_id, watched_at, rating, rating_estimated, hot_take, vibe_tags, emotional_key, context, is_rewatch)
values (gen_random_uuid(), '<title uuid>', '<his date, America/New_York>', 9.6, false, '<verbatim>', array['tag','tag'], 'tense', '<context or null>', false);
```
Then confirm the triggers fired: `select state, live_score from film_status where title_id = '<uuid>'` and `select count(*) from film_recommendations where title_id = '<uuid>' and status = 'suggested'` should be 0.

Persist a pitch:
```sql
insert into film_recommendations (id, title_id, suggested_title, reasoning, source, status, predicted_score, predicted_on)
values (gen_random_uuid(), '<uuid or null>', 'Title (year)', '<the actual reasoning>', 'claude-chat', 'suggested', 8.7, current_date);
```
Dismiss: `update film_recommendations set status = 'dismissed' where id = '<id>'` (SELECT first).

Registry gap on the spot:
```sql
update film_titles set seen_before = true, seen_note = '<his words, date>', memory_score = <n or null>, seen_bucket = '<R|F|L|C|?>' where id = '<uuid>';
```

Lesson:
```sql
insert into film_lessons (id, learned_on, scope, rule, evidence, taught_by_title_id, weight, active)
values (gen_random_uuid(), '<date>', '<scope>', '<rule, stated flatly>', '<the quote or score>', <uuid or null>, <1-5>, true);
```

Mailbox: `insert into film_mailbox (id, note) values (gen_random_uuid(), 'wall behind through <title>, <date>')`. Mark read: `update film_mailbox set read_at = now() where id = ...`.
