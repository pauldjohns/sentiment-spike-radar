-- Add new daily success evaluation fields to enriched_signals table
ALTER TABLE public.enriched_signals
ADD COLUMN success_high BOOLEAN,
ADD COLUMN success_close BOOLEAN,
ADD COLUMN success_threshold NUMERIC DEFAULT 0.02; -- 2% default threshold

-- Add index for performance on new success fields
CREATE INDEX idx_enriched_signals_success_daily ON public.enriched_signals(ticker, success_high, success_close);

-- Add comments to document the new fields
COMMENT ON COLUMN public.enriched_signals.success_high IS 'True if (high - open) / open >= success_threshold';
COMMENT ON COLUMN public.enriched_signals.success_close IS 'True if (close - open) / open >= success_threshold';
COMMENT ON COLUMN public.enriched_signals.success_threshold IS 'Success threshold as decimal (0.02 = 2%)';