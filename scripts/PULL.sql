-- Refresh data/ from Supabase project swjqlfcqvcrnydpyjyog.
--
-- HOW TO USE: run each query below in a session that has the Supabase MCP
-- connected. Every query returns ONE row with ONE column named `j`, holding
-- the complete, final contents of its data/ file. Write that string to the
-- named file verbatim. No transformation, no merging, no hand-editing.
-- Then run `npm run data` and read the drift-guard summary.
--
-- Written 2026-09-04 after a five-film staleness (the wall sat at 42 while
-- Supabase held 47) cost a session thirteen hand-written queries. Nothing
-- here needs a credential: the pull runs inside an authorised MCP session,
-- which is why this is SQL and not a standalone Python script.
--
-- The slug is film_ledger_panels.slug throughout. A film with no panel row
-- is not on the wall, by design.

-- ============================================================ 1/13
-- data/ledger_meta.json   {slug: [watched_at, rating, title]}
select json_object_agg(slug, json_build_array(watched_at::text, rating::float8, title))::text as j
from (
  select distinct on (p.slug) p.slug, l.watched_at, l.rating, t.title
  from film_ledger_panels p
  join film_titles t on t.id = p.title_id
  join film_log l on l.title_id = p.title_id
  order by p.slug, l.watched_at desc
) x;

-- ============================================================ 2/13
-- data/titles.json   {slug: {year, genres, poster, runtime, director}}
select json_object_agg(slug, json_build_object(
         'year', year, 'genres', genres, 'poster', poster,
         'runtime', runtime, 'director', director))::text as j
from (
  select p.slug, t.year, t.genres, t.poster_path as poster,
         t.runtime_minutes as runtime, t.director
  from film_ledger_panels p
  join film_titles t on t.id = p.title_id
) x;

-- ============================================================ 3/13
-- data/log_extra.json   {_source, films: {slug: {vibes, rewatch}}}
select json_build_object(
  '_source', 'film_log joined to film_ledger_panels on title_id. vibe_tags verbatim; rewatch = film_log.is_rewatch. Pulled via scripts/PULL.sql.',
  'films', json_object_agg(slug, json_build_object('vibes', vibes, 'rewatch', rewatch))
)::text as j
from (
  select distinct on (p.slug) p.slug,
         coalesce(l.vibe_tags, '{}') as vibes,
         coalesce(l.is_rewatch, false) as rewatch
  from film_ledger_panels p
  join film_log l on l.title_id = p.title_id
  order by p.slug, l.watched_at desc
) x;

-- ============================================================ 4/13
-- data/hot_takes.json   {_source, takes: {slug: {context, hot_take}}}
-- hot_take is VERBATIM Dixon. Profanity and typos intact. Never clean it up.
select json_build_object(
  '_source', 'film_log joined to film_ledger_panels on title_id, latest watch per slug. hot_take is VERBATIM Dixon, profanity intact. Pulled via scripts/PULL.sql.',
  'takes', json_object_agg(slug, json_build_object('context', context, 'hot_take', hot_take))
)::text as j
from (
  select distinct on (p.slug) p.slug, l.context, l.hot_take
  from film_ledger_panels p
  join film_log l on l.title_id = p.title_id
  order by p.slug, l.watched_at desc
) x;

-- ============================================================ 5/13
-- data/ledger_panels.json   [{slug, palette_css, panel_html}]
-- The biggest file. ~80KB at 47 films; it may need paging in a chat surface.
select json_agg(json_build_object(
         'slug', slug, 'palette_css', palette_css, 'panel_html', panel_html)
       order by slug)::text as j
from film_ledger_panels;

-- ============================================================ 6/13
-- data/photos.json   {slug: svg}
-- Only panels that carry a hand-authored front. Films without one fall back
-- to their vendored TMDB poster in emit_vault_data.py.
select json_object_agg(slug, photo_svg)::text as j
from film_ledger_panels where photo_svg is not null;

-- ============================================================ 7/13
-- data/links.json   [{to, from, note, weight, relation, directional}]
-- from/to are TITLE STRINGS, not slugs — emit_vault_data.py resolves them
-- against the ledger and the archive, and drops any that land on neither.
-- Some links deliberately point at queued films; those unresolved drops in
-- the emit summary are expected, not a fault.
select json_agg(json_build_object(
         'to', b.title, 'from', a.title, 'note', l.note,
         'weight', l.weight, 'relation', l.relation, 'directional', l.directional)
       order by l.weight desc nulls last, a.title)::text as j
from film_links l
join film_titles a on a.id = l.from_title_id
join film_titles b on b.id = l.to_title_id;

-- ============================================================ 8/13
-- data/lessons.json   {lessons: [{rule, weight}]}
-- The Mirror wall. Taste scope ONLY: the protocol/ritual/design/care rows in
-- film_lessons are how the movie-night ritual is run, not what he likes, and
-- they have no business on a wall about his taste.
select json_build_object('lessons', json_agg(
         json_build_object('rule', rule, 'weight', weight)
         order by weight desc nulls last))::text as j
from film_lessons where active and scope = 'taste';

