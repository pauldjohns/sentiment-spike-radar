
-- Create backtest_runs table to track replay metadata
CREATE TABLE public.backtest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_name text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  date_range daterange,
  ticker_filter text[],
  min_z_score double precision,
  min_velocity double precision,
  notes text,
  status text DEFAULT 'pending', -- pending, complete, failed
  completed_at timestamptz
);

-- Update enriched_signals to reference backtest_runs
ALTER TABLE public.enriched_signals 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'live',
ADD COLUMN IF NOT EXISTS replay_batch_id uuid REFERENCES public.backtest_runs(id);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_enriched_signals_source ON public.enriched_signals(source);
CREATE INDEX IF NOT EXISTS idx_enriched_signals_replay_batch_id ON public.enriched_signals(replay_batch_id);
CREATE INDEX IF NOT EXISTS idx_enriched_signals_signal_detected_at ON public.enriched_signals(signal_detected_at);
CREATE INDEX IF NOT EXISTS idx_backtest_runs_created_at ON public.backtest_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_backtest_runs_status ON public.backtest_runs(status);

-- Enable RLS on backtest_runs
ALTER TABLE public.backtest_runs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for backtest_runs
CREATE POLICY "Service role can manage backtest runs" ON public.backtest_runs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own backtest runs" ON public.backtest_runs
  FOR SELECT USING (created_by = auth.uid());

-- Update RLS policy for enriched_signals (drop and recreate to ensure proper foreign key handling)
DROP POLICY IF EXISTS "Service role can manage replay signals" ON public.enriched_signals;
CREATE POLICY "Service role can manage replay signals" ON public.enriched_signals
  FOR ALL USING (source = 'replay' OR auth.role() = 'service_role');
