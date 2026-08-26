-- Movie Night v3, step 5: one canonical answer (film_status), one-call gate
-- (film_check), self-enforcing contract (film_night_debt), warm start
-- (film_session_brief), audit menu, rewatch shelf, retro.

-- 5a. film_status
create or replace view public.film_status
with (security_invoker = true) as
with live as (
  select distinct on (l.title_id) l.title_id, l.rating, l.watched_at
  from public.film_log l
  order by l.title_id, l.watched_at desc
),
log_counts as (
  select title_id, count(*) as n from public.film_log group by title_id
),
recs as (
  select title_id,
         count(*) as pitch_count,
         max(created_at)::date as last_pitched_on,
         (array_agg(id order by created_at desc) filter (where status = 'suggested'))[1] as open_rec_id,
         bool_or(status = 'dismissed') as any_dismissed
  from public.film_recommendations
  group by title_id
),
wl as (
  select distinct on (title_id) title_id, status, added_reason
  from public.film_watchlist
  order by title_id, created_at desc
)
select
  t.id as title_id,
  t.title,
  t.year,
  t.media_type,
  case
    when live.title_id is not null then 'ledger'
    when t.certified_on is not null then 'certified'
    when t.memory_score is not null then 'archive'
    when t.seen_before and t.abandoned_on is null and t.seen_bucket is not null then 'hazy'
    when t.seen_before and t.abandoned_on is null and t.seen_note is not null then 'seen'
    when t.abandoned_on is not null then 'abandoned'
    when v.title_id is not null then 'veto'
    when wl.status = 'queued' then 'queued'
    when wl.status = 'watching' then 'watching'
    when recs.open_rec_id is not null then 'pitched'
    when recs.any_dismissed then 'dismissed'
    else 'fresh'
  end as state,
  live.rating as live_score,
  live.watched_at as live_watched_at,
  coalesce(log_counts.n, 0) > 1 as is_rewatch_seen,
  t.memory_score,
  t.seen_bucket,
  t.certified_score,
  recs.open_rec_id,
  recs.last_pitched_on,
  coalesce(recs.pitch_count, 0) as pitch_count,
  t.runtime_minutes,
  (select array_agg(distinct u.p->>'provider_name')
     from (
       select jsonb_array_elements(coalesce(t.watch_providers->'flatrate','[]'::jsonb)) as p
       union all
       select jsonb_array_elements(coalesce(t.watch_providers->'free','[]'::jsonb))
       union all
       select jsonb_array_elements(coalesce(t.watch_providers->'ads','[]'::jsonb))
     ) u) as providers,
  coalesce(wl.added_reason, t.seen_note, t.abandon_note) as provenance
from public.film_titles t
left join live on live.title_id = t.id
left join log_counts on log_counts.title_id = t.id
left join recs on recs.title_id = t.id
left join wl on wl.title_id = t.id
left join public.film_vetoes v on v.title_id = t.id;

grant select on public.film_status to authenticated, service_role;

-- 5b. film_check
create or replace function public.film_check(q text)
returns table (
  title_id uuid, title text, year int, media_type text, state text,
  live_score numeric, live_watched_at date, is_rewatch_seen boolean,
  memory_score numeric, seen_bucket text, certified_score numeric,
  open_rec_id uuid, last_pitched_on date, pitch_count bigint,
  runtime_minutes int, providers text[], provenance text,
  similarity real, verdict text
)
language sql stable security invoker
set search_path to 'public', 'extensions'
as $$
  select s.*,
    extensions.similarity(s.title, q) as similarity,
    case
      when v.title_id is not null then 'VETO: only Dixon raises it'
      when s.state = 'ledger' then 'ON THE WALL ' || s.live_score || ' (' || s.live_watched_at || ')'
      when s.state = 'certified' then 'CERTIFIED ' || s.certified_score || ' (' || t.certified_on || ')'
      when s.state = 'archive' then 'ARCHIVE memory ' || s.memory_score || ', rewatch only, disclose'
      when s.state = 'hazy' then 'HAZY, rewatch only, disclose'
      when s.state = 'seen' then 'SEEN, unscored, confirm before pitching'
      when s.state = 'abandoned' then 'ABANDONED ' || t.abandoned_on || ': ' || coalesce(t.abandon_note, '')
      when s.state = 'queued' then 'QUEUED (' || coalesce(s.provenance, 'no reason recorded') || ')'
      when s.state = 'watching' then 'WATCHING'
      when s.state = 'pitched' then 'OPEN REC since ' || coalesce((select r.created_at::date from public.film_recommendations r where r.id = s.open_rec_id)::text, s.last_pitched_on::text)
      when s.state = 'dismissed' then 'DISMISSED ' || coalesce((select max(r.created_at)::date from public.film_recommendations r where r.title_id = s.title_id and r.status = 'dismissed')::text, '')
      else 'FRESH'
    end as verdict
  from public.film_status s
  join public.film_titles t on t.id = s.title_id
  left join public.film_vetoes v on v.title_id = s.title_id
  where extensions.similarity(s.title, q) > 0.35
  order by extensions.similarity(s.title, q) desc, s.year desc nulls last;
