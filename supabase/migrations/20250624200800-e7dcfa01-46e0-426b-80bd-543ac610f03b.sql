
-- Add disparity_detected column for better querying
ALTER TABLE signal_logs ADD COLUMN IF NOT EXISTS disparity_detected boolean DEFAULT false;

-- Remove legacy price-related columns that are no longer needed
ALTER TABLE signal_logs DROP COLUMN IF EXISTS price_at_signal;
ALTER TABLE signal_logs DROP COLUMN IF EXISTS price_max_within_window;
ALTER TABLE signal_logs DROP COLUMN IF EXISTS max_intraday_pct_gain;
ALTER TABLE signal_logs DROP COLUMN IF EXISTS time_to_peak;
ALTER TABLE signal_logs DROP COLUMN IF EXISTS verification_timestamp;
ALTER TABLE signal_logs DROP COLUMN IF EXISTS outcome_achieved;
ALTER TABLE signal_logs DROP COLUMN IF EXISTS outcome_label;

-- Drop unused tables for cleanup
DROP TABLE IF EXISTS stock_price_tracking CASCADE;
DROP TABLE IF EXISTS historical_price_data CASCADE;
DROP TABLE IF EXISTS backtesting_runs CASCADE;
DROP TABLE IF EXISTS signal_performance_metrics CASCADE;
DROP TABLE IF EXISTS accuracy_metrics CASCADE;

-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily summary email at 4:15 PM ET
SELECT cron.schedule(
  'daily-signal-summary-email',
  '15 20 * * *', -- 4:15 PM ET (assuming server is UTC, adjust if needed)
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/daily-summary-email',
    headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
    body := '{"scheduled": true}'::jsonb
  );
  $$
);
