-- Fix Security Definer View Issue
-- Drop the problematic view and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS live_enriched_signals;

-- Recreate view without SECURITY DEFINER (will use invoker's permissions)
CREATE VIEW live_enriched_signals AS 
SELECT * FROM enriched_signals 
WHERE source = 'live' OR source IS NULL;

-- Fix Function Search Path Issues - Add SET search_path to existing functions
CREATE OR REPLACE FUNCTION public.get_sentiment_baseline(p_ticker text, p_days integer DEFAULT 7)
 RETURNS TABLE(avg_message_count numeric, avg_bullish_ratio numeric, std_dev_message_count numeric, std_dev_bullish_ratio numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    AVG(message_count)::NUMERIC as avg_message_count,
    AVG(bullish_ratio)::NUMERIC as avg_bullish_ratio,
    STDDEV(message_count)::NUMERIC as std_dev_message_count,
    STDDEV(bullish_ratio)::NUMERIC as std_dev_bullish_ratio
  FROM public.message_volume_history 
  WHERE ticker = p_ticker 
    AND date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
    AND message_count > 0;
END;
$function$;

-- Fix overly permissive RLS policies

-- 1. Fix signal_logs - restrict to authenticated users and admins/service role
DROP POLICY IF EXISTS "signal_logs_public_access" ON public.signal_logs;
CREATE POLICY "signal_logs_authenticated_access" 
ON public.signal_logs 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "signal_logs_admin_write" 
ON public.signal_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.role() = 'service_role' OR is_admin(auth.uid()));

CREATE POLICY "signal_logs_admin_update" 
ON public.signal_logs 
FOR UPDATE 
TO authenticated 
USING (auth.role() = 'service_role' OR is_admin(auth.uid()))
WITH CHECK (auth.role() = 'service_role' OR is_admin(auth.uid()));

CREATE POLICY "signal_logs_admin_delete" 
ON public.signal_logs 
FOR DELETE 
TO authenticated 
USING (auth.role() = 'service_role' OR is_admin(auth.uid()));

-- 2. Fix signal_config_versions - restrict to admins only
DROP POLICY IF EXISTS "signal_config_versions_public_access" ON public.signal_config_versions;
CREATE POLICY "signal_config_versions_admin_read" 
ON public.signal_config_versions 
FOR SELECT 
TO authenticated 
USING (auth.role() = 'service_role' OR is_admin(auth.uid()));

CREATE POLICY "signal_config_versions_admin_write" 
ON public.signal_config_versions 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.role() = 'service_role' OR is_admin(auth.uid()));

CREATE POLICY "signal_config_versions_admin_update" 
ON public.signal_config_versions 
FOR UPDATE 
TO authenticated 
USING (auth.role() = 'service_role' OR is_admin(auth.uid()))
WITH CHECK (auth.role() = 'service_role' OR is_admin(auth.uid()));

CREATE POLICY "signal_config_versions_admin_delete" 
ON public.signal_config_versions 
FOR DELETE 
TO authenticated 
USING (auth.role() = 'service_role' OR is_admin(auth.uid()));

-- 3. Fix active_ticker_queue - restrict to service role only
DROP POLICY IF EXISTS "active_ticker_queue_public_access" ON public.active_ticker_queue;
CREATE POLICY "active_ticker_queue_service_read" 
ON public.active_ticker_queue 
FOR SELECT 
TO authenticated 
USING (auth.role() = 'service_role');

CREATE POLICY "active_ticker_queue_service_write" 
ON public.active_ticker_queue 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "active_ticker_queue_service_update" 
ON public.active_ticker_queue 
FOR UPDATE 
TO authenticated 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "active_ticker_queue_service_delete" 
ON public.active_ticker_queue 
FOR DELETE 
TO authenticated 
USING (auth.role() = 'service_role');

-- 4. Fix sentiment_model_audit_log - restrict to admins/service role only
DROP POLICY IF EXISTS "audit_log_public_access" ON public.sentiment_model_audit_log;
CREATE POLICY "audit_log_admin_access" 
ON public.sentiment_model_audit_log 
FOR SELECT 
TO authenticated 
USING (auth.role() = 'service_role' OR is_admin(auth.uid()));

-- 5. Fix ticker_volume_history - restrict to authenticated users for read
DROP POLICY IF EXISTS "ticker_volume_history_public_access" ON public.ticker_volume_history;
CREATE POLICY "ticker_volume_history_authenticated_read" 
ON public.ticker_volume_history 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "ticker_volume_history_service_write" 
ON public.ticker_volume_history 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "ticker_volume_history_service_update" 
ON public.ticker_volume_history 
FOR UPDATE 
TO authenticated 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');