
-- Create enriched_signals table for storing signals with price metadata
CREATE TABLE public.enriched_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text NOT NULL,
  time_window text,
  signal_detected_at timestamptz NOT NULL,
  sentiment_type text,
  z_score double precision,
  sentiment_velocity double precision,
  message_volume integer,

  price_at_signal double precision,
  price_1h_later double precision,
  price_3h_later double precision,
  price_eod double precision,

  change_1h double precision,
  change_3h double precision,
  change_eod double precision,

  price_metadata_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.enriched_signals ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read enriched signals
CREATE POLICY "Allow authenticated users to read enriched signals" 
  ON public.enriched_signals 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Create policy for service role to manage enriched signals
CREATE POLICY "Allow service role to manage enriched signals" 
  ON public.enriched_signals 
  FOR ALL 
  TO service_role 
  USING (true);

-- Add index for efficient queries
CREATE INDEX idx_enriched_signals_ticker ON public.enriched_signals(ticker);
CREATE INDEX idx_enriched_signals_detected_at ON public.enriched_signals(signal_detected_at);
CREATE INDEX idx_enriched_signals_status ON public.enriched_signals(price_metadata_status);
