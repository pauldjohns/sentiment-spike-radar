
-- First, let's add the missing columns to signal_logs table
ALTER TABLE public.signal_logs 
ADD COLUMN IF NOT EXISTS entry_reason text,
ADD COLUMN IF NOT EXISTS message_volume integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS bullish_sentiment numeric DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS message_concentration numeric DEFAULT 0.0;

-- Add indexes for performance on signal_logs
CREATE INDEX IF NOT EXISTS idx_signal_logs_ticker_created_at ON public.signal_logs(ticker, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_logs_confidence ON public.signal_logs(signal_confidence);
CREATE INDEX IF NOT EXISTS idx_signal_logs_entry_reason ON public.signal_logs(entry_reason);

-- Add index to sentiment_alerts for performance
CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_ticker_dispatched ON public.sentiment_alerts(ticker, created_at DESC);

-- Add signal_id column to sentiment_alerts if you want to link alerts to signals
ALTER TABLE public.sentiment_alerts 
ADD COLUMN IF NOT EXISTS signal_id uuid REFERENCES public.signal_logs(id);

-- Create the index on signal_id
CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_signal_id ON public.sentiment_alerts(signal_id) WHERE signal_id IS NOT NULL;

-- Now test insert to validate the schema works
INSERT INTO public.signal_logs (
  ticker,
  signal_type,
  entry_reason,
  trigger_details,
  signal_confidence,
  message_volume,
  bullish_sentiment,
  user_diversity_score,
  message_concentration,
  volume_anomaly_score,
  sentiment_shift_percent
) VALUES (
  'TEST',
  'combined_signal',
  'Schema validation test',
  '{"volume": 3.5, "sentiment": 0.78, "users": 0.9, "test_mode": true}',
  'medium',
  120,
  82.5,
  9,
  45.2,
  3.5,
  25.3
);

-- Test alert insert with valid alert_type
INSERT INTO public.sentiment_alerts (
  ticker,
  alert_type,
  message,
  confidence
) VALUES (
  'TEST',
  'volume_spike',
  'Schema validation test alert',
  'medium'
);
