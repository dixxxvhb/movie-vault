-- Movie Night v3, step 8: nightly watch_providers refresh for queued and
-- open-rec titles (same cron_secret pattern as reminder-push/dispatch).
-- 08:30 UTC = 4:30am ET, when nothing else is running.
select cron.schedule(
  'film-providers-refresh',
  '30 8 * * *',
  $cron$
  select net.http_post(
    url := 'https://swjqlfcqvcrnydpyjyog.supabase.co/functions/v1/film-tmdb',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select value from public.push_secrets where key = 'cron_secret')
    ),
    body := jsonb_build_object('action', 'refresh_active_providers')
  );
  $cron$
);
