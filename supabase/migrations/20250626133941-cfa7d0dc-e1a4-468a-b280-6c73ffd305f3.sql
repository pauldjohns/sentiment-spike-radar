
-- Comprehensive RLS policy cleanup to resolve auth_rls_initplan and multiple_permissive_policies warnings
-- This migration removes all legacy policies and ensures only one optimized policy per table

-- ========================================
-- PROFILES TABLE CLEANUP
-- ========================================

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_access_policy" ON public.profiles;

-- Create single consolidated policy for profiles
CREATE POLICY "profiles_unified_access" 
  ON public.profiles 
  FOR ALL 
  USING (
    (SELECT auth.uid()) = id OR 
    public.is_admin((SELECT auth.uid()))
  );

-- ========================================
-- USER_WATCHLISTS TABLE CLEANUP
-- ========================================

-- Drop all existing policies on user_watchlists table
DROP POLICY IF EXISTS "Users can view their own watchlists" ON public.user_watchlists;
DROP POLICY IF EXISTS "Users can insert their own watchlists" ON public.user_watchlists;
DROP POLICY IF EXISTS "Users can update their own watchlists" ON public.user_watchlists;
DROP POLICY IF EXISTS "Users can delete their own watchlists" ON public.user_watchlists;
DROP POLICY IF EXISTS "Users can create their own watchlist items" ON public.user_watchlists;
DROP POLICY IF EXISTS "Users can update their own watchlist items" ON public.user_watchlists;
DROP POLICY IF EXISTS "Users can delete their own watchlist items" ON public.user_watchlists;
DROP POLICY IF EXISTS "user_watchlists_access_policy" ON public.user_watchlists;

-- Create single consolidated policy for user_watchlists
CREATE POLICY "user_watchlists_unified_access"
  ON public.user_watchlists
  FOR ALL
  USING ((SELECT auth.uid()) = user_id);

-- ========================================
-- USER_ALERT_CONFIGS TABLE CLEANUP
-- ========================================

-- Drop all existing policies on user_alert_configs table
DROP POLICY IF EXISTS "Users can view their own alert configs" ON public.user_alert_configs;
DROP POLICY IF EXISTS "Users can insert their own alert configs" ON public.user_alert_configs;
DROP POLICY IF EXISTS "Users can update their own alert configs" ON public.user_alert_configs;
DROP POLICY IF EXISTS "Users can delete their own alert configs" ON public.user_alert_configs;
DROP POLICY IF EXISTS "Users can create their own alert configs" ON public.user_alert_configs;
DROP POLICY IF EXISTS "Users can update their own alert configs" ON public.user_alert_configs;
DROP POLICY IF EXISTS "Users can delete their own alert configs" ON public.user_alert_configs;
DROP POLICY IF EXISTS "user_alert_configs_access_policy" ON public.user_alert_configs;

-- Create single consolidated policy for user_alert_configs
CREATE POLICY "user_alert_configs_unified_access"
  ON public.user_alert_configs
  FOR ALL
  USING ((SELECT auth.uid()) = user_id);

-- ========================================
-- TICKER_SENTIMENT TABLE CLEANUP
-- ========================================

-- Drop all existing policies on ticker_sentiment table
DROP POLICY IF EXISTS "Users can view their own ticker sentiment" ON public.ticker_sentiment;
DROP POLICY IF EXISTS "Users can insert their own ticker sentiment" ON public.ticker_sentiment;
DROP POLICY IF EXISTS "Users can update their own ticker sentiment" ON public.ticker_sentiment;
DROP POLICY IF EXISTS "Users can delete their own ticker sentiment" ON public.ticker_sentiment;
DROP POLICY IF EXISTS "ticker_sentiment_access_policy" ON public.ticker_sentiment;

-- Create single consolidated policy for ticker_sentiment
CREATE POLICY "ticker_sentiment_unified_access"
  ON public.ticker_sentiment
  FOR ALL
  USING ((SELECT auth.uid()) = user_id OR user_id IS NULL);

-- ========================================
-- SENTIMENT_ALERTS TABLE CLEANUP
-- ========================================

-- Drop all existing policies on sentiment_alerts table
DROP POLICY IF EXISTS "Users can view their own alerts" ON public.sentiment_alerts;
DROP POLICY IF EXISTS "Users can insert their own alerts" ON public.sentiment_alerts;
DROP POLICY IF EXISTS "Users can update their own alerts" ON public.sentiment_alerts;
DROP POLICY IF EXISTS "Users can delete their own alerts" ON public.sentiment_alerts;
DROP POLICY IF EXISTS "sentiment_alerts_access_policy" ON public.sentiment_alerts;

-- Create single consolidated policy for sentiment_alerts
CREATE POLICY "sentiment_alerts_unified_access"
  ON public.sentiment_alerts
  FOR ALL
  USING ((SELECT auth.uid()) = user_id OR user_id IS NULL);

-- ========================================
-- STOCKTWITS_MESSAGES TABLE CLEANUP
-- ========================================

-- Drop all existing policies on stocktwits_messages table
DROP POLICY IF EXISTS "Users can view their own messages" ON public.stocktwits_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.stocktwits_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.stocktwits_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.stocktwits_messages;
DROP POLICY IF EXISTS "stocktwits_messages_access_policy" ON public.stocktwits_messages;

