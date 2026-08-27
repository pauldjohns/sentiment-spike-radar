
-- Create audit table for sentiment model predictions
CREATE TABLE IF NOT EXISTS public.sentiment_model_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL,
  ticker TEXT NOT NULL,
  raw_message TEXT NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'FinALBERT',
  predicted_sentiment TEXT NOT NULL CHECK (predicted_sentiment IN ('bullish', 'bearish', 'neutral')),
  confidence_score NUMERIC(5,3) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_id, model_version)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sentiment_audit_ticker_created 
  ON public.sentiment_model_audit_log(ticker, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sentiment_audit_model_version 
  ON public.sentiment_model_audit_log(model_version);

-- Enable Row Level Security
ALTER TABLE public.sentiment_model_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies with correct syntax
CREATE POLICY "audit_log_public_access"
  ON public.sentiment_model_audit_log
  FOR SELECT USING (true);

CREATE POLICY "audit_log_service_write"
  ON public.sentiment_model_audit_log
  FOR INSERT WITH CHECK (true);
