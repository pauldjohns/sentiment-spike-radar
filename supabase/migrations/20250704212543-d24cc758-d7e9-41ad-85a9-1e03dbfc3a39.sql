-- Remove all existing frequent enrichment cron jobs
SELECT cron.unschedule('stocktwits-data-and-storage-fixed');
SELECT cron.unschedule('morning-signal-detection');
SELECT cron.unschedule('storage-management-fixed');
SELECT cron.unschedule('market-hours-health-check');
SELECT cron.unschedule('retry-failed-enrichments-market-hours');

-- Create single daily post-market enrichment job
-- Schedule: 30 21 * * 1-5 (5:30 PM EDT / 4:30 PM EST) - runs after market close
SELECT cron.schedule(
  'daily-post-market-enrichment',
  '30 21 * * 1-5', -- 5:30 PM EDT Monday-Friday (after 4:00 PM market close)
  $$
  SELECT
    net.http_post(
        url:=current_setting('app.settings.supabase_url', true) || '/functions/v1/ingest-sentiment-data',
        headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
        body:='{"cron_triggered": true, "automated": true, "daily_post_market": true}'::jsonb
    ) as request_id;
  $$
);

-- Create daily batch enrichment job for price metadata
-- Runs 15 minutes after sentiment detection to allow for signal generation
SELECT cron.schedule(
  'daily-price-enrichment-batch',
  '45 21 * * 1-5', -- 5:45 PM EDT Monday-Friday (15 minutes after signal detection)
  $$
  SELECT
    net.http_post(
        url:=current_setting('app.settings.supabase_url', true) || '/functions/v1/retry-failed-enrichments',
        headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
        body:='{"automated": true, "daily_batch": true, "max_signals": 50}'::jsonb
    ) as request_id;
  $$
);

-- Create daily signal evaluation job
-- Runs after price enrichment to evaluate success
SELECT cron.schedule(
  'daily-signal-evaluation',
  '15 22 * * 1-5', -- 6:15 PM EDT Monday-Friday (after price enrichment)
  $$
  SELECT
    net.http_post(
        url:=current_setting('app.settings.supabase_url', true) || '/functions/v1/evaluate-signal-success',
        headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
        body:='{"batch_mode": true, "limit": 100, "automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Keep minimal health check - weekly instead of frequent
SELECT cron.schedule(
  'weekly-pipeline-health-check',
  '0 22 * * 1', -- 6:00 PM EDT on Mondays only
  $$
  SELECT
    net.http_post(
        url:=current_setting('app.settings.supabase_url', true) || '/functions/v1/test-pipeline-health',
        headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
        body:='{"automated": true, "health_monitoring": true, "weekly_check": true}'::jsonb
    ) as request_id;
  $$
);