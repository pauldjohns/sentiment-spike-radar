
-- Create signal_learning_log table for ML training data
CREATE TABLE public.signal_learning_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enriched_signal_id uuid REFERENCES public.enriched_signals(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  time_window text,
  z_score double precision,
  sentiment_velocity double precision,
  message_volume integer,
  success_eod boolean,
  success_1h boolean,
  success_3h boolean,
  confidence_score double precision,
  evaluated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX idx_signal_learning_log_ticker ON public.signal_learning_log(ticker);
CREATE INDEX idx_signal_learning_log_success_eod ON public.signal_learning_log(success_eod);
CREATE INDEX idx_signal_learning_log_evaluated_at ON public.signal_learning_log(evaluated_at);
CREATE INDEX idx_signal_learning_log_enriched_signal_id ON public.signal_learning_log(enriched_signal_id);

-- Enable RLS for the learning log table
ALTER TABLE public.signal_learning_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for service role access (same pattern as other enrichment tables)
CREATE POLICY "Service role can manage signal learning log" ON public.signal_learning_log
  FOR ALL USING (true);