$$;

grant execute on function public.film_check(text) to authenticated, service_role;

-- 5c. film_night_debt
create or replace view public.film_night_debt
with (security_invoker = true) as
with marker as (
  select max(created_at) as published_at
  from public.film_mailbox
  where note like 'published through%'
)
select l.id as log_id, t.title, l.watched_at, 'hot_take' as item
from public.film_log l join public.film_titles t on t.id = l.title_id
where l.hot_take is null or l.hot_take = ''
union all
select l.id, t.title, l.watched_at, 'vibe_tags'
from public.film_log l join public.film_titles t on t.id = l.title_id
where l.vibe_tags is null or coalesce(array_length(l.vibe_tags, 1), 0) = 0
union all
select l.id, t.title, l.watched_at, 'emotional_key'
from public.film_log l join public.film_titles t on t.id = l.title_id
where l.emotional_key is null or l.emotional_key = ''
union all
select l.id, t.title, l.watched_at, 'panel'
from public.film_log l join public.film_titles t on t.id = l.title_id
where not exists (select 1 from public.film_ledger_panels p where p.title_id = l.title_id)
union all
select l.id, t.title, l.watched_at, 'note'
from public.film_log l join public.film_titles t on t.id = l.title_id
where not exists (select 1 from public.film_session_notes n where n.note_date = l.watched_at)
union all
select null::uuid,
       string_agg(t.title, ', ' order by l.watched_at),
       max(l.watched_at),
       'wall_behind'
from public.film_log l
join public.film_titles t on t.id = l.title_id
cross join marker m
where m.published_at is null or l.created_at > m.published_at
having count(*) > 0;

grant select on public.film_night_debt to authenticated, service_role;

-- 5d. film_session_brief
create or replace function public.film_session_brief()
returns jsonb
language sql stable security invoker
set search_path to 'public'
as $$
select jsonb_build_object(
  'now', to_char(now() at time zone 'America/New_York', 'Dy YYYY-MM-DD HH24:MI'),
  'last_nights', (
    select coalesce(jsonb_agg(x order by x->>'watched_at' desc), '[]'::jsonb) from (
      select jsonb_build_object(
        'watched_at', l.watched_at, 'title', t.title, 'score', l.rating,
        'emotional_key', l.emotional_key, 'vibe_tags', to_jsonb(l.vibe_tags)) as x
      from public.film_log l join public.film_titles t on t.id = l.title_id
      where l.watched_at in (select distinct watched_at from public.film_log order by watched_at desc limit 7)
    ) q),
  'queue', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', s.title, 'status', s.state, 'provenance', s.provenance,
      'runtime_minutes', s.runtime_minutes, 'providers', to_jsonb(s.providers))
      order by s.title), '[]'::jsonb)
    from public.film_status s where s.state in ('queued','watching')),
  'open_recs', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', coalesce(t.title, r.suggested_title),
      'age_days', (current_date - r.created_at::date),
      'source', r.source) order by r.created_at), '[]'::jsonb)
    from public.film_recommendations r
    left join public.film_titles t on t.id = r.title_id
    where r.status = 'suggested'),
  'services', (
    select coalesce(jsonb_agg(provider_name order by provider_name), '[]'::jsonb)
    from public.film_services where active),
  'lessons_digest', jsonb_build_object(
    'law', (select coalesce(jsonb_agg(rtrim(split_part(rule, '. ', 1), '.') || '.' order by learned_on), '[]'::jsonb)
            from public.film_lessons where active and weight = 5),
    'taste', (select coalesce(jsonb_agg(jsonb_build_object('rule', rule, 'weight', weight) order by weight desc, learned_on), '[]'::jsonb)
              from public.film_lessons where active and weight >= 3 and weight < 5 and scope = 'taste'),
    'ritual', (select coalesce(jsonb_agg(jsonb_build_object('rule', rule, 'weight', weight) order by weight desc, learned_on), '[]'::jsonb)
               from public.film_lessons where active and weight >= 3 and weight < 5 and scope in ('ritual','protocol'))),
  'saturation', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', t.title, 'score', l.rating,
      'top_tag', (l.vibe_tags)[1],
      'closes_on', l.watched_at + 7)), '[]'::jsonb)
    from public.film_log l join public.film_titles t on t.id = l.title_id
    where l.rating >= 9.5 and l.watched_at > current_date - 7),
  'last_note', (
    select jsonb_build_object('note_date', note_date, 'note', note)
    from public.film_session_notes order by note_date desc, created_at desc limit 1),
  'debt', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', d.title, 'watched_at', d.watched_at, 'item', d.item)), '[]'::jsonb)
    from public.film_night_debt d),
  'mailbox', (
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'created_at', created_at, 'note', note) order by created_at), '[]'::jsonb)
    from public.film_mailbox where read_at is null),
  'emotional_keys', (
    select coalesce(content->'emotional_keys', '[]'::jsonb)
    from public.film_taste_profile order by updated_at desc limit 1)
);
$$;

