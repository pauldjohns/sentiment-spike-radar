
-- Fix auth_rls_initplan performance warnings by wrapping auth.uid() in subqueries
-- and consolidate multiple permissive policies (corrected version)

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;

-- Create optimized policies for profiles table
CREATE POLICY "profiles_access_policy" 
  ON public.profiles 
  FOR ALL 
  USING (
    (SELECT auth.uid()) = id OR 
    public.is_admin((SELECT auth.uid()))
  );

-- Drop existing policies for user_watchlists
DROP POLICY IF EXISTS "Users can view their own watchlists" ON public.user_watchlists;
DROP POLICY IF EXISTS "Users can insert their own watchlists" ON public.user_watchlists;
DROP POLICY IF EXISTS "Users can update their own watchlists" ON public.user_watchlists;
DROP POLICY IF EXISTS "Users can delete their own watchlists" ON public.user_watchlists;

-- Create consolidated policy for user_watchlists
CREATE POLICY "user_watchlists_access_policy"
  ON public.user_watchlists
  FOR ALL
  USING ((SELECT auth.uid()) = user_id);

-- Drop existing policies for user_alert_configs
DROP POLICY IF EXISTS "Users can view their own alert configs" ON public.user_alert_configs;
DROP POLICY IF EXISTS "Users can insert their own alert configs" ON public.user_alert_configs;
DROP POLICY IF EXISTS "Users can update their own alert configs" ON public.user_alert_configs;
DROP POLICY IF EXISTS "Users can delete their own alert configs" ON public.user_alert_configs;

-- Create consolidated policy for user_alert_configs
CREATE POLICY "user_alert_configs_access_policy"
  ON public.user_alert_configs
  FOR ALL
  USING ((SELECT auth.uid()) = user_id);

-- Drop existing policies for ticker_sentiment
DROP POLICY IF EXISTS "Users can view their own ticker sentiment" ON public.ticker_sentiment;
DROP POLICY IF EXISTS "Users can insert their own ticker sentiment" ON public.ticker_sentiment;
DROP POLICY IF EXISTS "Users can update their own ticker sentiment" ON public.ticker_sentiment;

-- Create consolidated policy for ticker_sentiment
CREATE POLICY "ticker_sentiment_access_policy"
  ON public.ticker_sentiment
  FOR ALL
  USING ((SELECT auth.uid()) = user_id OR user_id IS NULL);

-- Drop existing policies for sentiment_alerts
DROP POLICY IF EXISTS "Users can view their own alerts" ON public.sentiment_alerts;
DROP POLICY IF EXISTS "Users can insert their own alerts" ON public.sentiment_alerts;
DROP POLICY IF EXISTS "Users can update their own alerts" ON public.sentiment_alerts;

-- Create consolidated policy for sentiment_alerts
CREATE POLICY "sentiment_alerts_access_policy"
  ON public.sentiment_alerts
  FOR ALL
  USING ((SELECT auth.uid()) = user_id OR user_id IS NULL);

-- Drop existing policies for stocktwits_messages
DROP POLICY IF EXISTS "Users can view their own messages" ON public.stocktwits_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.stocktwits_messages;

-- Create consolidated policy for stocktwits_messages
CREATE POLICY "stocktwits_messages_access_policy"
  ON public.stocktwits_messages
  FOR ALL
  USING ((SELECT auth.uid()) = owner_id OR owner_id IS NULL);

-- Add performance indexes for commonly queried columns on existing tables
CREATE INDEX IF NOT EXISTS idx_user_watchlists_user_id ON public.user_watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_watchlists_ticker ON public.user_watchlists(ticker);
CREATE INDEX IF NOT EXISTS idx_user_alert_configs_user_id ON public.user_alert_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_ticker_sentiment_user_id ON public.ticker_sentiment(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ticker_sentiment_ticker_updated ON public.ticker_sentiment(ticker, last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_user_id ON public.sentiment_alerts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_ticker_active ON public.sentiment_alerts(ticker, active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stocktwits_messages_owner_id ON public.stocktwits_messages(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stocktwits_messages_ticker_processed ON public.stocktwits_messages(ticker, processed_at DESC);

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_watchlists_user_enabled ON public.user_watchlists(user_id, enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_signal_logs_ticker_window_timestamp ON public.signal_logs(ticker, time_window, signal_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_active_ticker_queue_status_priority ON public.active_ticker_queue(status, priority_score DESC) WHERE status = 'active';

-- Ensure signal_logs, active_ticker_queue, and ticker_volume_history have proper public access
DROP POLICY IF EXISTS "signal_logs_read_policy" ON public.signal_logs;
DROP POLICY IF EXISTS "signal_logs_insert_policy" ON public.signal_logs;
DROP POLICY IF EXISTS "active_ticker_queue_read_policy" ON public.active_ticker_queue;
DROP POLICY IF EXISTS "active_ticker_queue_insert_policy" ON public.active_ticker_queue;
DROP POLICY IF EXISTS "active_ticker_queue_update_policy" ON public.active_ticker_queue;
DROP POLICY IF EXISTS "ticker_volume_history_read_policy" ON public.ticker_volume_history;
DROP POLICY IF EXISTS "ticker_volume_history_insert_policy" ON public.ticker_volume_history;

-- Create optimized public access policies for existing tables
CREATE POLICY "signal_logs_public_access"
  ON public.signal_logs
  FOR ALL
  USING (true);

CREATE POLICY "active_ticker_queue_public_access"
  ON public.active_ticker_queue
  FOR ALL
  USING (true);

CREATE POLICY "ticker_volume_history_public_access"
  ON public.ticker_volume_history
  FOR ALL
  USING (true);

-- Create optimized public access policies for config tables
DROP POLICY IF EXISTS "signal_config_versions_read_policy" ON public.signal_config_versions;
DROP POLICY IF EXISTS "signal_config_versions_insert_policy" ON public.signal_config_versions;
DROP POLICY IF EXISTS "signal_config_versions_update_policy" ON public.signal_config_versions;

CREATE POLICY "signal_config_versions_public_access"
  ON public.signal_config_versions
  FOR ALL
  USING (true);

-- Analyze tables to update statistics for query planner
ANALYZE public.user_watchlists;
ANALYZE public.user_alert_configs;
ANALYZE public.ticker_sentiment;
ANALYZE public.sentiment_alerts;
ANALYZE public.stocktwits_messages;
ANALYZE public.signal_logs;
ANALYZE public.active_ticker_queue;
