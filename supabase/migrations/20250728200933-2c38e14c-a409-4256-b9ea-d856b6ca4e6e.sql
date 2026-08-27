-- Create cron jobs for learning and pattern analysis functions

-- Schedule learning data logging every 30 minutes
SELECT cron.schedule(
  'log-signal-learning-data',
  '*/30 * * * *',
  $$
  SELECT
    net.http_post(
        url:=current_setting('app.settings.supabase_url', true) || '/functions/v1/log-signal-learning-data',
        headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
        body:='{"batch_mode": true, "limit": 100}'::jsonb
    ) as request_id;
  $$
);

-- Schedule pattern analysis every hour
SELECT cron.schedule(
  'analyze-signal-patterns',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
        url:=current_setting('app.settings.supabase_url', true) || '/functions/v1/analyze-signal-patterns',
        headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
        body:='{"force_refresh": true}'::jsonb
    ) as request_id;
  $$
);