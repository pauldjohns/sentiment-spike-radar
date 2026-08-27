CREATE TABLE IF NOT EXISTS public.runtime_processing_state (
  ticker text PRIMARY KEY,
  state text NOT NULL,
  priority numeric DEFAULT 0,
  anomaly_score numeric DEFAULT 0,
  last_processed timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS runtime_processing_state_updated_at_idx
  ON public.runtime_processing_state (updated_at);