-- ============================================================ 9/13
-- data/queue.json   {_source, queue: [{note, rank, year, title, reason}]}
select json_build_object(
  '_source', 'film_watchlist where status = ''queued'', joined to film_titles. Ordered by queue_rank, unranked last. Pulled via scripts/PULL.sql.',
  'queue', json_agg(json_build_object(
    'note', priority_note, 'rank', queue_rank, 'year', year,
    'title', title, 'reason', added_reason)
    order by queue_rank nulls last)
)::text as j
from (
  select w.priority_note, w.queue_rank, t.year, t.title, w.added_reason
  from film_watchlist w join film_titles t on t.id = w.title_id
  where w.status = 'queued'
) x;

-- ============================================================ 10/13
-- data/archive.json   {_source, archive: [...]}
-- Seen but never scored the night of. memory_score present -> the Shoebox
-- (scored from memory, in pencil); seen with no score -> the Dark Drawer
-- (a frame that was never developed). The old seen_note prose parse is
-- retired; the split is these two columns and nothing else.
--
-- SHARP EDGE: archive slugs are NOT purely derived from the title. Ten of
-- them are hand-authored short forms and quotes/links resolve against them,
-- so deriving all 65 would silently rename ten prints and orphan whatever
-- points at them. The override list below IS the record of those ten; add a
-- row here rather than fixing a slug up by hand after the pull.
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
)
select json_build_object(
  '_source', 'film_titles where seen_before and no film_log row. memory_score/seen_bucket columns are the split. Pulled via scripts/PULL.sql.',
  'archive', json_agg(json_build_object(
    'slug', slug, 'title', title, 'year', year, 'seen_note', seen_note,
    'abandon_note', abandon_note, 'memory_score', memory_score,
    'seen_bucket', seen_bucket, 'poster', poster, 'genres', genres,
    'director', director, 'runtime', runtime)
    order by title)
)::text as j
from (
  select coalesce(o.slug,
           lower(regexp_replace(regexp_replace(t.title, '[^a-zA-Z0-9 ]', '', 'g'), '\s+', '-', 'g'))) as slug,
         t.title, t.year, t.seen_note, t.abandon_note,
         t.memory_score::float8 as memory_score, t.seen_bucket,
         t.poster_path as poster, t.genres, t.director,
         t.runtime_minutes as runtime
  from film_titles t
  left join slug_override o on o.title = t.title
  where t.seen_before
    and not exists (select 1 from film_log l where l.title_id = t.id)
) x;

-- ============================================================ 11/13
-- data/archive_extra.json   {titles: {Title: {snap, aff}}}
-- The one line an archive print gets to say, plus the pencil star it wears.
select json_build_object('titles', json_object_agg(title,
         json_build_object('snap', snap_line, 'aff', affinity)))::text as j
from film_titles
where (snap_line is not null or affinity is not null)
  and seen_before
  and not exists (select 1 from film_log l where l.title_id = film_titles.id);

-- ============================================================ 12/13
-- data/quotes.json   {_source, quotes: [{film, quote, said_by}]}
-- `film` is the TITLE string; emit_vault_data.py resolves it to a ledger or
-- archive slug, and a quote that resolves to neither hangs loose in the
-- drawer (Veep, Star Trek Beyond — television, never scored).
select json_build_object(
  '_source', 'film_quotes joined to film_titles. `film` is the TITLE string; emit_vault_data.py resolves it. Pulled via scripts/PULL.sql.',
  'quotes', json_agg(json_build_object('film', title, 'quote', quote, 'said_by', said_by)
                     order by title)
)::text as j
from (
  select t.title, q.quote, q.said_by
  from film_quotes q join film_titles t on t.id = q.title_id
) x;

-- ============================================================ 13/13
-- data/providers.json   {_source, mine: [...], titles: {Title: {flat, free, rent}}}
-- One honest line per queue slip: free beats a service he pays for beats one
-- he does not beats renting. `mine` is what he actually subscribes to.
select json_build_object(
  '_source', 'film_titles.watch_providers (TMDB, US) for film_watchlist status=''queued'', plus film_services where active. Pulled via scripts/PULL.sql.',
  'mine', (select coalesce(json_agg(provider_name order by provider_name), '[]'::json)
           from film_services where active),
  'titles', coalesce(json_object_agg(title, json_build_object(
              'flat', flat, 'free', free, 'rent', rent)), '{}'::json)
)::text as j
from (
  select t.title,
         coalesce((select json_agg(x->>'provider_name')
                   from jsonb_array_elements(t.watch_providers->'US'->'flatrate') x), '[]'::json) as flat,
         coalesce((select json_agg(x->>'provider_name')
                   from jsonb_array_elements(t.watch_providers->'US'->'free') x), '[]'::json) as free,
         (t.watch_providers->'US'->'rent') is not null as rent
  from film_watchlist w join film_titles t on t.id = w.title_id
  where w.status = 'queued'
) x;

-- ============================================================ AFTER
--   npm run data
-- Read the summary it prints. It drift-guards panel-without-ledger and
-- ledger-without-panel, which is how a whole film once stayed invisible on
-- the wall for a day. Then screenshot the ledger station and LOOK at it:
--   python scripts/peek.py --station "the ledger" --out wall
