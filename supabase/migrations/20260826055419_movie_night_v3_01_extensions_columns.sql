-- Movie Night v3, step 1: pg_trgm, registry columns, film_vetoes, trigram indexes.

create extension if not exists pg_trgm with schema extensions;

alter table public.film_titles
  add column if not exists memory_score numeric(3,1),
  add column if not exists seen_bucket text check (seen_bucket in ('R','F','L','C','?')),
  add column if not exists abandoned_on date,
  add column if not exists abandon_note text,
  add column if not exists certified_on date,
  add column if not exists certified_score numeric(3,1),
  add column if not exists certified_line text;

alter table public.film_log
  add column if not exists emotional_key text;

create table if not exists public.film_vetoes (
  id uuid primary key,
  title_id uuid references public.film_titles(id) unique,
  reason text,
  created_at timestamptz default now()
);

alter table public.film_vetoes enable row level security;

create policy dixon_only on public.film_vetoes
  for all to authenticated
  using (public.is_dixon())
  with check (public.is_dixon());

grant select, insert, update, delete on public.film_vetoes to authenticated;

create index if not exists film_titles_title_trgm
  on public.film_titles using gin (title extensions.gin_trgm_ops);

create index if not exists film_recommendations_suggested_title_trgm
  on public.film_recommendations using gin (suggested_title extensions.gin_trgm_ops);
