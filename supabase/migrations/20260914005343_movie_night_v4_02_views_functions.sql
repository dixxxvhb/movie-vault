-- Movie Night v4, step 2: taste from evidence, a brief that fits, recall, rank.
-- Rule 6 stands: film_taste_signals and film_calibration are report-only.
-- Nothing here writes a score.

-- 2a. film_status gains the expired state, ranked below dismissed.
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
         bool_or(status = 'dismissed') as any_dismissed,
         bool_or(status = 'expired') as any_expired
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
    when recs.any_expired then 'expired'
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

-- 2b. film_check: an expired-only title is pitchable again, with the disclosure.
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
as $fn$
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
      when s.state = 'expired' then 'FRESH (pitched ' || coalesce(to_char((select max(r.created_at) from public.film_recommendations r where r.title_id = s.title_id and r.status = 'expired'), 'Mon YYYY'), 'once') || ', passed)'
      else 'FRESH'
    end as verdict
  from public.film_status s
  join public.film_titles t on t.id = s.title_id
  left join public.film_vetoes v on v.title_id = s.title_id
  where extensions.similarity(s.title, q) > 0.35
  order by extensions.similarity(s.title, q) desc, s.year desc nulls last;
$fn$;

grant execute on function public.film_check(text) to authenticated, service_role;

-- 2c. film_expire_recs: idempotent, called at the top of the brief.
create or replace function public.film_expire_recs()
returns int
language plpgsql
volatile
security definer
set search_path to 'public'
as $fn$
declare
  k int;
begin
  update public.film_recommendations
     set status = 'expired'
   where status = 'suggested'
     and created_at < now() - interval '21 days';
  get diagnostics k = row_count;
  return k;
end;
$fn$;

grant execute on function public.film_expire_recs() to authenticated, service_role;

-- 2d. film_taste_signals: taste derived from the log, not from doctrine.
-- Report-only, films only. Nothing reads this to change a score.
create or replace view public.film_taste_signals
with (security_invoker = true) as
with w as (
  select l.rating, l.emotional_key, l.vibe_tags,
         t.runtime_minutes, t.year, t.genres, t.director
  from public.film_log l
  join public.film_titles t on t.id = l.title_id
  where t.media_type = 'movie' and l.rating is not null
)
select 'tag'::text as dim, tg::text as key, count(*)::bigint as n, round(avg(w.rating), 1) as avg_score
from w, unnest(coalesce(w.vibe_tags, '{}'::text[])) as tg
group by tg having count(*) >= 3
union all
select 'emotional_key', w.emotional_key, count(*)::bigint, round(avg(w.rating), 1)
from w where w.emotional_key is not null and w.emotional_key <> ''
group by w.emotional_key
union all
select 'runtime_band',
  case when w.runtime_minutes < 100 then 'short'
       when w.runtime_minutes < 130 then 'mid'
       when w.runtime_minutes < 160 then 'long'
       else 'epic' end,
  count(*)::bigint, round(avg(w.rating), 1)
from w where w.runtime_minutes is not null
group by 2
union all
select 'decade', ((w.year / 10) * 10)::text || 's', count(*)::bigint, round(avg(w.rating), 1)
from w where w.year is not null
group by 2
union all
select 'director', d::text, count(*)::bigint, round(avg(w.rating), 1)
from w, unnest(coalesce(w.director, '{}'::text[])) as d
group by d having count(*) >= 2
union all
select 'genre', g::text, count(*)::bigint, round(avg(w.rating), 1)
from w, unnest(coalesce(w.genres, '{}'::text[])) as g
group by g having count(*) >= 3;

grant select on public.film_taste_signals to authenticated, service_role;

