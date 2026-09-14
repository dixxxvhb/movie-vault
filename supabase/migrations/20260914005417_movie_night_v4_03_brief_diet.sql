-- Movie Night v4, step 3: the brief goes on a diet and the retro grows teeth.
-- The brief was 27,523 chars. Target is under 8,000 on current data.
-- What left: the full open rec backlog, the weight 3 and 4 lessons, the full
-- debt and mailbox lists (both have their own one-line query in
-- references/session-open.sql, and the brief now carries their counts).

create or replace function public.film_session_brief()
returns jsonb
language plpgsql
volatile
security invoker
set search_path to 'public'
as $fn$
declare
  law_n int;
  res jsonb;
begin
  -- Idempotent. A rec older than 21 days stops being an open pitch.
  perform public.film_expire_recs();

  select count(*) into law_n from public.film_lessons where active and weight = 5;

  select jsonb_build_object(
    'now', to_char(now() at time zone 'America/New_York', 'Dy YYYY-MM-DD HH24:MI'),
    'tonight', (
      select to_jsonb(s) from (
        select session_date, energy, key_wanted, runtime_budget, company, mode, note
        from public.film_sessions
        where session_date = (now() at time zone 'America/New_York')::date
        order by created_at desc limit 1) s),
    'recent_sessions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', x.session_date, 'energy', x.energy, 'key_wanted', x.key_wanted)
        order by x.session_date desc), '[]'::jsonb)
      from (
        select distinct on (session_date) session_date, energy, key_wanted
        from public.film_sessions
        order by session_date desc, created_at desc
        limit 7) x),
    'last_nights', (
      select coalesce(jsonb_agg(x order by x->>'watched_at' desc), '[]'::jsonb) from (
        select jsonb_build_object(
          'watched_at', l.watched_at, 'title', t.title, 'score', l.rating,
          'emotional_key', l.emotional_key) as x
        from public.film_log l join public.film_titles t on t.id = l.title_id
        where l.watched_at in (select distinct watched_at from public.film_log order by watched_at desc limit 7)
      ) q),
    'queue', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'title', q.title, 'status', q.state, 'runtime_minutes', q.runtime_minutes,
        'providers', to_jsonb(q.providers)) order by q.queue_rank nulls last, q.title), '[]'::jsonb)
      from (
        select s.title, s.state, s.runtime_minutes, s.providers, w.queue_rank
        from public.film_status s
        left join lateral (
          select queue_rank from public.film_watchlist w
          where w.title_id = s.title_id order by created_at desc limit 1) w on true
        where s.state in ('queued', 'watching')
        order by w.queue_rank nulls last, s.title
        limit 8) q),
    'open_recs', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'title', coalesce(t.title, r.suggested_title),
        'age_days', (current_date - r.created_at::date),
        'predicted', r.predicted_score) order by r.created_at), '[]'::jsonb)
      from public.film_recommendations r
      left join public.film_titles t on t.id = r.title_id
      where r.status = 'suggested' and r.created_at >= now() - interval '14 days'),
    'services', (
      select coalesce(jsonb_agg(provider_name order by provider_name), '[]'::jsonb)
      from public.film_services where active),
    'lessons_digest', jsonb_build_object(
      -- Verbatim once the law count is down to the cap of 10. Above that the
      -- digest carries first sentences, because 31 laws verbatim is 7,600 chars
      -- and the whole point of this pass is a brief that fits.
      'law', (select coalesce(jsonb_agg(
                case when law_n <= 10 then rule
                     else rtrim(split_part(rule, '. ', 1), '.') || '.' end
                order by learned_on), '[]'::jsonb)
              from public.film_lessons where active and weight = 5),
      'law_count', law_n,
      'law_verbatim', law_n <= 10,
      'taste_summary', (
        select coalesce(jsonb_agg(line), '[]'::jsonb) from (
          (select dim || ': ' || key || ' ' || avg_score || ' (n=' || n || ')' as line
             from public.film_taste_signals where n >= 3
             order by avg_score desc, n desc limit 3)
          union all
          (select dim || ': ' || key || ' ' || avg_score || ' (n=' || n || ')'
             from public.film_taste_signals where n >= 3
             order by avg_score asc, n desc limit 3)
        ) s)),
    'calibration_line', (
      select case when c.n = 0 then 'calibration: no predictions recorded yet'
                  else 'calibration: n=' || c.n
                       || ', mean signed ' || coalesce(c.mean_signed_error::text, 'na')
                       || ', mean abs ' || coalesce(c.mean_abs_error::text, 'na') end
      from public.film_calibration c),
    'certify_shelf', (
      case when (select count(*) from public.film_sessions
                  where session_date > current_date - 7) = 0
        then (select coalesce(jsonb_agg(jsonb_build_object(
                'title', title, 'year', year, 'memory_score', memory_score)), '[]'::jsonb)
              from public.film_certify_shelf)
        else '[]'::jsonb end),
    'saturation', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'title', t.title, 'score', l.rating,
        'top_tag', (l.vibe_tags)[1],
        'closes_on', l.watched_at + 7)), '[]'::jsonb)
      from public.film_log l join public.film_titles t on t.id = l.title_id
      where l.rating >= 9.5 and l.watched_at > current_date - 7),
    'last_note', (
      select jsonb_build_object('note_date', note_date, 'note', left(note, 300))
      from public.film_session_notes order by note_date desc, created_at desc limit 1),
    'gems', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'note_date', g.note_date, 'note', left(g.note, 200)) order by g.note_date desc), '[]'::jsonb)
      from (select note_date, note from public.film_session_notes
            order by note_date desc, created_at desc limit 3) g),
    'debt_n', (select count(*) from public.film_night_debt),
    'mailbox_n', (select count(*) from public.film_mailbox where read_at is null),
    'emotional_keys', (
      select coalesce(content->'emotional_keys', '[]'::jsonb)
      from public.film_taste_profile order by updated_at desc limit 1)
  ) into res;

  return res;
