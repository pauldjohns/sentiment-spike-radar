
-- Add is_simulated flag to enriched_signals for better data isolation
ALTER TABLE public.enriched_signals 
ADD COLUMN IF NOT EXISTS is_simulated boolean DEFAULT false;

-- Update existing replay signals to be marked as simulated
UPDATE public.enriched_signals 
SET is_simulated = true 
WHERE source = 'replay' OR replay_batch_id IS NOT NULL;

-- Add index for efficient filtering of real vs simulated data
CREATE INDEX IF NOT EXISTS idx_enriched_signals_is_simulated ON public.enriched_signals(is_simulated);
CREATE INDEX IF NOT EXISTS idx_enriched_signals_live_data ON public.enriched_signals(ticker, signal_detected_at) WHERE is_simulated = false;

-- Create a view for live-only signals to prevent accidental inclusion of simulated data
CREATE OR REPLACE VIEW public.live_enriched_signals AS
SELECT * FROM public.enriched_signals 
WHERE is_simulated = false OR is_simulated IS NULL;

-- Update RLS policies to add protection against simulated data exposure
DROP POLICY IF EXISTS "Prevent simulated data in live analysis" ON public.enriched_signals;
CREATE POLICY "Prevent simulated data in live analysis" ON public.enriched_signals
  FOR SELECT 
  USING (
    CASE 
      WHEN current_setting('app.include_simulated', true) = 'true' THEN true
      ELSE (is_simulated = false OR is_simulated IS NULL)
    END
  );

-- Add constraint to ensure replay signals are marked as simulated
ALTER TABLE public.enriched_signals 
ADD CONSTRAINT check_replay_is_simulated 
CHECK (
  (source = 'replay' AND is_simulated = true) OR 
  (source != 'replay')
);