-- 2e. film_calibration: how good Leonard's bets are. Report-only.
create or replace view public.film_calibration
with (security_invoker = true) as
with p as (
  select e->>'title' as title,
         (e->>'predicted')::numeric as predicted,
         (e->>'live')::numeric as live,
         (e->>'date')::date as dated
  from public.film_taste_profile pr,
       lateral jsonb_array_elements(coalesce(pr.content #> '{calibration,predictions}', '[]'::jsonb)) e
  where pr.id = (select id from public.film_taste_profile order by updated_at desc limit 1)
),
j as (
  select p.*, l.emotional_key, l.vibe_tags
  from p
  left join public.film_titles t on lower(t.title) = lower(p.title)
  left join public.film_log l on l.title_id = t.id and l.watched_at = p.dated
)
select
  (select count(*) from p)::bigint as n,
  (select round(avg(live - predicted), 2) from p) as mean_signed_error,
  (select round(avg(abs(live - predicted)), 2) from p) as mean_abs_error,
  (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
     select jsonb_build_object('emotional_key', emotional_key, 'n', count(*),
                               'mean_signed_error', round(avg(live - predicted), 2)) as x
     from j where emotional_key is not null
     group by emotional_key order by count(*) desc limit 5) a) as by_emotional_key,
  (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
     select jsonb_build_object('tag', tg, 'n', count(*),
                               'mean_signed_error', round(avg(live - predicted), 2)) as x
     from j, unnest(coalesce(j.vibe_tags, '{}'::text[])) tg
     group by tg order by count(*) desc limit 5) b) as by_tag;

grant select on public.film_calibration to authenticated, service_role;

-- 2f. film_certify_shelf: the archive titles most obviously owed a ruling.
create or replace view public.film_certify_shelf
with (security_invoker = true) as
select s.title_id, s.title, s.year, s.memory_score, s.seen_bucket
from public.film_status s
join public.film_titles t on t.id = s.title_id
where s.state = 'archive' and s.memory_score >= 9 and t.certified_on is null
order by s.memory_score desc, s.title
limit 3;

grant select on public.film_certify_shelf to authenticated, service_role;

-- 2g. film_rank: where a title sits on the definitive list (ledger plus certified).
-- Order matches the wall: score desc, then title. See scripts/emit_vault_data.py.
create or replace function public.film_rank(p_title_id uuid)
returns table (
  rank bigint, total bigint,
  above_title text, above_score numeric,
  below_title text, below_score numeric
)
language sql stable security invoker
set search_path to 'public'
as $fn$
  with d as (
    select s.title_id, s.title, coalesce(s.live_score, s.certified_score) as score
    from public.film_status s
    where s.state in ('ledger', 'certified')
      and coalesce(s.live_score, s.certified_score) is not null
  ),
  r as (
    select title_id, title, score,
           row_number() over (order by score desc, lower(title)) as rn,
           count(*) over () as total
    from d
  )
  select me.rn, me.total, up.title, up.score, dn.title, dn.score
  from r me
  left join r up on up.rn = me.rn - 1
  left join r dn on dn.rn = me.rn + 1
  where me.title_id = p_title_id;
$fn$;

grant execute on function public.film_rank(uuid) to authenticated, service_role;