end;
$fn$;

grant execute on function public.film_session_brief() to authenticated, service_role;

-- film_retro gains the calibration report, the certify shelf and the law audit.
create or replace function public.film_retro()
returns jsonb
language sql stable security invoker
set search_path to 'public'
as $fn$
select jsonb_build_object(
  'log_titles', (select count(distinct title_id) from public.film_log),
  'panel_rows', (select count(*) from public.film_ledger_panels),
  'log_without_panel', (
    select coalesce(jsonb_agg(distinct t.title), '[]'::jsonb)
    from public.film_log l join public.film_titles t on t.id = l.title_id
    where not exists (select 1 from public.film_ledger_panels p where p.title_id = l.title_id)),
  'open_recs_now', (select count(*) from public.film_recommendations where status = 'suggested'),
  'expired_recs', (select count(*) from public.film_recommendations where status = 'expired'),
  'stale_open_recs', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', coalesce(t.title, r.suggested_title),
      'age_days', current_date - r.created_at::date) order by r.created_at), '[]'::jsonb)
    from public.film_recommendations r
    left join public.film_titles t on t.id = r.title_id
    where r.status = 'suggested' and r.created_at < now() - interval '21 days'),
  'titles_missing_tmdb', (select count(*) from public.film_titles where tmdb_id is null),
  'titles_missing_providers', (select count(*) from public.film_titles where watch_providers is null),
  'law_audit', jsonb_build_object(
    'active_weight5', (select count(*) from public.film_lessons where active and weight = 5),
    'cap', 10,
    'over_cap_by', greatest((select count(*) from public.film_lessons where active and weight = 5) - 10, 0),
    'weight4_standing', (select count(*) from public.film_lessons where active and weight = 4),
    'weight5_without_evidence', (
      select coalesce(jsonb_agg(left(rule, 100)), '[]'::jsonb)
      from public.film_lessons where active and weight = 5 and (evidence is null or evidence = ''))),
  'calibration', (select to_jsonb(c) from public.film_calibration c),
  'certify_shelf', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', title, 'year', year, 'memory_score', memory_score)), '[]'::jsonb)
    from public.film_certify_shelf),
  'profile_drift_keys', (
    select coalesce(jsonb_agg(k), '[]'::jsonb)
    from (select jsonb_object_keys(content) as k
          from public.film_taste_profile order by updated_at desc limit 1) keys
    where k like 'vault_counts%' or k = 'current_mood'),
  'mailbox_unread', (select count(*) from public.film_mailbox where read_at is null)
);
$fn$;

grant execute on function public.film_retro() to authenticated, service_role;
