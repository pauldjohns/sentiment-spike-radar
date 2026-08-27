
-- Create signal_logs table for comprehensive signal tracking and audit trail
CREATE TABLE IF NOT EXISTS public.signal_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  signal_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  signal_type TEXT NOT NULL, -- 'volume_spike', 'sentiment_flip', 'user_anomaly', 'combined'
  trigger_details JSONB NOT NULL, -- Volume stats, sentiment shifts, user metrics
  volume_anomaly_score NUMERIC DEFAULT 0, -- 3.75x spike, etc.
  sentiment_shift_percent NUMERIC DEFAULT 0, -- % change in bullish sentiment
  user_diversity_score INTEGER DEFAULT 0, -- unique users count
  user_concentration_percent NUMERIC DEFAULT 0, -- message concentration
  market_hours_confirmed BOOLEAN DEFAULT true,
  anomaly_score NUMERIC DEFAULT 0, -- Combined scoring for prioritization
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create active_ticker_queue table for managing dynamic ticker lifecycle
CREATE TABLE IF NOT EXISTS public.active_ticker_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL UNIQUE,
  entry_reason TEXT NOT NULL, -- Why ticker entered monitoring
  entry_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  anomaly_score NUMERIC DEFAULT 0,
  priority_score NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'cooling_down', 'removed'
  removal_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticker_volume_history table for rolling window calculations
CREATE TABLE IF NOT EXISTS public.ticker_volume_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message_count INTEGER NOT NULL DEFAULT 0,
  bullish_count INTEGER NOT NULL DEFAULT 0,
  bearish_count INTEGER NOT NULL DEFAULT 0,
  neutral_count INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  rolling_window_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_signal_logs_ticker_timestamp ON public.signal_logs(ticker, signal_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_signal_logs_signal_type ON public.signal_logs(signal_type);
CREATE INDEX IF NOT EXISTS idx_active_ticker_queue_status ON public.active_ticker_queue(status);
CREATE INDEX IF NOT EXISTS idx_active_ticker_queue_priority ON public.active_ticker_queue(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_ticker_volume_history_ticker_timestamp ON public.ticker_volume_history(ticker, timestamp DESC);

-- Enable RLS for all new tables
ALTER TABLE public.signal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_ticker_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticker_volume_history ENABLE ROW LEVEL SECURITY;

-- Create policies for signal_logs (readable by authenticated users)
CREATE POLICY "signal_logs_read_policy" ON public.signal_logs FOR SELECT USING (true);
CREATE POLICY "signal_logs_insert_policy" ON public.signal_logs FOR INSERT WITH CHECK (true);

-- Create policies for active_ticker_queue (readable by authenticated users)
CREATE POLICY "active_ticker_queue_read_policy" ON public.active_ticker_queue FOR SELECT USING (true);
CREATE POLICY "active_ticker_queue_insert_policy" ON public.active_ticker_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "active_ticker_queue_update_policy" ON public.active_ticker_queue FOR UPDATE USING (true);

-- Create policies for ticker_volume_history (readable by authenticated users)
CREATE POLICY "ticker_volume_history_read_policy" ON public.ticker_volume_history FOR SELECT USING (true);
CREATE POLICY "ticker_volume_history_insert_policy" ON public.ticker_volume_history FOR INSERT WITH CHECK (true);

-- Update existing sentiment_alerts table to include alert_type constraint
DO $$
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'sentiment_alerts_alert_type_check'
  ) THEN
    ALTER TABLE public.sentiment_alerts DROP CONSTRAINT sentiment_alerts_alert_type_check;
  END IF;
  
  -- Add updated constraint with new alert types
  ALTER TABLE public.sentiment_alerts ADD CONSTRAINT sentiment_alerts_alert_type_check 
    CHECK (alert_type IN ('volume_spike', 'sentiment_spike', 'anomaly', 'price_movement', 'sentiment_flip', 'user_anomaly', 'combined_signal'));
END $$;
