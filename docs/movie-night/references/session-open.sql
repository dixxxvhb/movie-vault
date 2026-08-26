-- Session open. Run in this order. All through the Supabase MCP, project swjqlfcqvcrnydpyjyog.

-- 0. (bash) date

-- 1. Everything at once.
select film_session_brief();

-- 2. Debt, if the brief showed any. Pay before pitching.
select * from film_night_debt;

-- 3. Mailbox.
select id, created_at, note from film_mailbox where read_at is null order by created_at;

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

-- Retro:
select film_retro();