-- 2h. film_recall: what did he say about this. Run it before answering from memory.
create or replace function public.film_recall(q text)
returns table (kind text, dated date, title text, snippet text, rank real)
language sql stable security invoker
set search_path to 'public', 'extensions'
as $fn$
  with tq as (select websearch_to_tsquery('english', q) as v)
  select 'log'::text, l.watched_at, t.title,
         left(trim(coalesce(l.hot_take, '') || ' ' || coalesce(l.long_form, '')), 240),
         ts_rank_cd(to_tsvector('english', coalesce(l.hot_take, '') || ' ' || coalesce(l.long_form, '')), tq.v)
  from public.film_log l
  join public.film_titles t on t.id = l.title_id
  cross join tq
  where to_tsvector('english', coalesce(l.hot_take, '') || ' ' || coalesce(l.long_form, '')) @@ tq.v
  union all
  select 'note', n.note_date, null::text, left(coalesce(n.note, ''), 240),
         ts_rank_cd(to_tsvector('english', coalesce(n.note, '')), tq.v)
  from public.film_session_notes n cross join tq
  where to_tsvector('english', coalesce(n.note, '')) @@ tq.v
  union all
  select 'lesson', le.learned_on, null::text,
         left(trim(coalesce(le.rule, '') || ' ' || coalesce(le.evidence, '')), 240),
         ts_rank_cd(to_tsvector('english', coalesce(le.rule, '') || ' ' || coalesce(le.evidence, '')), tq.v)
  from public.film_lessons le cross join tq
  where to_tsvector('english', coalesce(le.rule, '') || ' ' || coalesce(le.evidence, '')) @@ tq.v
  union all
  select 'title', null::date, t.title, left(coalesce(t.snap_line, t.overview, ''), 240),
         extensions.similarity(t.title, q)
  from public.film_titles t
  where extensions.similarity(t.title, q) > 0.35
  order by 5 desc, 2 desc nulls last
  limit 20;
$fn$;

grant execute on function public.film_recall(text) to authenticated, service_role;

-- 2i. film_pitch_pool: candidates before cards. Works with film_key_tags empty.
create or replace function public.film_pitch_pool(p_key text, p_budget int, p_n int default 12)
returns table (
  title_id uuid, title text, year int, runtime_minutes int,
  providers text[], why text[]
)
language sql stable security invoker
set search_path to 'public'
as $fn$
  with cand as (
    select s.title_id, s.title, s.year, s.runtime_minutes, s.providers, s.pitch_count,
           t.genres, t.director
    from public.film_status s
    join public.film_titles t on t.id = s.title_id
    where s.state in ('fresh', 'expired')
      and (p_budget is null or (s.runtime_minutes is not null and s.runtime_minutes <= p_budget))
      and exists (
        select 1 from public.film_services sv
        where sv.active and sv.provider_name = any (coalesce(s.providers, '{}'::text[])))
  ),
  keyed as (
    select c.*,
      (select count(*) from public.film_key_tags kt
        where kt.key = p_key
          and exists (select 1 from unnest(coalesce(c.genres, '{}'::text[])) g
                       where lower(g) = lower(kt.tag)))::int as key_hits,
      (select array_agg(distinct kt.tag) from public.film_key_tags kt
        where kt.key = p_key
          and exists (select 1 from unnest(coalesce(c.genres, '{}'::text[])) g
                       where lower(g) = lower(kt.tag))) as key_tags,
      (select round(avg(sig.avg_score), 2) from public.film_taste_signals sig
        where (sig.dim = 'genre' and sig.key = any (coalesce(c.genres, '{}'::text[])))
           or (sig.dim = 'director' and sig.key = any (coalesce(c.director, '{}'::text[])))) as taste_avg,
      (select array_agg(sig.dim || ' ' || sig.key || ' ' || sig.avg_score || ' (n=' || sig.n || ')')
         from public.film_taste_signals sig
        where (sig.dim = 'genre' and sig.key = any (coalesce(c.genres, '{}'::text[])))
           or (sig.dim = 'director' and sig.key = any (coalesce(c.director, '{}'::text[])))) as taste_why
    from cand c
  )
  select k.title_id, k.title, k.year, k.runtime_minutes, k.providers,
    (case when k.key_hits > 0
          then array['key ' || p_key || ': ' || array_to_string(k.key_tags, ', ')]
          else '{}'::text[] end)
    || coalesce(k.taste_why, '{}'::text[])
    || (case when k.pitch_count = 0 then array['never pitched'] else '{}'::text[] end) as why
  from keyed k
  order by k.key_hits desc, coalesce(k.taste_avg, 0) desc, (k.pitch_count = 0) desc, k.title
  limit p_n;
$fn$;

grant execute on function public.film_pitch_pool(text, int, int) to authenticated, service_role;
