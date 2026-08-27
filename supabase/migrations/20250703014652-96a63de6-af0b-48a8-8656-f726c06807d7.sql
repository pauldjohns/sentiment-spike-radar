-- Fix cron schedules to properly cover Eastern Time market hours
-- and ensure consistent authorization parameters

-- First, unschedule existing problematic jobs
SELECT cron.unschedule('stocktwits-data-and-storage');
SELECT cron.unschedule('storage-management');

-- Create corrected main data ingestion job
-- Schedule: */5 13-20 * * 1-5 covers 9:00 AM - 4:00 PM ET (both DST and EST)
SELECT cron.schedule(
  'stocktwits-data-and-storage-fixed',
  '*/5 13-20 * * 1-5', -- Every 5 minutes from 1 PM to 8 PM UTC (covers 9 AM - 4 PM ET)
  $$
  SELECT
    net.http_post(
        url:=current_setting('app.settings.supabase_url', true) || '/functions/v1/ingest-sentiment-data',
        headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
        body:='{"cron_triggered": true, "automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Create intensive morning signal detection job for critical 9:30-11:00 AM ET window
-- Schedule: */3 13-15 * * 1-5 covers 9:00 AM - 11:00 AM ET with higher frequency
SELECT cron.schedule(
  'morning-signal-detection',
  '*/3 13-15 * * 1-5', -- Every 3 minutes from 1 PM to 3 PM UTC (covers 9 AM - 11 AM ET)
  $$
  SELECT
    net.http_post(
        url:=current_setting('app.settings.supabase_url', true) || '/functions/v1/ingest-sentiment-data',
        headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
        body:='{"cron_triggered": true, "automated": true, "morning_intensive": true}'::jsonb
    ) as request_id;
  $$
);

-- Update storage management with correct schedule and authorization
SELECT cron.schedule(
  'storage-management-fixed',
  '0 13-20 * * 1-5', -- Every hour from 1 PM to 8 PM UTC (covers 9 AM - 4 PM ET)
  $$
  SELECT
    net.http_post(
        url:=current_setting('app.settings.supabase_url', true) || '/functions/v1/storage-management',
        headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
        body:='{"cron_triggered": true, "automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Add health monitoring during market hours
SELECT cron.schedule(
  'market-hours-health-check',
  '15 13,15,17,19 * * 1-5', -- Check health at key times during market hours
  $$
  SELECT
    net.http_post(
        url:=current_setting('app.settings.supabase_url', true) || '/functions/v1/test-pipeline-health',
        headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
        body:='{"automated": true, "health_monitoring": true}'::jsonb
    ) as request_id;
  $$
);

-- Add retry failed enrichments job during market hours
SELECT cron.schedule(
  'retry-failed-enrichments-market-hours',
  '30 14,16,18 * * 1-5', -- Retry failed enrichments 3 times during market hours
  $$
  SELECT
    net.http_post(
        url:=current_setting('app.settings.supabase_url', true) || '/functions/v1/retry-failed-enrichments',
        headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);