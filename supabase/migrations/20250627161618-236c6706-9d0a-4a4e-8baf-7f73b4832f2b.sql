
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the cron job to run ingestion every 5 minutes
SELECT cron.schedule(
  'stocktwits-ingestion-every-5min',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/ingest-sentiment-data',
        headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
        body := '{"triggered_by_cron": true, "industry_focused": true, "sessionId": "cron_ingest_v1"}'::jsonb
    ) as request_id;
  $$
);

-- Verify the cron job was created
SELECT jobid, schedule, command FROM cron.job WHERE jobname = 'stocktwits-ingestion-every-5min';
