
-- Add new fields to enriched_signals table for success evaluation
ALTER TABLE public.enriched_signals 
ADD COLUMN success_1h boolean,
ADD COLUMN success_3h boolean, 
ADD COLUMN success_eod boolean,
ADD COLUMN evaluation_status text DEFAULT 'unevaluated',
ADD COLUMN evaluation_timestamp timestamptz;

-- Create audit log table for signal success tracking
CREATE TABLE public.signal_success_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid REFERENCES public.enriched_signals(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  signal_detected_at timestamptz NOT NULL,
  sentiment_type text,
  z_score double precision,
  change_1h double precision,
  change_3h double precision,
  change_eod double precision,
  success_1h boolean,
  success_3h boolean,
  success_eod boolean,
  evaluation_timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_enriched_signals_evaluation_status ON public.enriched_signals(evaluation_status);
CREATE INDEX idx_enriched_signals_price_metadata_status ON public.enriched_signals(price_metadata_status);
CREATE INDEX idx_signal_success_audit_log_ticker ON public.signal_success_audit_log(ticker);
CREATE INDEX idx_signal_success_audit_log_signal_detected_at ON public.signal_success_audit_log(signal_detected_at);

-- Enable RLS on the new audit table
ALTER TABLE public.signal_success_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for service role access (same pattern as enriched_signals)
CREATE POLICY "Service role can manage signal success audit log" ON public.signal_success_audit_log
  FOR ALL USING (true);
