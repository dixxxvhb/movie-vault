-- Movie Night v4, pass 2 follow-up: keep the registry enriched.
-- Weekly, Sundays 09:00 UTC (4am or 5am Orlando). The function skips rows fetched
-- inside 90 days, so most weeks this touches only new titles.
select cron.unschedule('film-enrich-weekly') where exists (select 1 from cron.job where jobname = 'film-enrich-weekly');
select cron.schedule(
  'film-enrich-weekly',
  '0 9 * * 0',
  $cron$
  select net.http_post(
    url := 'https://swjqlfcqvcrnydpyjyog.supabase.co/functions/v1/film-enrich',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select value from public.push_secrets where key = 'cron_secret')
    ),
    body := jsonb_build_object('action', 'enrich', 'limit', 500)
  );
  $cron$
);
