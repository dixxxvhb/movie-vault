-- Movie Night v4, pass 2, part 1.
-- The law cap of 10 stops being documentation and starts being a constraint,
-- and film_titles gains the four registry columns TMDB enrichment fills.

alter table public.film_titles
  add column if not exists original_language text,
  add column if not exists origin_country text[],
  add column if not exists keywords text[],
  add column if not exists tmdb_fetched_at timestamptz;

create or replace function public.film_law_cap()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  others int;
begin
  if new.weight = 5 and new.active then
    select count(*) into others
    from public.film_lessons
    where active and weight = 5 and id is distinct from new.id;
    if others >= 10 then
      raise exception 'law cap 10: supersede or demote a weight-5 first';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists film_lessons_law_cap on public.film_lessons;
create trigger film_lessons_law_cap
  before insert or update on public.film_lessons
  for each row execute function public.film_law_cap();
