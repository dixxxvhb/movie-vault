-- Movie Night v3, step 7: lessons hygiene + emotional_key backfill.

-- Supersede the three seen-check escalations with one film_check rule.
update public.film_lessons set active = false
where id in ('4f296052-b190-4daa-9f06-25ba959e5e78',
             '11bd0a69-7b92-45d7-a936-6e74f091f4f3',
             '42ec8ba7-1364-46b2-b00a-3102a4c12c2c');

insert into public.film_lessons (id, learned_on, scope, rule, evidence, weight, active)
values (gen_random_uuid(), '2026-08-26', 'protocol',
 'No title is pitched without its film_check verdict quoted on the card. FRESH is the only state that pitches as a first watch; HAZY and ARCHIVE pitch only as disclosed rewatches; everything else does not pitch. Every pitch still persists its film_recommendations row in the same message (the trigger resolves the title).',
 'Merges the 2026-08-03, 2026-08-14 and 2026-08-25 seen-check rows (The Game re-pitch, the Suspiria triple pitch, The Nice Guys and The Matrix re-pitches). The four-query check is now one deterministic call.',
 5, true);

-- Dead-pipeline rows retire.
update public.film_lessons
   set active = false,
       evidence = coalesce(evidence || ' ', '') || 'Superseded by film_status precedence and the v3 pipeline doc.'
where id in ('ab909bfc-57c4-428f-9651-26f66dbe28a9',
             '0b785ff6-daef-48c7-9558-7aa4dd23e54c');

-- The desktop Vault artifact is retired.
update public.film_lessons
   set active = false,
       evidence = coalesce(evidence || ' ', '') || 'The desktop artifact was retired 2026-08-12; the Vault is the GitHub Pages app and publishing is the pipeline doc''s job.'
where id = '240f0fac-be88-41ab-a1ed-ba3ccf819bbf';

-- The v3 principle, on the record.
insert into public.film_lessons (id, learned_on, scope, rule, evidence, weight, active)
values (gen_random_uuid(), '2026-08-26', 'protocol',
 'Rules for the model, constraints for the database: a weight-5 protocol rule broken twice becomes a trigger, view or function, not a louder rule.',
 '32 stale seen flags, 42 orphan recs, three seen-check escalations.',
 5, true);

-- Emotional keys for all 44 nights (Leonard draft for Dixon to edit).
with k(log_id, key) as (values
 ('dd4af24a-11f5-4af6-895e-ee19f59e6baa'::uuid,'sad'),
 ('16036036-cda4-44af-9205-291c06ec734c'::uuid,'tense'),
 ('774793a5-dc0d-4690-993b-0182ac15634d'::uuid,'tense'),
 ('f8f5dbc8-3904-4cb5-b814-cadf0e2e2cc8'::uuid,'tense'),
 ('2d0e5e10-1688-49c8-8600-dba255d3d3e4'::uuid,'tense'),
 ('e8e070a7-5e4b-4de9-82a3-31c7fb27d6af'::uuid,'awe'),
 ('3ccc6e8f-f390-4633-bb50-1ddee2b5c636'::uuid,'dread'),
 ('f7e9035a-86c4-4969-bced-efcaf228fad4'::uuid,'fun'),
 ('02700d60-8edd-4ae7-b859-4fd6ea8ae81c'::uuid,'fun'),
 ('97b06c50-65b3-4d14-bcb5-a93b8e2b6c35'::uuid,'camp'),
 ('a8aa3e5f-1ebe-40f5-862c-a73fd58cb4ec'::uuid,'dread'),
 ('cd010ebf-3eff-4346-a78e-fcf1263a765c'::uuid,'dread'),
 ('023ca113-7afe-49bb-bdc1-55a621c5fbdc'::uuid,'camp'),
 ('34464e82-93b5-4045-a871-ff05d6e5a04f'::uuid,'awe'),
 ('97efd77a-f77c-44de-a8ec-5bdda90f0b49'::uuid,'awe'),
 ('6b2eb4ad-521b-4cd0-95c4-b75e1ce8fcab'::uuid,'fun'),
 ('2f9f807a-d900-459c-889c-d3ad0f1eac44'::uuid,'fun'),
 ('7a806948-37ef-4745-b5b0-545ad5f2d4d3'::uuid,'awe'),
 ('9e3540c5-fe90-4d78-80f8-2b19ee52beb0'::uuid,'camp'),
 ('6b9c8bf9-1042-4849-8f9a-c17b02e01772'::uuid,'sad'),
 ('44c136a9-882d-498b-bddf-a59621756a35'::uuid,'fun'),
 ('da463db4-7b22-4dc6-a364-4b887944c4b5'::uuid,'dread'),
 ('04d2ed6e-c455-4c94-be46-62d1c4808c00'::uuid,'dread'),
 ('be794137-d67d-44cd-a66e-c9dc6fca9384'::uuid,'camp'),
 ('fd482273-b042-436d-a859-1265a7759842'::uuid,'fun'),
 ('afb9c3e0-4912-43ce-8396-13fbeddbdab0'::uuid,'cozy'),
 ('df5fe5d5-758f-4231-98e1-a9883eb9fbaf'::uuid,'cozy'),
 ('5dcb9d26-e708-4c84-a0cc-8a18e870c978'::uuid,'dread'),
 ('3fb5d071-325e-49ad-9b0b-a23d9dd9708e'::uuid,'awe'),
 ('566e473b-f8b5-47f9-ac9f-435bd243003c'::uuid,'tense'),
 ('cbd816d4-804a-492f-af85-273e99b7a943'::uuid,'sad'),
 ('ecbd1a82-2b0e-4a2c-b596-ac7ca368e411'::uuid,'awe'),
 ('9349f646-6581-4c46-ad90-d5fd84c74843'::uuid,'fun'),
 ('c9c093b7-3741-4c78-b33a-11a58fe7aebd'::uuid,'tense'),
 ('06fa72b3-4c05-4a88-b1e8-ca5f5a31bc83'::uuid,'tense'),
 ('94e57686-9e88-45ce-88e8-5646cf5f7fa0'::uuid,'dread'),
 ('689d7900-6460-41c2-b0c4-f25928dfde42'::uuid,'fun'),
 ('d1747272-1477-4a6b-a8b6-0df48fa4730a'::uuid,'fun'),
 ('b0f44cbe-b971-40f9-b935-28892d13dd6a'::uuid,'fun'),
 ('f05697c4-baa1-4b27-b229-d773dd648da0'::uuid,'tense'),
 ('af47bd99-c88a-4362-af71-80c8ae0f483b'::uuid,'camp'),
 ('ad4a47ce-5fbc-40fe-8f39-e664236586ce'::uuid,'tense'),
 ('402422d4-6b89-4cfe-8ecc-86e98fa3161b'::uuid,'dread'),
 ('10fd87f8-7ea7-4567-afb5-8e5f6d18e298'::uuid,'fun')
)
update public.film_log l
   set emotional_key = k.key
  from k where l.id = k.log_id and l.emotional_key is null;
