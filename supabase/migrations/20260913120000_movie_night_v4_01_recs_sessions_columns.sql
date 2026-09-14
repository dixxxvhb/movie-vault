-- Movie Night v4, step 1: recs expire, predictions get recorded, sessions get a row.
-- Additive only. The one constraint change allowed is the status check on
-- film_recommendations, which gains 'expired'.

-- 1a. The status set gains 'expired'.
alter table public.film_recommendations
  drop constraint if exists film_recommendations_status_check;

alter table public.film_recommendations
  add constraint film_recommendations_status_check
  check (status = any (array['suggested', 'accepted', 'dismissed', 'expired']));

-- 1b. The prediction loop. Recorded, never applied (rule 6).
alter table public.film_recommendations
  add column if not exists predicted_score numeric(3,1),
  add column if not exists predicted_on date;

-- 1c. Backfill: a suggested row older than 21 days is expired, not open.
update public.film_recommendations
   set status = 'expired'
 where status = 'suggested'
   and created_at < now() - interval '21 days';

-- 1d. film_sessions: the night's shape, written at session open.
create table if not exists public.film_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_date date not null,
  energy text check (energy in ('flat', 'ok', 'up')),
  key_wanted text,
  runtime_budget int,
  company text,
  mode text check (mode in ('pick', 'slate')),
  note text
);

create index if not exists film_sessions_date_idx
  on public.film_sessions (session_date desc);

alter table public.film_sessions enable row level security;

drop policy if exists dixon_only on public.film_sessions;
create policy dixon_only on public.film_sessions
  for all to authenticated
  using (public.is_dixon())
  with check (public.is_dixon());

grant select, insert, update, delete on public.film_sessions to authenticated;
grant select on public.film_sessions to service_role;

-- 1e. film_key_tags: emotional key to vibe or genre tag. Created empty, Chat seeds it.
create table if not exists public.film_key_tags (
  key text not null,
  tag text not null,
  primary key (key, tag)
);

alter table public.film_key_tags enable row level security;

drop policy if exists dixon_only on public.film_key_tags;
create policy dixon_only on public.film_key_tags
  for all to authenticated
  using (public.is_dixon())
  with check (public.is_dixon());

grant select, insert, update, delete on public.film_key_tags to authenticated;
grant select on public.film_key_tags to service_role;

-- 1f. The open rec cap. A rec graveyard is what this whole pass is about.
create or replace function public.film_recs_cap_open()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $fn$
begin
  if new.status = 'suggested'
     and (select count(*) from public.film_recommendations where status = 'suggested') >= 15 then
    raise exception 'open rec cap 15, dismiss or expire first';
  end if;
  return new;
end;
$fn$;

drop trigger if exists film_recs_cap_open on public.film_recommendations;
create trigger film_recs_cap_open
  before insert on public.film_recommendations
  for each row execute function public.film_recs_cap_open();

-- 1g. The accept trigger also records the prediction against the live score.
-- Same pattern as paired_measurements: appended, reported, never applied.
create or replace function public.film_log_resolves_recommendations()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $fn$
declare
  t_title text;
  t_memory numeric(3,1);
  pred numeric(3,1);
begin
  select title, memory_score into t_title, t_memory
  from public.film_titles where id = new.title_id;

  update public.film_titles
     set seen_before = true,
         seen_note = case
           when seen_note is null or seen_note = ''
           then 'Ledger film, watched ' || new.watched_at || ', rated ' || coalesce(new.rating::text, 'unrated')
           else seen_note end
   where id = new.title_id;

  -- Grab the prediction before the rows flip to accepted.
  select r.predicted_score into pred
    from public.film_recommendations r
   where r.status = 'suggested'
     and r.predicted_score is not null
     and (r.title_id = new.title_id
          or (t_title is not null and extensions.similarity(
                trim(regexp_replace(regexp_replace(coalesce(r.suggested_title,''), '\s*[—-]+\s*rewatch\s*$', '', 'i'), '\s*\((19|20)\d\d\)\s*$', '')),
                t_title) > 0.5))
   order by r.created_at desc
   limit 1;

  update public.film_recommendations
     set status = 'accepted'
   where status = 'suggested'
     and (title_id = new.title_id
          or (t_title is not null and extensions.similarity(
                trim(regexp_replace(regexp_replace(coalesce(suggested_title,''), '\s*[—-]+\s*rewatch\s*$', '', 'i'), '\s*\((19|20)\d\d\)\s*$', '')),
                t_title) > 0.5));

  if pred is not null and new.rating is not null then
    update public.film_taste_profile p
       set content = coalesce(p.content, '{}'::jsonb)
             || jsonb_build_object('calibration',
                  coalesce(p.content -> 'calibration', '{}'::jsonb)
                  || jsonb_build_object('predictions',
                       coalesce(p.content #> '{calibration,predictions}', '[]'::jsonb)
                       || jsonb_build_array(jsonb_build_object(
                            'title', t_title,
                            'predicted', pred,
                            'live', new.rating,
                            'date', new.watched_at)))),
           updated_at = now()
     where p.id = (select id from public.film_taste_profile order by updated_at desc limit 1);
  end if;

  if new.is_rewatch and t_memory is not null then
    update public.film_taste_profile p
       set content = jsonb_set(
             p.content,
             '{vault_model,paired_measurements}',
             coalesce(p.content #> '{vault_model,paired_measurements}', '[]'::jsonb)
               || jsonb_build_object(
                    'title', t_title,
                    'memory_score', t_memory,
                    'live_score', new.rating,
                    'watched_at', new.watched_at)),
           updated_at = now()
     where p.id = (select id from public.film_taste_profile order by updated_at desc limit 1);
  end if;

  return new;
end;
$fn$;

-- 1h. Search indexes for film_recall. pg_trgm on film_titles.title already exists.
create extension if not exists pg_trgm with schema extensions;

create index if not exists film_log_recall_fts on public.film_log
  using gin (to_tsvector('english', coalesce(hot_take, '') || ' ' || coalesce(long_form, '')));

create index if not exists film_session_notes_recall_fts on public.film_session_notes
  using gin (to_tsvector('english', coalesce(note, '')));

create index if not exists film_lessons_recall_fts on public.film_lessons
  using gin (to_tsvector('english', coalesce(rule, '') || ' ' || coalesce(evidence, '')));
