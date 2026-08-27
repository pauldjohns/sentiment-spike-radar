
-- Add columns to enriched_signals table to support backtesting
ALTER TABLE public.enriched_signals 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'live',
ADD COLUMN IF NOT EXISTS replay_batch_id uuid;

-- Add indexes for efficient backtesting queries
CREATE INDEX IF NOT EXISTS idx_enriched_signals_source ON public.enriched_signals(source);
CREATE INDEX IF NOT EXISTS idx_enriched_signals_replay_batch_id ON public.enriched_signals(replay_batch_id);
CREATE INDEX IF NOT EXISTS idx_enriched_signals_signal_detected_at ON public.enriched_signals(signal_detected_at);

-- Create RLS policy for replay signals (drop first if exists to avoid conflicts)
DROP POLICY IF EXISTS "Service role can manage replay signals" ON public.enriched_signals;
CREATE POLICY "Service role can manage replay signals" ON public.enriched_signals
  FOR ALL USING (source = 'replay' OR auth.role() = 'service_role');
