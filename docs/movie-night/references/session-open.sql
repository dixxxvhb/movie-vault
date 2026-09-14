-- Session open. Run in this order. All through the Supabase MCP, project swjqlfcqvcrnydpyjyog.

-- 0. (bash) date

-- 1. Everything at once. Expires stale recs on the way in.
select film_session_brief();

-- 2. Tonight's row. The brief carries it as `tonight`; write it if it is null.
insert into film_sessions (session_date, energy, key_wanted, runtime_budget, company, mode, note)
values (current_date, '<flat|ok|up>', '<key or null>', <minutes or null>, '<who or null>', '<pick|slate>', '<half a sentence or null>');

-- 3. Debt, if brief.debt_n is non-zero. Pay before pitching.
select * from film_night_debt;

-- 4. Mailbox, if brief.mailbox_n is non-zero.
select id, created_at, note from film_mailbox where read_at is null order by created_at;

-- Candidates before cards. Null budget means no runtime limit.
select title, year, runtime_minutes, providers, why
from film_pitch_pool('<key>', <minutes or null>, 12);

-- Per pitch:
select verdict, title, year, state, live_score, memory_score, runtime_minutes, providers, provenance
from film_check('<title>');

-- Per debrief:
select verdict, title_id, title, year, state from film_check('<what he said>');

-- Bloodlines for a pick:
select relation, note, directional from film_links l
join film_titles a on a.id = l.from_title_id
join film_titles b on b.id = l.to_title_id
where a.title ilike '%<title>%' or b.title ilike '%<title>%';

-- Lightning-round seen audit when slates keep whiffing:
select * from film_audit_menu('<lane>', 8);

-- Where a film lands once his number is in (say the line out loud):
select rank, total, above_title, above_score, below_title, below_score
from film_rank('<title uuid>');

-- What did he say about it. Run this before answering from memory.
select kind, dated, title, snippet from film_recall('fincher');

-- Taste from evidence, report-only:
select dim, key, n, avg_score from film_taste_signals order by avg_score desc;
select * from film_calibration;

-- Retro:
select film_retro();
