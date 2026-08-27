-- Add success_threshold column to signal_pattern_stats to track threshold-specific performance
ALTER TABLE public.signal_pattern_stats
  ADD COLUMN success_threshold NUMERIC DEFAULT 0.10;

COMMENT ON COLUMN public.signal_pattern_stats.success_threshold IS 'Success threshold as decimal (0.10 = 10%)';

-- Update unique constraint to include success_threshold so patterns from different thresholds are stored separately
ALTER TABLE public.signal_pattern_stats
  DROP CONSTRAINT IF EXISTS signal_pattern_stats_ticker_rounded_z_score_rounded_sentiment_velocity_key;
ALTER TABLE public.signal_pattern_stats
  ADD CONSTRAINT signal_pattern_stats_unique_pattern_threshold UNIQUE (ticker, rounded_z_score, rounded_sentiment_velocity, success_threshold);
