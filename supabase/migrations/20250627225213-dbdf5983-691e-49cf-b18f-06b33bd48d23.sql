
-- Add confidence scoring columns to enriched_signals table
ALTER TABLE public.enriched_signals
ADD COLUMN confidence_score numeric CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
ADD COLUMN confidence_source text DEFAULT 'pattern_stats_v1';

-- Add index for confidence score sorting
CREATE INDEX idx_enriched_signals_confidence_score ON public.enriched_signals(confidence_score DESC);

-- Add index for pattern lookup optimization
CREATE INDEX idx_enriched_signals_pattern_lookup ON public.enriched_signals(ticker, z_score, sentiment_velocity);
