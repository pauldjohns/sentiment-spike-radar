-- Schedule nightly evaluation and learning jobs

-- Remove existing schedules to avoid duplicates
SELECT cron.unschedule('daily-signal-evaluation');
SELECT cron.unschedule('log-signal-learning-data');

-- Nightly signal evaluation at 6:15 PM ET (22:15 UTC) Monday-Friday
SELECT cron.schedule(
  'nightly-signal-evaluation',
  '15 22 * * 1-5',
  $$
  SELECT
    net.http_post(
      url:=current_setting('app.settings.supabase_url', true) || '/functions/v1/evaluate-signal-success',
      headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
      body:='{"batch_mode": true, "limit": 500, "automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Nightly learning data logging after evaluation at 6:30 PM ET (22:30 UTC)
SELECT cron.schedule(
  'nightly-log-signal-learning-data',
  '30 22 * * 1-5',
  $$
  SELECT
    net.http_post(
      url:=current_setting('app.settings.supabase_url', true) || '/functions/v1/log-signal-learning-data',
      headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
      body:='{"batch_mode": true, "limit": 500, "cron_triggered": true}'::jsonb
    ) as request_id;
  $$
);
