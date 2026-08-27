-- Fix ingestion cron job with correct authorization parameters
-- Risk mitigation: Update existing cron job to use correct authorization

-- First, remove existing problematic cron job
SELECT cron.unschedule('stocktwits-ingestion-every-5min');

-- Create new cron job with correct parameters that match the function's authorization logic
SELECT cron.schedule(
  'stocktwits-ingestion-fixed-auth',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/ingest-sentiment-data',
        headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
        body := '{"cron_triggered": true, "automated": true}'::jsonb
    ) as request_id;
  $$
);