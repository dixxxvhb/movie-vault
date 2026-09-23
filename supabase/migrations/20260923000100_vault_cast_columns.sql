-- Le Gamaar plan §12c: the cast, kept. film-tmdb has always fetched credits and
-- thrown the cast away; film-enrich now keeps the top 30 by billing order.
-- Additive only. Shape: [{id, name, character, order, profile_path}].
alter table public.film_titles
  add column if not exists cast_top jsonb,
  add column if not exists cast_fetched_at timestamptz;

comment on column public.film_titles.cast_top is
  'TMDB top-billed cast, [{id, name, character, order, profile_path}], top 30 by order. Written by film-enrich.';