-- Create single consolidated policy for stocktwits_messages
CREATE POLICY "stocktwits_messages_unified_access"
  ON public.stocktwits_messages
  FOR ALL
  USING ((SELECT auth.uid()) = owner_id OR owner_id IS NULL);

-- ========================================
-- EXISTING PUBLIC ACCESS TABLES - VERIFY SINGLE POLICIES
-- ========================================

-- Drop any duplicate policies on signal_logs
DROP POLICY IF EXISTS "signal_logs_read_policy" ON public.signal_logs;
DROP POLICY IF EXISTS "signal_logs_insert_policy" ON public.signal_logs;
DROP POLICY IF EXISTS "signal_logs_update_policy" ON public.signal_logs;
DROP POLICY IF EXISTS "signal_logs_delete_policy" ON public.signal_logs;

-- Ensure single policy exists for signal_logs (should already exist from previous migration)
-- CREATE POLICY "signal_logs_public_access" ON public.signal_logs FOR ALL USING (true);

-- Drop any duplicate policies on active_ticker_queue
DROP POLICY IF EXISTS "active_ticker_queue_read_policy" ON public.active_ticker_queue;
DROP POLICY IF EXISTS "active_ticker_queue_insert_policy" ON public.active_ticker_queue;
DROP POLICY IF EXISTS "active_ticker_queue_update_policy" ON public.active_ticker_queue;
DROP POLICY IF EXISTS "active_ticker_queue_delete_policy" ON public.active_ticker_queue;

-- Ensure single policy exists for active_ticker_queue (should already exist from previous migration)
-- CREATE POLICY "active_ticker_queue_public_access" ON public.active_ticker_queue FOR ALL USING (true);

-- Drop any duplicate policies on ticker_volume_history
DROP POLICY IF EXISTS "ticker_volume_history_read_policy" ON public.ticker_volume_history;
DROP POLICY IF EXISTS "ticker_volume_history_insert_policy" ON public.ticker_volume_history;
DROP POLICY IF EXISTS "ticker_volume_history_update_policy" ON public.ticker_volume_history;
DROP POLICY IF EXISTS "ticker_volume_history_delete_policy" ON public.ticker_volume_history;

-- Ensure single policy exists for ticker_volume_history (should already exist from previous migration)
-- CREATE POLICY "ticker_volume_history_public_access" ON public.ticker_volume_history FOR ALL USING (true);

-- ========================================
-- MESSAGE VOLUME HISTORY TABLE CLEANUP
-- ========================================

-- Drop any legacy policies on message_volume_history
DROP POLICY IF EXISTS "message_volume_history_read_policy" ON public.message_volume_history;
DROP POLICY IF EXISTS "message_volume_history_insert_policy" ON public.message_volume_history;
DROP POLICY IF EXISTS "message_volume_history_update_policy" ON public.message_volume_history;
DROP POLICY IF EXISTS "message_volume_history_delete_policy" ON public.message_volume_history;

-- Consolidate message_volume_history policies (these should already exist but ensure no duplicates)
-- The existing policies should be:
-- - message_volume_history_public_read (FOR SELECT)
-- - message_volume_history_service_write (FOR INSERT)  
-- - message_volume_history_service_update (FOR UPDATE)

-- ========================================
-- STOCKTWITS_MESSAGES_LIVE TABLE CLEANUP
-- ========================================

-- Drop any legacy policies on stocktwits_messages_live
DROP POLICY IF EXISTS "stocktwits_messages_live_read_policy" ON public.stocktwits_messages_live;
DROP POLICY IF EXISTS "stocktwits_messages_live_insert_policy" ON public.stocktwits_messages_live;
DROP POLICY IF EXISTS "stocktwits_messages_live_update_policy" ON public.stocktwits_messages_live;
DROP POLICY IF EXISTS "stocktwits_messages_live_delete_policy" ON public.stocktwits_messages_live;

-- The existing unified policy should remain:
-- stocktwits_messages_live_public_access (FOR ALL)

-- ========================================
-- SIGNAL_CONFIG_VERSIONS TABLE CLEANUP
-- ========================================

-- Drop any legacy policies on signal_config_versions
DROP POLICY IF EXISTS "signal_config_versions_read_policy" ON public.signal_config_versions;
DROP POLICY IF EXISTS "signal_config_versions_insert_policy" ON public.signal_config_versions;
DROP POLICY IF EXISTS "signal_config_versions_update_policy" ON public.signal_config_versions;
DROP POLICY IF EXISTS "signal_config_versions_delete_policy" ON public.signal_config_versions;

-- The existing unified policy should remain:
-- signal_config_versions_public_access (FOR ALL)

-- ========================================
-- FINAL VERIFICATION AND OPTIMIZATION
-- ========================================

-- Update table statistics for query planner optimization
ANALYZE public.profiles;
ANALYZE public.user_watchlists;
ANALYZE public.user_alert_configs;
ANALYZE public.ticker_sentiment;
ANALYZE public.sentiment_alerts;
ANALYZE public.stocktwits_messages;
ANALYZE public.message_volume_history;
ANALYZE public.stocktwits_messages_live;
