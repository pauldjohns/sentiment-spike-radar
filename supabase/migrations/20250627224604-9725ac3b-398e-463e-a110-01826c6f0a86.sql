
-- Create signal pattern stats table to track performance of different signal combinations
CREATE TABLE public.signal_pattern_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text NOT NULL,
  rounded_z_score numeric NOT NULL,
  rounded_sentiment_velocity numeric NOT NULL,
  signal_count integer NOT NULL DEFAULT 0,
  success_count_1h integer NOT NULL DEFAULT 0,
  success_count_3h integer NOT NULL DEFAULT 0,
  success_count_eod integer NOT NULL DEFAULT 0,
  success_rate_1h numeric GENERATED ALWAYS AS (
    CASE 
      WHEN signal_count > 0 THEN (success_count_1h::numeric / signal_count::numeric) * 100
      ELSE 0 
    END
  ) STORED,
  success_rate_3h numeric GENERATED ALWAYS AS (
    CASE 
      WHEN signal_count > 0 THEN (success_count_3h::numeric / signal_count::numeric) * 100
      ELSE 0 
    END
  ) STORED,
  success_rate_eod numeric GENERATED ALWAYS AS (
    CASE 
      WHEN signal_count > 0 THEN (success_count_eod::numeric / signal_count::numeric) * 100
      ELSE 0 
    END
  ) STORED,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ticker, rounded_z_score, rounded_sentiment_velocity)
);

-- Add indexes for performance
CREATE INDEX idx_signal_pattern_stats_ticker ON public.signal_pattern_stats(ticker);
CREATE INDEX idx_signal_pattern_stats_success_rate_eod ON public.signal_pattern_stats(success_rate_eod DESC);
CREATE INDEX idx_signal_pattern_stats_success_rate_1h ON public.signal_pattern_stats(success_rate_1h DESC);
CREATE INDEX idx_signal_pattern_stats_success_rate_3h ON public.signal_pattern_stats(success_rate_3h DESC);
CREATE INDEX idx_signal_pattern_stats_signal_count ON public.signal_pattern_stats(signal_count DESC);
CREATE INDEX idx_signal_pattern_stats_last_updated ON public.signal_pattern_stats(last_updated);

-- Enable RLS on the pattern stats table
ALTER TABLE public.signal_pattern_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for service role access (same pattern as other system tables)
CREATE POLICY "Service role can manage signal pattern stats" ON public.signal_pattern_stats
  FOR ALL USING (true);
