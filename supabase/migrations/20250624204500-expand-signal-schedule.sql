
-- Update pg_cron schedule to include all four time windows

-- Remove old schedule if it exists
SELECT cron.unschedule('daily-signal-summary-email');

-- Schedule daily summary email at 4:15 PM ET (unchanged)
SELECT cron.schedule(
  'daily-signal-summary-email',
  '15 20 * * *', -- 4:15 PM ET (assuming server is UTC, adjust if needed)
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/daily-summary-email',
    headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
    body := '{"scheduled": true, "expected_signals": 40}'::jsonb
  );
  $$
);

-- Schedule industry detection for pre-market (9:00 AM ET)
SELECT cron.schedule(
  'industry-detection-0900',
  '0 13 * * 1-5', -- 9:00 AM ET on weekdays (13:00 UTC)
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/schedule-industry-detection',
    headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
    body := '{"runTime": "09:00", "timeWindow": "pre_market"}'::jsonb
  );
  $$
);

-- Schedule industry detection for market open (9:30 AM ET)
SELECT cron.schedule(
  'industry-detection-0930',
  '30 13 * * 1-5', -- 9:30 AM ET on weekdays (13:30 UTC)
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/schedule-industry-detection',
    headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
    body := '{"runTime": "09:30", "timeWindow": "market_open"}'::jsonb
  );
  $$
);

-- Schedule industry detection for +30 minutes (10:00 AM ET)
SELECT cron.schedule(
  'industry-detection-1000',
  '0 14 * * 1-5', -- 10:00 AM ET on weekdays (14:00 UTC)
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/schedule-industry-detection',
    headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
    body := '{"runTime": "10:00", "timeWindow": "plus_30_min"}'::jsonb
  );
  $$
);

-- Schedule industry detection for +1 hour (10:30 AM ET)
SELECT cron.schedule(
  'industry-detection-1030',
  '30 14 * * 1-5', -- 10:30 AM ET on weekdays (14:30 UTC)
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/schedule-industry-detection',
    headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)),
    body := '{"runTime": "10:30", "timeWindow": "plus_1_hr"}'::jsonb
  );
  $$
);
