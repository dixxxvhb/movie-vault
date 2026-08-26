# Schema reference (read before any write)

Project `swjqlfcqvcrnydpyjyog`. RLS is on across `film_*`, restricted to authenticated plus `is_dixon()`. Nothing in a sandbox reaches this database directly; all reads and writes go through the Supabase MCP tools. When unsure about a column, check `information_schema.columns` before guessing. A failed query costs more than the check.

## Tables

| Table | Holds | Notes |
|---|---|---|
| `film_titles` | The registry. One row per title. | **Never `select *`**; it blows the context. Columns you usually want: `id, title, year, media_type, runtime_minutes, seen_before, seen_note, memory_score, seen_bucket, abandoned_on, certified_on, certified_score`. |
| `film_log` | Everything watched together, scored live. | `watched_at` NOT NULL date. `rating numeric(3,1)` 0 to 10. `rating_estimated` boolean NOT NULL. `emotional_key` text (v3). `context` nullable. `is_rewatch` boolean. |
| `film_watchlist` | The queue. | `status` in queued / watching / watched. `added_by` ('me' or 'claude-chat'), `added_reason` (provenance, keep it real), `queue_rank`, `priority_note`. One row per title (unique). |
| `film_recommendations` | Every pitch, ever. | `title_id` NOT NULL (v3). `suggested_title`, `reasoning` (not reason), `source` ('claude-chat' or 'in-app-ai'), `status` suggested / accepted / dismissed. One open row per title (unique partial index). |
| `film_ledger_panels` | Source of truth for the hand-authored polaroid backs. | `slug` unique, `palette_css`, `panel_html`, `photo_svg` (bespoke 236x236 front), `authored_on`, `notes`. |
| `film_links` | Hand-authored bloodlines. | `from_title_id, to_title_id, relation, note, weight, directional, source, authored_on`. Unique on (from, to, relation). Note renders verbatim on the polaroid back. |
| `film_lessons` | Every rule he has taught the ritual. | `scope, rule, evidence, taught_by_title_id, weight 1-5, active, learned_on`. Supersede, never delete. |
| `film_session_notes` | The friendship memory. | `note` (not note_md), `note_date`. |
| `film_taste_profile` | Doctrine only (v3). | **Single row**, append-versioned, latest `updated_at` wins. `content` is jsonb (cast `content::text` before `left()`). `notes_md` text. Never mirror-write a second row. |
| `film_services` | Streaming services he has right now. | `provider_name`, `active`, `tmdb_provider_id`. Changes. Never assume. |
| `film_quotes` | Lines that hang as scraps on the wall. | `quote, said_by, origin, season, episode`. |
| `film_mailbox` | Code <-> Leonard channel (v3). | `note`, `read_at`. Code writes publish markers; Leonard writes wall-behind notes. Read unread at open, mark read after acting. |
| `film_vetoes` | Standing never-pitch titles (v3). | `title_id`, `reason`. `film_check` returns VETO for these. |

Every `film_*` insert needs an explicit `gen_random_uuid()` for `id`. There are no column defaults for id.

## Views and functions (v3)

| Object | Use |
|---|---|
| `film_status` (view) | One row per title with computed `state`: ledger / certified / archive / hazy / seen / abandoned / queued / watching / pitched / dismissed / veto / fresh. Precedence is baked in: ledger > certified > archive > hazy > seen > abandoned > veto > queued > watching > pitched > dismissed > fresh. Plus `live_score, live_watched_at, memory_score, seen_bucket, open_rec_id, last_pitched_on, pitch_count, runtime_minutes, providers, provenance`. |
| `film_check(q text)` | Trigram match on `film_status` (`similarity > 0.4`, ordered by similarity then year desc). Returns matching rows plus a `verdict` text, e.g. `ON THE WALL 9.8 (2026-08-04)`, `ARCHIVE memory 9.6, rewatch only, disclose`, `HAZY, rewatch only, disclose`, `OPEN REC since 2026-08-15`, `VETO: only Dixon raises it`, `FRESH`. Multiple years of the same name come back as separate rows; that is the version check. |
| `film_session_brief()` | Returns one jsonb: `now, last_nights[] (title, score, key, tags, date), queue[], open_recs[] (title, age_days), services[], lessons_digest {law[], taste[], ritual[]}, saturation[] (lane, title, score, closes_on), last_note, debt[], mailbox[]`. |
| `film_night_debt` (view) | film_log rows missing hot_take, vibe_tags, emotional_key, a panel row, or a session note dated that night; plus a `wall_behind` row when log rows are newer than the last mailbox publish marker. |
| `film_audit_menu(lane text, n int)` | n fresh registry titles matching the lane (genre or tag) for a lightning-round seen audit. |
| `film_rewatch_shelf` (view) | hazy and archive titles ranked for rewatch: hazy first, then archive by memory score desc. |
| `film_retro()` | Parity counts, open recs older than 21 days, lessons at weight 5 lacking evidence, titles missing tmdb or providers, profile keys that look like dated snapshots. |

## Triggers (v3, what happens on its own)

- `film_log` insert: watchlist flips to watched; `film_titles.seen_before = true` (seen_note filled if empty); open recs for that title close to accepted, matched by `title_id` and by trigram on `suggested_title`; if `is_rewatch` and the title has `memory_score`, a pair `{title, memory, live, date}` is appended to `film_taste_profile.content -> vault_model -> paired_measurements` (recorded, never applied).
- `film_recommendations` insert with null `title_id`: resolves `suggested_title` by trigram; inserts a thin title row if nothing matches. The NOT NULL check runs after.
- `film_titles` update setting `certified_on`: `certified_score` and `certified_line` required together.

## Taste profile shape (v3, doctrine only)

`content` keys: `lanes[]`, `directors[]`, `franchises{}`, `horror`, `comfort_show`, `runtime_prefs`, `discussion`, `twist_calibration`, `rating_anchors`, `weekly_rhythm{}`, `emotional_keys[]` (the seven), `vault_model{rules[], states{}, summary, ruled_by, ruled_on, paired_measurements[]}`. No counts, no moods, no title lists. Archive scores, hazy buckets, certifications and abandonments live on `film_titles`. If you find a dated snapshot key in the profile, that is drift; report it at retro.

## Write recipes

Log a film:
```sql
insert into film_log (id, title_id, watched_at, rating, rating_estimated, hot_take, vibe_tags, emotional_key, context, is_rewatch)
values (gen_random_uuid(), '<title uuid>', '<his date, America/New_York>', 9.6, false, '<verbatim>', array['tag','tag'], 'tense', '<context or null>', false);
```
Then confirm the triggers fired: `select state, live_score from film_status where title_id = '<uuid>'` and `select count(*) from film_recommendations where title_id = '<uuid>' and status = 'suggested'` should be 0.

Persist a pitch:
```sql
insert into film_recommendations (id, title_id, suggested_title, reasoning, source, status)
values (gen_random_uuid(), '<uuid or null>', 'Title (year)', '<the actual reasoning>', 'claude-chat', 'suggested');
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