grant execute on function public.film_session_brief() to authenticated, service_role;

-- 5e. film_audit_menu
create or replace function public.film_audit_menu(lane text, n int)
returns table (title_id uuid, title text, year int, media_type text, runtime_minutes int)
language sql stable security invoker
set search_path to 'public'
as $$
  select s.title_id, s.title, s.year, s.media_type, s.runtime_minutes
  from public.film_status s
  join public.film_titles t on t.id = s.title_id
  where s.state = 'fresh'
    and (s.last_pitched_on is null or s.last_pitched_on < current_date - 30)
    and (
      exists (select 1 from unnest(coalesce(t.genres, '{}')) g where g ilike '%' || lane || '%')
      or s.title ilike '%' || lane || '%'
    )
  order by random()
  limit n;
$$;

grant execute on function public.film_audit_menu(text, int) to authenticated, service_role;

-- 5f. film_rewatch_shelf
create or replace view public.film_rewatch_shelf
with (security_invoker = true) as
select s.title_id, s.title, s.year, s.state, s.memory_score, s.seen_bucket,
       s.runtime_minutes, s.providers, s.provenance
from public.film_status s
where s.state in ('hazy', 'archive')
order by (s.state = 'hazy') desc, s.memory_score desc nulls last, s.title;

grant select on public.film_rewatch_shelf to authenticated, service_role;

-- 5g. film_retro
create or replace function public.film_retro()
returns jsonb
language sql stable security invoker
set search_path to 'public'
as $$
select jsonb_build_object(
  'log_titles', (select count(distinct title_id) from public.film_log),
  'panel_rows', (select count(*) from public.film_ledger_panels),
  'log_without_panel', (
    select coalesce(jsonb_agg(distinct t.title), '[]'::jsonb)
    from public.film_log l join public.film_titles t on t.id = l.title_id
    where not exists (select 1 from public.film_ledger_panels p where p.title_id = l.title_id)),
  'stale_open_recs', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', coalesce(t.title, r.suggested_title),
      'age_days', current_date - r.created_at::date) order by r.created_at), '[]'::jsonb)
    from public.film_recommendations r
    left join public.film_titles t on t.id = r.title_id
    where r.status = 'suggested' and r.created_at < now() - interval '21 days'),
  'titles_missing_tmdb', (select count(*) from public.film_titles where tmdb_id is null),
  'titles_missing_providers', (select count(*) from public.film_titles where watch_providers is null),
  'weight5_without_evidence', (
    select coalesce(jsonb_agg(left(rule, 100)), '[]'::jsonb)
    from public.film_lessons where active and weight = 5 and (evidence is null or evidence = '')),
  'profile_drift_keys', (
    select coalesce(jsonb_agg(k), '[]'::jsonb)
    from (select jsonb_object_keys(content) as k
          from public.film_taste_profile order by updated_at desc limit 1) keys
    where k like 'vault_counts%' or k = 'current_mood'),
  'mailbox_unread', (select count(*) from public.film_mailbox where read_at is null)
);
$$;

grant execute on function public.film_retro() to authenticated, service_role;
