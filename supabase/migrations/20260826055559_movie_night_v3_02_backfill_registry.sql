-- Movie Night v3, step 2: move archive/hazy/certified/abandoned facts from the
-- taste profile jsonb onto film_titles; seed film_vetoes.

-- 2a. Bugonia duplicate merge (precedent: Baby Driver / The Prestige dup merges).
-- Repoint the single rec at the archive-noted row, delete the bare orphan.
update public.film_recommendations
   set title_id = 'e38a2e18-7568-4e0c-8977-502a61e6aa61'
 where title_id = 'ac0cd8f4-94c4-4d51-9dc5-e3def1bae4d0';
delete from public.film_titles where id = 'ac0cd8f4-94c4-4d51-9dc5-e3def1bae4d0';

-- 2b. Archive scored entries (profile vault_archive.scored + vault_model.archive_additions;
-- Parasite carries the corrected 9.6).
with m(title, score, bucket) as (values
 ('Saw',9.3,'?'),('Dune',9.7,'R'),('Tenet',9.6,'F'),('Zodiac',9.7,'F'),('Arrival',10.0,'R'),
 ('Bugonia',9.5,'R'),('Chicago',9.6,'?'),('Contact',10.0,'R'),('Get Out',9.6,'?'),('Step Up',8.4,'?'),
 ('Titanic',9.8,'?'),('Conclave',9.6,'R'),('Parasite',9.6,'F'),('Gone Girl',9.6,'?'),('Inception',9.7,'F'),
 ('Deep Impact',10.0,'R'),('Oppenheimer',10.0,'?'),('Snowpiercer',9.4,'F'),('Center Stage',9.2,'?'),
 ('Interstellar',10.0,'?'),('The Prestige',9.1,'F'),('Don''t Look Up',9.6,'R'),('The Substance',9.7,'R'),
 ('Dune: Part Two',9.9,'R'),('The Truman Show',9.8,'?'),('The Bourne trilogy',9.3,'?'),
 ('The Lord of the Rings (trilogy)',9.8,'?'),('The Silence of the Lambs',9.6,'?'),
 ('Kingsman: The Secret Service',9.6,'F'),('Flowers in the Attic',4.3,'?'),
 ('Mission: Impossible',9.5,'?'),('Everything Everywhere All at Once',9.4,'F'),
 ('Planet of the Apes (the modern trilogy)',8.9,'R'),('Whiplash',8.7,'?')
)
update public.film_titles t
   set memory_score = m.score,
       seen_bucket = m.bucket,
       seen_before = true
  from m where lower(t.title) = lower(m.title);

-- 2c. Hazy entries: seen, no score, bucket from the era wording (else '?').
with h(title, bucket) as (values
 ('Prisoners','?'),('Shutter Island','L'),('Life of Pi','L'),('The Martian','?'),
 ('James Bond (the franchise)','?'),('Mad Max: Fury Road','?'),('Edge of Tomorrow','F'),
 ('Black Swan','L'),('Moulin Rouge!','L'),('La La Land','F'),('West Side Story','C'),
 ('Knives Out','F'),('Midsommar','F'),('Spider-Man: Into the Spider-Verse','F')
)
update public.film_titles t
   set seen_bucket = h.bucket,
       seen_before = true
  from h where lower(t.title) = lower(h.title);

-- 2d. Generic sweep: parse 'memory N.N' out of seen_note where the column is
-- still null. Parenthesized asides are stripped first (the Armageddon trap:
-- its note cites another film's memory score inside parens).
update public.film_titles
   set memory_score = (regexp_match(regexp_replace(seen_note, '\([^)]*\)', '', 'g'), 'memory (\d{1,2}\.\d)'))[1]::numeric
 where memory_score is null
   and seen_note is not null
   and regexp_replace(seen_note, '\([^)]*\)', '', 'g') ~ 'memory \d';

-- 2e. Certifications onto the title rows.
update public.film_titles
   set certified_on = '2026-07-27', certified_score = 9.3,
       certified_line = 'fresh full watch, certified same night'
 where id = '7758830a-9d29-4a03-ba47-3e0f9dcba81c'
   and title = 'Amadeus';
update public.film_titles
   set certified_on = '2026-08-10', certified_score = 9.1,
       certified_line = 'fresh full watch, certified same night per the Aug 10 session'
 where id = 'd67abded-2c9c-4b0f-8fc8-3a616cd08a0f'
   and title = 'Predestination';

-- 2f. Cosmos: abandonment becomes first-class; note moves off seen_note.
update public.film_titles
   set abandoned_on = '2026-08-19',
       abandon_note = seen_note,
       seen_note = null
 where id = '072a73b8-1cca-4202-8ea7-d1b60c9eaede' and title = 'Cosmos';

-- 2g. Prisoners: standing veto.
insert into public.film_vetoes (id, title_id, reason)
values (gen_random_uuid(), 'e1fcff1d-1a66-45c9-be28-9fbcc1bd4f66', 'only Dixon raises it');
