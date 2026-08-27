
-- Enable the pg_cron and pg_net extensions for scheduled tasks and HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job that runs every 5 minutes during market hours (9:30 AM - 4:00 PM ET, Mon-Fri)
-- This translates to 14:30-21:00 UTC (assuming standard time, adjust for daylight saving)
SELECT cron.schedule(
  'stocktwits-data-ingestion',
  '*/5 14-20 * * 1-5', -- Every 5 minutes, 14:30-20:55 UTC, Monday-Friday
  $$
  SELECT
    net.http_post(
        url:=current_setting('app.settings.supabase_url', true) || '/functions/v1/ingest-sentiment-data',
        headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Also create a cleanup job that runs once daily to remove old messages and alerts
SELECT cron.schedule(
  'cleanup-old-data',
  '0 2 * * *', -- Daily at 2 AM UTC
  $$
  -- Delete messages older than 7 days
  DELETE FROM stocktwits_messages WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- Delete inactive alerts older than 1 day
  DELETE FROM sentiment_alerts WHERE created_at < NOW() - INTERVAL '1 day' AND active = false;
  $$
);
