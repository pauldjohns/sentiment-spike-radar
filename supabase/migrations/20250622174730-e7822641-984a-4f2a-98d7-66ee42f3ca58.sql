
-- Create function to get database size
CREATE OR REPLACE FUNCTION get_db_size()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_database_size(current_database());
$$;

-- Update the existing cron job to include storage management
-- First, unschedule the existing job
SELECT cron.unschedule('stocktwits-data-ingestion');

-- Create new job that includes both data ingestion and storage management
SELECT cron.schedule(
  'stocktwits-data-and-storage',
  '*/5 14-20 * * 1-5', -- Every 5 minutes during market hours
  $$
  -- Data ingestion
  SELECT
    net.http_post(
        url:=current_setting('app.settings.supabase_url', true) || '/functions/v1/ingest-sentiment-data',
        headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Add storage management cron job (runs every hour during market hours)
SELECT cron.schedule(
  'storage-management',
  '0 14-20 * * 1-5', -- Every hour during market hours
  $$
  SELECT
    net.http_post(
        url:=current_setting('app.settings.supabase_url', true) || '/functions/v1/storage-management',
        headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Keep the existing cleanup job but make it more aggressive
SELECT cron.unschedule('cleanup-old-data');
SELECT cron.schedule(
  'cleanup-old-data',
  '0 2 * * *', -- Daily at 2 AM UTC
  $$
  -- More aggressive cleanup for non-flagged tickers
  DELETE FROM stocktwits_messages 
  WHERE created_at < NOW() - INTERVAL '7 days'
  AND ticker NOT IN (
    SELECT DISTINCT ticker FROM sentiment_alerts 
    WHERE created_at > NOW() - INTERVAL '30 days' AND active = true
  );
  
  DELETE FROM ticker_sentiment 
  WHERE last_updated < NOW() - INTERVAL '3 days'
  AND ticker NOT IN (
    SELECT DISTINCT ticker FROM sentiment_alerts 
    WHERE created_at > NOW() - INTERVAL '30 days' AND active = true
  );
  
  -- Delete inactive alerts older than 7 days
  DELETE FROM sentiment_alerts WHERE created_at < NOW() - INTERVAL '7 days' AND active = false;
  $$
);
