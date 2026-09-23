-- vault_pull(): every data/ file the wall needs, in one call.
--
-- Le Gamaar plan, Session 1. Before this, a wall refresh meant running the 13
-- queries in scripts/PULL.sql through an MCP session and hand-copying ~150 KB
-- of JSON into files. Now the vault-pull edge function calls this with the
-- service role and scripts/pull.py writes each key to data/<key> verbatim.
--
-- This function IS the pull. scripts/PULL.sql is kept as the readable,
-- commented mirror of the same queries; when one changes, change both.
--
-- Changes from PULL.sql as of 2026-09-04:
--   * log_extra.json carries `key` (emotional_key). The old query 3 dropped it,
--     so a literal re-pull would have wiped all 47 keys on the wall.
--   * cast.json is new: {slug: [{id, name, character, order, profile}]} for every
--     ledger and archive slug with a stored cast (film-enrich v4).
--
-- Service role only. The data it returns is already published on the public
-- site, but there is no reason to hand an open RPC to the anon key.

create or replace function public.vault_pull()
returns jsonb
language sql
stable
set search_path = public
as $$
with slug_override(title, slug) as (values
  ('Everything Everywhere All at Once',        'eeaao'),
  ('James Bond (the franchise)',               'james-bond'),
  ('Kingsman: The Secret Service',             'kingsman'),
  ('Planet of the Apes (the modern trilogy)',  'planet-of-the-apes'),
  ('Spider-Man: Into the Spider-Verse',        'spider-verse'),
  ('The Bourne trilogy',                       'bourne-trilogy'),
  ('The Girl with the Dragon Tattoo',          'dragon-tattoo'),
  ('The Lord of the Rings (trilogy)',          'lotr'),
  ('The Silence of the Lambs',                 'silence-of-the-lambs'),
  ('The Truman Show',                          'truman-show')
),
archive_rows as (
  select t.*,
         coalesce(o.slug,
           lower(regexp_replace(regexp_replace(t.title, '[^a-zA-Z0-9 ]', '', 'g'), '\s+', '-', 'g'))) as slug
  from film_titles t
  left join slug_override o on o.title = t.title
  where t.seen_before
    and not exists (select 1 from film_log l where l.title_id = t.id)
),
latest as (
  select distinct on (p.slug) p.slug, p.title_id, l.watched_at, l.rating, l.vibe_tags,
         l.is_rewatch, l.emotional_key, l.context, l.hot_take
  from film_ledger_panels p
  join film_log l on l.title_id = p.title_id
  order by p.slug, l.watched_at desc
)
select jsonb_build_object(

  -- 1  {slug: [watched_at, rating, title]}
  'ledger_meta.json', (
    select json_object_agg(x.slug, json_build_array(x.watched_at::text, x.rating::float8, t.title))
    from latest x join film_titles t on t.id = x.title_id),

  -- 2  {slug: {year, genres, poster, runtime, director}}
  'titles.json', (
    select json_object_agg(p.slug, json_build_object(
             'year', t.year, 'genres', t.genres, 'poster', t.poster_path,
             'runtime', t.runtime_minutes, 'director', t.director))
    from film_ledger_panels p join film_titles t on t.id = p.title_id),

  -- 3  {_source, films: {slug: {vibes, rewatch, key}}}   (key restored)
  'log_extra.json', json_build_object(
    '_source', 'film_log joined to film_ledger_panels on title_id. vibe_tags verbatim; rewatch = film_log.is_rewatch; key = film_log.emotional_key. Pulled via vault_pull().',
    'films', (select json_object_agg(slug, json_build_object(
                'vibes', coalesce(vibe_tags, '{}'), 'rewatch', coalesce(is_rewatch, false),
                'key', emotional_key))
              from latest)),

  -- 4  {_source, takes: {slug: {context, hot_take}}}   hot_take VERBATIM
  'hot_takes.json', json_build_object(
    '_source', 'film_log joined to film_ledger_panels on title_id, latest watch per slug. hot_take is VERBATIM Dixon, profanity intact. Pulled via vault_pull().',
    'takes', (select json_object_agg(slug, json_build_object('context', context, 'hot_take', hot_take))
              from latest)),

  -- 5  [{slug, palette_css, panel_html}]
  'ledger_panels.json', (
    select json_agg(json_build_object('slug', slug, 'palette_css', palette_css, 'panel_html', panel_html)
                    order by slug)
    from film_ledger_panels),

  -- 6  {slug: svg}
  'photos.json', coalesce((
    select json_object_agg(slug, photo_svg)
    from film_ledger_panels where photo_svg is not null), '{}'::json),

  -- 7  [{to, from, note, weight, relation, directional}]   titles, resolved by emit
  'links.json', coalesce((
    select json_agg(json_build_object(
             'to', b.title, 'from', a.title, 'note', l.note,
             'weight', l.weight, 'relation', l.relation, 'directional', l.directional)
           order by l.weight desc nulls last, a.title)
    from film_links l
    join film_titles a on a.id = l.from_title_id
    join film_titles b on b.id = l.to_title_id), '[]'::json),

  -- 8  {_source, lessons: [{rule, weight, evidence, taught_by}]}   taste scope only
  --    evidence + taught_by feed emit's derived citation graph (20 of 21 laws
  --    cite films). The old PULL.sql query 8 dropped both.
  'lessons.json', json_build_object(
    '_source', 'film_lessons where active and scope=''taste''. rule + weight + evidence prose + taught_by slug. Pulled via vault_pull().',
    'lessons', (
      select json_agg(json_build_object('rule', l.rule, 'weight', l.weight,
                                        'evidence', l.evidence, 'taught_by', p.slug)
                      order by l.weight desc nulls last, l.learned_on, l.created_at)
      from film_lessons l
      left join film_ledger_panels p on p.title_id = l.taught_by_title_id
      where l.active and l.scope = 'taste')),

  -- 9  {_source, queue: [{note, rank, year, title, reason}]}
  'queue.json', json_build_object(
    '_source', 'film_watchlist where status = ''queued'', joined to film_titles. Ordered by queue_rank, unranked last. Pulled via vault_pull().',
    'queue', coalesce((
      select json_agg(json_build_object(
               'note', w.priority_note, 'rank', w.queue_rank, 'year', t.year,
               'title', t.title, 'reason', w.added_reason)
             order by w.queue_rank nulls last)
      from film_watchlist w join film_titles t on t.id = w.title_id
      where w.status = 'queued'), '[]'::json)),

  -- 10 {_source, archive: [...]}   the ten hand-authored slugs live in slug_override
  'archive.json', json_build_object(
    '_source', 'film_titles where seen_before and no film_log row. memory_score/seen_bucket columns are the split. Pulled via vault_pull().',
    'archive', (
      select json_agg(json_build_object(
               'slug', slug, 'title', title, 'year', year, 'seen_note', seen_note,
               'abandon_note', abandon_note, 'memory_score', memory_score::float8,
               'seen_bucket', seen_bucket, 'poster', poster_path, 'genres', genres,
               'director', director, 'runtime', runtime_minutes)
             order by title)
      from archive_rows)),

  -- 11 {titles: {Title: {snap, aff}}}
  'archive_extra.json', json_build_object('titles', coalesce((
    select json_object_agg(title, json_build_object('snap', snap_line, 'aff', affinity))
    from archive_rows
    where snap_line is not null or affinity is not null), '{}'::json)),

  -- 12 {_source, quotes: [{film, quote, said_by}]}
  'quotes.json', json_build_object(
    '_source', 'film_quotes joined to film_titles. `film` is the TITLE string; emit_vault_data.py resolves it. Pulled via vault_pull().',
    'quotes', coalesce((
      select json_agg(json_build_object('film', t.title, 'quote', q.quote, 'said_by', q.said_by)
                      order by t.title)
      from film_quotes q join film_titles t on t.id = q.title_id), '[]'::json)),

  -- 13 {_source, mine: [...], titles: {Title: {flat, free, rent}}}
  'providers.json', json_build_object(
    '_source', 'film_titles.watch_providers (TMDB, US) for film_watchlist status=''queued'', plus film_services where active. Pulled via vault_pull().',
    'mine', (select coalesce(json_agg(provider_name order by provider_name), '[]'::json)
             from film_services where active),
    -- watch_providers already IS the US object (film-tmdb stores results.US);
    -- the ->'US' fallback covers any row written the old way. "ads" is TMDB's
    -- free-with-ads bucket and counts as free.
    'titles', coalesce((
      select json_object_agg(t.title, json_build_object(
               'flat', coalesce((select json_agg(x->>'provider_name')
                                 from jsonb_array_elements(coalesce(wp->'flatrate', '[]')) x), '[]'::json),
               'free', coalesce((select json_agg(x->>'provider_name')
                                 from jsonb_array_elements(coalesce(wp->'free', '[]') || coalesce(wp->'ads', '[]')) x), '[]'::json),
               'rent', (wp->'rent') is not null or (wp->'buy') is not null))
      from film_watchlist w
      join film_titles t on t.id = w.title_id
      cross join lateral (select coalesce(t.watch_providers->'US', t.watch_providers) as wp) z
      where w.status = 'queued'), '{}'::json)),

  -- 14 {slug: [{id, name, character, order, profile}]}   NEW, ledger + archive
  'cast.json', coalesce((
    select json_object_agg(s.slug, (
             select json_agg(json_build_object(
                      'id', (c->>'id')::int, 'name', c->>'name', 'character', c->>'character',
                      'order', (c->>'order')::int, 'profile', c->>'profile_path')
                    order by (c->>'order')::int)
             from jsonb_array_elements(s.cast_top) c))
    from (
      select p.slug, t.cast_top from film_ledger_panels p join film_titles t on t.id = p.title_id
      where t.cast_top is not null and jsonb_array_length(t.cast_top) > 0
      union all
      select slug, cast_top from archive_rows
      where cast_top is not null and jsonb_array_length(cast_top) > 0
    ) s), '{}'::json)
);
$$;

revoke all on function public.vault_pull() from public, anon, authenticated;
grant execute on function public.vault_pull() to service_role;

comment on function public.vault_pull() is
  'Every data/ file for the Vault wall in one jsonb, keyed by filename. Service role only; called by the vault-pull edge function.';
