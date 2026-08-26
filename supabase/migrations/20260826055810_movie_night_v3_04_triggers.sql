-- Movie Night v3, step 4: the loop closes itself.

-- 4a. film_log insert: seen flag + note, close recs (id + trigram), record
-- paired measurement on an archive rewatch. Watchlist flip stays in its own
-- existing trigger (film_log_flips_watchlist).
create or replace function public.film_log_resolves_recommendations()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  t_title text;
  t_memory numeric(3,1);
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

  update public.film_recommendations
     set status = 'accepted'
   where status = 'suggested'
     and (title_id = new.title_id
          or (t_title is not null and extensions.similarity(
                trim(regexp_replace(regexp_replace(coalesce(suggested_title,''), '\s*[—-]+\s*rewatch\s*$', '', 'i'), '\s*\((19|20)\d\d\)\s*$', '')),
                t_title) > 0.5));

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
$$;

-- 4b. film_recommendations insert: a null title_id resolves itself or mints a
-- thin title row. The NOT NULL constraint runs after this fires.
create or replace function public.film_recs_resolve_title()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  clean text;
  yr int;
  found uuid;
begin
  if new.title_id is not null then return new; end if;
  clean := trim(regexp_replace(regexp_replace(coalesce(new.suggested_title,''), '\s*[—-]+\s*rewatch\s*$', '', 'i'), '\s*\((19|20)\d\d\)\s*$', ''));
  yr := (regexp_match(coalesce(new.suggested_title,''), '\(((19|20)\d\d)\)'))[1]::int;
  if clean = '' then
    raise exception 'film_recommendations needs a title_id or a suggested_title';
  end if;
  select t.id into found from public.film_titles t
   where extensions.similarity(t.title, clean) > 0.35
     and (yr is null or t.year is null or abs(t.year - yr) <= 1)
   order by extensions.similarity(t.title, clean) desc, t.year desc nulls last
   limit 1;
  if found is null then
    found := gen_random_uuid();
    insert into public.film_titles (id, title, year, media_type, seen_before)
    values (found, clean, yr, 'movie', false);
  end if;
  new.title_id := found;
  return new;
end;
$$;

drop trigger if exists film_recs_resolve_title on public.film_recommendations;
create trigger film_recs_resolve_title
  before insert on public.film_recommendations
  for each row execute function public.film_recs_resolve_title();

-- 4c. Certification fields travel together.
alter table public.film_titles
  add constraint film_titles_certified_together
  check (
    (certified_on is null and certified_score is null and certified_line is null)
    or (certified_on is not null and certified_score is not null and certified_line is not null)
  );
