-- Movie Night v4, pass 2, part 2.
-- The subtitled row joins film_taste_signals, and the pitch pool reads
-- TMDB keywords as well as genres when it matches the night's key.
-- Report only. Rule 6 stands: nothing here changes a score.

create or replace view public.film_taste_signals as
with w as (
  select l.rating, l.emotional_key, l.vibe_tags,
         t.runtime_minutes, t.year, t.genres, t.director, t.original_language
  from film_log l
  join film_titles t on t.id = l.title_id
  where t.media_type = 'movie' and l.rating is not null
)
select 'tag'::text as dim, tg.tg as key, count(*) as n, round(avg(w.rating), 1) as avg_score
  from w, lateral unnest(coalesce(w.vibe_tags, '{}'::text[])) tg(tg)
 group by tg.tg having count(*) >= 3
union all
select 'emotional_key'::text, w.emotional_key, count(*), round(avg(w.rating), 1)
  from w where w.emotional_key is not null and w.emotional_key <> ''
 group by w.emotional_key
union all
select 'runtime_band'::text,
       case when w.runtime_minutes < 100 then 'short'
            when w.runtime_minutes < 130 then 'mid'
            when w.runtime_minutes < 160 then 'long'
            else 'epic' end,
       count(*), round(avg(w.rating), 1)
  from w where w.runtime_minutes is not null
 group by 2
union all
select 'decade'::text, ((w.year / 10 * 10)::text) || 's', count(*), round(avg(w.rating), 1)
  from w where w.year is not null
 group by 2
union all
select 'director'::text, d.d, count(*), round(avg(w.rating), 1)
  from w, lateral unnest(coalesce(w.director, '{}'::text[])) d(d)
 group by d.d having count(*) >= 2
union all
select 'genre'::text, g.g, count(*), round(avg(w.rating), 1)
  from w, lateral unnest(coalesce(w.genres, '{}'::text[])) g(g)
 group by g.g having count(*) >= 3
union all
select 'subtitled'::text,
       case when w.original_language is null then '?'
            when w.original_language = 'en' then 'no'
            else 'yes' end,
       count(*), round(avg(w.rating), 1)
  from w
 group by 2;

create or replace function public.film_pitch_pool(p_key text, p_budget integer, p_n integer default 12)
returns table(title_id uuid, title text, year integer, runtime_minutes integer, providers text[], why text[])
language sql
stable
set search_path to 'public'
as $function$
  with cand as (
    select s.title_id, s.title, s.year, s.runtime_minutes, s.providers, s.pitch_count,
           t.genres, t.director, t.keywords
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
          and exists (select 1 from unnest(coalesce(c.genres, '{}'::text[])
                                        || coalesce(c.keywords, '{}'::text[])) g
                       where lower(g) = lower(kt.tag)))::int as key_hits,
      (select array_agg(distinct kt.tag) from public.film_key_tags kt
        where kt.key = p_key
          and exists (select 1 from unnest(coalesce(c.genres, '{}'::text[])
                                        || coalesce(c.keywords, '{}'::text[])) g
                       where lower(g) = lower(kt.tag))) as key_tags,
      (select round(avg(sig.avg_score), 2) from public.film_taste_signals sig
        where (sig.dim = 'genre' and sig.key = any (coalesce(c.genres, '{}'::text[])))
           or (sig.dim = 'director' and sig.key = any (coalesce(c.director, '{}'::text[])))
           or (sig.dim = 'tag' and sig.key = any (coalesce(c.keywords, '{}'::text[])))) as taste_avg,
      (select array_agg(sig.dim || ' ' || sig.key || ' ' || sig.avg_score || ' (n=' || sig.n || ')')
         from public.film_taste_signals sig
        where (sig.dim = 'genre' and sig.key = any (coalesce(c.genres, '{}'::text[])))
           or (sig.dim = 'director' and sig.key = any (coalesce(c.director, '{}'::text[])))
           or (sig.dim = 'tag' and sig.key = any (coalesce(c.keywords, '{}'::text[])))) as taste_why
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
$function$;
