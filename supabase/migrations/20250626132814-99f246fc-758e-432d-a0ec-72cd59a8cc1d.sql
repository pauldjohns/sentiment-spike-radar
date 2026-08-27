
-- Create tables for storing historical message volume data and real sentiment analysis

-- Table to store historical message volume for baseline calculations
CREATE TABLE IF NOT EXISTS public.message_volume_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  date DATE NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  total_messages_analyzed INTEGER NOT NULL DEFAULT 0,
  avg_sentiment_score NUMERIC(5,3) DEFAULT 0.0,
  bullish_ratio NUMERIC(5,3) DEFAULT 0.0,
  bearish_ratio NUMERIC(5,3) DEFAULT 0.0,
  neutral_ratio NUMERIC(5,3) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ticker, date)
);

-- Enable RLS
ALTER TABLE public.message_volume_history ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (read-only for analysis)
CREATE POLICY "message_volume_history_public_read"
  ON public.message_volume_history
  FOR SELECT
  USING (true);

-- Create policy for service writes (FIXED: use WITH CHECK for INSERT)
CREATE POLICY "message_volume_history_service_write"
  ON public.message_volume_history
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "message_volume_history_service_update"
  ON public.message_volume_history
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Table to store real-time Stocktwits messages
CREATE TABLE IF NOT EXISTS public.stocktwits_messages_live (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT UNIQUE NOT NULL,
  ticker TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at_stocktwits TIMESTAMP WITH TIME ZONE NOT NULL,
  user_id_stocktwits TEXT,
  username TEXT,
  sentiment_label TEXT CHECK (sentiment_label IN ('bullish', 'bearish', 'neutral')),
  sentiment_confidence NUMERIC(5,3),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.stocktwits_messages_live ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "stocktwits_messages_live_public_access"
  ON public.stocktwits_messages_live
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_volume_history_ticker_date 
  ON public.message_volume_history(ticker, date DESC);

CREATE INDEX IF NOT EXISTS idx_stocktwits_messages_live_ticker_created 
  ON public.stocktwits_messages_live(ticker, created_at_stocktwits DESC);

CREATE INDEX IF NOT EXISTS idx_stocktwits_messages_live_processed 
  ON public.stocktwits_messages_live(processed_at DESC);

-- Function to calculate rolling averages for sentiment baselines
CREATE OR REPLACE FUNCTION public.get_sentiment_baseline(
  p_ticker TEXT,
  p_days INTEGER DEFAULT 7
) RETURNS TABLE (
  avg_message_count NUMERIC,
  avg_bullish_ratio NUMERIC,
  std_dev_message_count NUMERIC,
  std_dev_bullish_ratio NUMERIC
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    AVG(message_count)::NUMERIC as avg_message_count,
    AVG(bullish_ratio)::NUMERIC as avg_bullish_ratio,
    STDDEV(message_count)::NUMERIC as std_dev_message_count,
    STDDEV(bullish_ratio)::NUMERIC as std_dev_bullish_ratio
  FROM public.message_volume_history 
  WHERE ticker = p_ticker 
    AND date >= CURRENT_DATE - INTERVAL '%s days' 
    AND message_count > 0;
END;
$$;

-- Function to update daily message volume history
CREATE OR REPLACE FUNCTION public.update_daily_message_volume(
  p_ticker TEXT,
  p_date DATE,
  p_message_count INTEGER,
  p_bullish_ratio NUMERIC DEFAULT 0.0,
  p_bearish_ratio NUMERIC DEFAULT 0.0,
  p_neutral_ratio NUMERIC DEFAULT 0.0
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.message_volume_history (
    ticker, date, message_count, bullish_ratio, bearish_ratio, neutral_ratio, updated_at
  ) VALUES (
    p_ticker, p_date, p_message_count, p_bullish_ratio, p_bearish_ratio, p_neutral_ratio, NOW()
  )
  ON CONFLICT (ticker, date) 
  DO UPDATE SET 
    message_count = EXCLUDED.message_count,
    bullish_ratio = EXCLUDED.bullish_ratio,
    bearish_ratio = EXCLUDED.bearish_ratio,
    neutral_ratio = EXCLUDED.neutral_ratio,
    updated_at = NOW();
END;
$$;
