-- The clerk's queries, v5. All through the Supabase connector, project swjqlfcqvcrnydpyjyog.
-- Silent: none of this is ever shown to Dixon.

-- 1. Seen-check, every title in one call, before any title is said out loud.
select q, c.verdict, c.title_id, c.title, c.year, c.state
from unnest(array['<title one>', '<title two>']) q
cross join lateral film_check(q) c;

-- "Seen it" on a title the check called fresh (SELECT the row first).
update film_titles set seen_before = true, seen_note = '<his words, date>', memory_score = <n or null>
where id = '<uuid>';

-- 2. The pick: one rec row for the chosen film only, carrying the sealed envelope.
select film_expire_recs();   -- no cron runs this; without it the open-rec cap (15) eventually refuses the insert
select provider_name from film_services where active;   -- compare with providers on the film_check row
insert into film_recommendations (id, title_id, suggested_title, reasoning, source, status, predicted_score, predicted_on)
values (gen_random_uuid(), '<uuid or null>', '<Title (year)>', '<why, one line>', 'claude-chat', 'suggested', <8.4>, current_date);
-- If film_check said OPEN REC, update that row instead:
update film_recommendations set predicted_score = <8.4>, predicted_on = current_date
where title_id = '<uuid>' and status = 'suggested';

-- 3. His number: the log, then the wall line, then the envelope.
-- Not in the registry? Thin row first; the weekly Code pass hydrates it.
insert into film_titles (id, title, year, media_type) values (gen_random_uuid(), '<Title>', <year>, 'movie');
select distinct tag from film_log, unnest(vibe_tags) tag order by 1;   -- reuse existing tags
insert into film_log (id, title_id, watched_at, rating, rating_estimated, hot_take, vibe_tags, emotional_key, context, is_rewatch)
values (gen_random_uuid(), '<uuid>', '<his date, America/New_York>', <9.3>, false, '<his words verbatim>',
        array['<tag>', '<tag>'], '<tense|dread|fun|cozy|awe|sad|camp>', '<solo, rental, etc>', false);
select rank, total, above_title, above_score, below_title, below_score from film_rank('<uuid>');
select predicted_score from film_recommendations
where title_id = '<uuid>' and predicted_score is not null and predicted_on >= current_date - 14
order by created_at desc limit 1;   -- no row = self-found, no envelope

-- Abandoned instead of finished: no log row.
update film_titles set abandoned_on = current_date, abandon_note = '<his reason>' where id = '<uuid>';

-- 4. The night note, silent, at the close.
insert into film_session_notes (id, note_date, note)
values (gen_random_uuid(), current_date, 'Dixon: "<line>" / Leonard: "<line>" / ... Then one line of what happened.');

-- 5. On request.
select kind, dated, title, snippet from film_recall('<what he asked about>');
insert into film_watchlist (id, title_id, status, added_by, added_reason)
values (gen_random_uuid(), '<uuid>', 'queued', 'claude-chat', '<the real reason>');
select b -> 'queue' as queue, b -> 'open_recs' as open_recs from film_session_brief() b;
update film_titles set certified_on = current_date, certified_score = <9.4>, certified_line = '<his line>'
where id = '<uuid>';
