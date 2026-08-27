
-- Expand signal_logs table to include outcome tracking and verification
ALTER TABLE public.signal_logs ADD COLUMN IF NOT EXISTS outcome_achieved BOOLEAN DEFAULT NULL;
ALTER TABLE public.signal_logs ADD COLUMN IF NOT EXISTS price_at_signal NUMERIC DEFAULT NULL;
ALTER TABLE public.signal_logs ADD COLUMN IF NOT EXISTS price_max_within_window NUMERIC DEFAULT NULL;
ALTER TABLE public.signal_logs ADD COLUMN IF NOT EXISTS max_intraday_pct_gain NUMERIC DEFAULT NULL;
ALTER TABLE public.signal_logs ADD COLUMN IF NOT EXISTS signal_confidence TEXT DEFAULT 'medium';
ALTER TABLE public.signal_logs ADD COLUMN IF NOT EXISTS time_to_peak INTERVAL DEFAULT NULL;
ALTER TABLE public.signal_logs ADD COLUMN IF NOT EXISTS outcome_label TEXT DEFAULT NULL;
ALTER TABLE public.signal_logs ADD COLUMN IF NOT EXISTS verification_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.signal_logs ADD COLUMN IF NOT EXISTS config_version TEXT DEFAULT 'v1.0';

-- Add constraint for signal_confidence
ALTER TABLE public.signal_logs DROP CONSTRAINT IF EXISTS signal_logs_confidence_check;
ALTER TABLE public.signal_logs ADD CONSTRAINT signal_logs_confidence_check 
  CHECK (signal_confidence IN ('high', 'medium', 'low'));

-- Add constraint for outcome_label
ALTER TABLE public.signal_logs DROP CONSTRAINT IF EXISTS signal_logs_outcome_label_check;
ALTER TABLE public.signal_logs ADD CONSTRAINT signal_logs_outcome_label_check 
  CHECK (outcome_label IN ('successful_10pct_gain', 'false_positive', 'weak_signal', 'pending_verification', 'timeout'));

-- Create signal_config_versions table for tracking parameter tuning
CREATE TABLE IF NOT EXISTS public.signal_config_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_name TEXT NOT NULL UNIQUE,
  config_data JSONB NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create signal_performance_metrics table for aggregated performance tracking
CREATE TABLE IF NOT EXISTS public.signal_performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  config_version TEXT NOT NULL,
  total_signals INTEGER DEFAULT 0,
  successful_signals INTEGER DEFAULT 0,
  false_positives INTEGER DEFAULT 0,
  pending_signals INTEGER DEFAULT 0,
  accuracy_rate NUMERIC DEFAULT 0.0,
  avg_time_to_peak INTERVAL DEFAULT NULL,
  high_confidence_signals INTEGER DEFAULT 0,
  high_confidence_success_rate NUMERIC DEFAULT 0.0,
  volume_only_signals INTEGER DEFAULT 0,
  sentiment_only_signals INTEGER DEFAULT 0,
  combined_signals INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date, config_version)
);

-- Create historical_price_data table for backtesting
CREATE TABLE IF NOT EXISTS public.historical_price_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  date DATE NOT NULL,
  open_price NUMERIC NOT NULL,
  high_price NUMERIC NOT NULL,
  low_price NUMERIC NOT NULL,
  close_price NUMERIC NOT NULL,
  volume BIGINT DEFAULT 0,
  intraday_high_time TIME DEFAULT NULL,
  max_intraday_gain_pct NUMERIC DEFAULT 0.0,
  data_source TEXT DEFAULT 'yahoo_finance',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ticker, date)
);

