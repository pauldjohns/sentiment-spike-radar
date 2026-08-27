-- Add a unique constraint to prevent duplicate ticker selections per day
-- First, create a function to extract date from signal_detected_at
CREATE OR REPLACE FUNCTION extract_signal_date(signal_detected_at timestamp with time zone)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT signal_detected_at::date;
$$;

-- Create a unique index to prevent duplicate tickers per day
-- This allows the same ticker to appear across different days but not within the same day
CREATE UNIQUE INDEX idx_enriched_signals_unique_ticker_per_day 
ON enriched_signals (ticker, extract_signal_date(signal_detected_at))
WHERE source != 'replay' AND (is_simulated IS NULL OR is_simulated = false);

-- Add a comment explaining the constraint
COMMENT ON INDEX idx_enriched_signals_unique_ticker_per_day IS 
'Ensures each ticker can only be selected once per day for live signals (excludes replay and simulated signals)';