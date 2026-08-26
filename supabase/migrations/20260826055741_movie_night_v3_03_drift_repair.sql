-- Movie Night v3, step 3: repair seen-flag drift, resolve orphan recs, close
-- recs answered by the wall, then lock title_id NOT NULL.

-- 3a. Every logged title is seen. Fill a plain seen_note where empty.
update public.film_titles t
   set seen_before = true
 where exists (select 1 from public.film_log l where l.title_id = t.id)
   and not t.seen_before;

with latest as (
  select distinct on (l.title_id) l.title_id, l.watched_at, l.rating
  from public.film_log l order by l.title_id, l.watched_at desc
)
update public.film_titles t
   set seen_note = 'Ledger film, watched ' || latest.watched_at || ', rated ' || latest.rating
  from latest
 where latest.title_id = t.id
   and (t.seen_note is null or t.seen_note = '');

-- 3b. Stardust is on the wall; retire its hazy note.
update public.film_titles t
   set seen_note = (
     select 'Ledger film, watched ' || l.watched_at || ', rated ' || l.rating
     from public.film_log l where l.title_id = t.id
     order by l.watched_at desc limit 1)
 where t.title = 'Stardust'
   and exists (select 1 from public.film_log l where l.title_id = t.id);

-- 3c. Resolve orphan recommendations by trigram (year within 1 when present).
create temporary table _rec_map on commit drop as
with orphans as (
  select id, suggested_title, status,
    trim(regexp_replace(regexp_replace(suggested_title, '\s*[—-]+\s*rewatch\s*$', '', 'i'), '\s*\((19|20)\d\d\)\s*$', '')) as clean,
    (regexp_match(suggested_title, '\(((19|20)\d\d)\)'))[1]::int as yr
  from public.film_recommendations where title_id is null
)
select o.id as rec_id, o.status, o.clean, o.yr,
  (select t.id from public.film_titles t
    where extensions.similarity(t.title, o.clean) > 0.35
      and (o.yr is null or t.year is null or abs(t.year - o.yr) <= 1)
    order by extensions.similarity(t.title, o.clean) desc, t.year desc nulls last limit 1) as match_id
from orphans o;

-- Thin title rows for the unmatched, then adopt them as matches.
insert into public.film_titles (id, title, year, media_type, seen_before)
select gen_random_uuid(), m.clean, m.yr, 'movie', false
from (select distinct clean, yr from _rec_map where match_id is null) m;

update _rec_map r set match_id = t.id
from public.film_titles t
where r.match_id is null and lower(t.title) = lower(r.clean)
  and (r.yr is null or t.year is distinct from null and t.year = r.yr or t.year is null);

-- Closed-status orphans: just attach the title.
update public.film_recommendations rec
   set title_id = r.match_id
  from _rec_map r
 where rec.id = r.rec_id and rec.status <> 'suggested' and r.match_id is not null;

-- Open orphans whose title is on the wall: attach and close in one move.
update public.film_recommendations rec
   set title_id = r.match_id, status = 'accepted'
  from _rec_map r
 where rec.id = r.rec_id and rec.status = 'suggested' and r.match_id is not null
   and exists (select 1 from public.film_log l where l.title_id = r.match_id);

-- Open orphans colliding with an existing open rec for the same title:
-- collapse the duplicate pitch (6 rows, verified by SELECT beforehand).
update public.film_recommendations rec
   set title_id = r.match_id, status = 'dismissed'
  from _rec_map r
 where rec.id = r.rec_id and rec.status = 'suggested' and r.match_id is not null
   and exists (select 1 from public.film_recommendations o
               where o.title_id = r.match_id and o.status = 'suggested' and o.id <> rec.id);

-- Remaining open orphans: attach the title, stay open.
update public.film_recommendations rec
   set title_id = r.match_id
  from _rec_map r
 where rec.id = r.rec_id and rec.title_id is null and r.match_id is not null;

-- 3d. Any open rec (orphan or not) whose title is on the wall closes.
update public.film_recommendations rec
   set status = 'accepted'
 where rec.status = 'suggested'
   and exists (select 1 from public.film_log l where l.title_id = rec.title_id);

-- 3e. The hole can never reopen.
alter table public.film_recommendations alter column title_id set not null;