-- Create backtesting_runs table for tracking simulation results
CREATE TABLE IF NOT EXISTS public.backtesting_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_name TEXT NOT NULL,
  config_version TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  ticker_filter TEXT[] DEFAULT NULL,
  sector_filter TEXT[] DEFAULT NULL,
  market_cap_filter TEXT DEFAULT NULL,
  total_signals INTEGER DEFAULT 0,
  successful_signals INTEGER DEFAULT 0,
  precision_rate NUMERIC DEFAULT 0.0,
  recall_rate NUMERIC DEFAULT 0.0,
  avg_time_to_peak INTERVAL DEFAULT NULL,
  best_performing_hours INTEGER[] DEFAULT NULL,
  run_status TEXT DEFAULT 'pending',
  results_summary JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_signal_logs_outcome_verification ON public.signal_logs(ticker, outcome_achieved, verification_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_signal_logs_config_version ON public.signal_logs(config_version, signal_confidence);
CREATE INDEX IF NOT EXISTS idx_signal_performance_metrics_date_version ON public.signal_performance_metrics(date DESC, config_version);
CREATE INDEX IF NOT EXISTS idx_historical_price_data_ticker_date ON public.historical_price_data(ticker, date DESC);
CREATE INDEX IF NOT EXISTS idx_backtesting_runs_status ON public.backtesting_runs(run_status, created_at DESC);

-- Enable RLS for new tables
ALTER TABLE public.signal_config_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_price_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtesting_runs ENABLE ROW LEVEL SECURITY;

-- Create policies for signal_config_versions
CREATE POLICY "signal_config_versions_read_policy" ON public.signal_config_versions FOR SELECT USING (true);
CREATE POLICY "signal_config_versions_insert_policy" ON public.signal_config_versions FOR INSERT WITH CHECK (true);
CREATE POLICY "signal_config_versions_update_policy" ON public.signal_config_versions FOR UPDATE USING (true);

-- Create policies for signal_performance_metrics
CREATE POLICY "signal_performance_metrics_read_policy" ON public.signal_performance_metrics FOR SELECT USING (true);
CREATE POLICY "signal_performance_metrics_insert_policy" ON public.signal_performance_metrics FOR INSERT WITH CHECK (true);
CREATE POLICY "signal_performance_metrics_update_policy" ON public.signal_performance_metrics FOR UPDATE USING (true);

-- Create policies for historical_price_data
CREATE POLICY "historical_price_data_read_policy" ON public.historical_price_data FOR SELECT USING (true);
CREATE POLICY "historical_price_data_insert_policy" ON public.historical_price_data FOR INSERT WITH CHECK (true);

-- Create policies for backtesting_runs
CREATE POLICY "backtesting_runs_read_policy" ON public.backtesting_runs FOR SELECT USING (true);
CREATE POLICY "backtesting_runs_insert_policy" ON public.backtesting_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "backtesting_runs_update_policy" ON public.backtesting_runs FOR UPDATE USING (true);

-- Create function to calculate daily performance metrics
CREATE OR REPLACE FUNCTION public.calculate_daily_performance_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.signal_performance_metrics (
    date,
    config_version,
    total_signals,
    successful_signals,
    false_positives,
    pending_signals,
    accuracy_rate,
    avg_time_to_peak,
    high_confidence_signals,
    high_confidence_success_rate,
    volume_only_signals,
    sentiment_only_signals,
    combined_signals
  )
  SELECT 
    target_date,
    config_version,
    COUNT(*) as total_signals,
    COUNT(*) FILTER (WHERE outcome_achieved = true) as successful_signals,
    COUNT(*) FILTER (WHERE outcome_achieved = false) as false_positives,
    COUNT(*) FILTER (WHERE outcome_achieved IS NULL) as pending_signals,
    CASE 
      WHEN COUNT(*) FILTER (WHERE outcome_achieved IS NOT NULL) > 0 
      THEN (COUNT(*) FILTER (WHERE outcome_achieved = true)::NUMERIC / COUNT(*) FILTER (WHERE outcome_achieved IS NOT NULL)) * 100
      ELSE 0 
    END as accuracy_rate,
    AVG(time_to_peak) FILTER (WHERE outcome_achieved = true) as avg_time_to_peak,
    COUNT(*) FILTER (WHERE signal_confidence = 'high') as high_confidence_signals,
    CASE 
      WHEN COUNT(*) FILTER (WHERE signal_confidence = 'high' AND outcome_achieved IS NOT NULL) > 0 
      THEN (COUNT(*) FILTER (WHERE signal_confidence = 'high' AND outcome_achieved = true)::NUMERIC / COUNT(*) FILTER (WHERE signal_confidence = 'high' AND outcome_achieved IS NOT NULL)) * 100
      ELSE 0 
    END as high_confidence_success_rate,
    COUNT(*) FILTER (WHERE signal_type = 'volume_spike') as volume_only_signals,
    COUNT(*) FILTER (WHERE signal_type = 'sentiment_flip') as sentiment_only_signals,
    COUNT(*) FILTER (WHERE signal_type = 'combined_signal') as combined_signals
  FROM public.signal_logs 
  WHERE DATE(signal_timestamp) = target_date
  GROUP BY config_version
  ON CONFLICT (date, config_version) 
  DO UPDATE SET
    total_signals = EXCLUDED.total_signals,
    successful_signals = EXCLUDED.successful_signals,
    false_positives = EXCLUDED.false_positives,
    pending_signals = EXCLUDED.pending_signals,
    accuracy_rate = EXCLUDED.accuracy_rate,
    avg_time_to_peak = EXCLUDED.avg_time_to_peak,
    high_confidence_signals = EXCLUDED.high_confidence_signals,
    high_confidence_success_rate = EXCLUDED.high_confidence_success_rate,
    volume_only_signals = EXCLUDED.volume_only_signals,
    sentiment_only_signals = EXCLUDED.sentiment_only_signals,
    combined_signals = EXCLUDED.combined_signals,
    updated_at = now();
END;
$$;
