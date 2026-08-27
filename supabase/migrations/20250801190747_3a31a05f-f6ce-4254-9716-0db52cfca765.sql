-- First, let's identify and remove duplicate signals keeping only the earliest one per ticker per day
-- Create a temporary view to identify duplicates
WITH duplicate_signals AS (
  SELECT 
    id,
    ticker,
    signal_detected_at,
    DATE(signal_detected_at) as signal_date,
    ROW_NUMBER() OVER (
      PARTITION BY ticker, DATE(signal_detected_at) 
      ORDER BY signal_detected_at ASC, created_at ASC
    ) as row_num
  FROM enriched_signals 
  WHERE source != 'replay' AND (is_simulated IS NULL OR is_simulated = false)
)
-- Delete duplicate signals (keeping the first one per ticker per day)
DELETE FROM enriched_signals 
WHERE id IN (
  SELECT id FROM duplicate_signals WHERE row_num > 1
);

-- Now create the unique constraint to prevent future duplicates
CREATE OR REPLACE FUNCTION extract_signal_date(signal_detected_at timestamp with time zone)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT signal_detected_at::date;
$$;

-- Create a unique index to prevent duplicate tickers per day
CREATE UNIQUE INDEX idx_enriched_signals_unique_ticker_per_day 
ON enriched_signals (ticker, extract_signal_date(signal_detected_at))
WHERE source != 'replay' AND (is_simulated IS NULL OR is_simulated = false);

-- Add a comment explaining the constraint
COMMENT ON INDEX idx_enriched_signals_unique_ticker_per_day IS 
'Ensures each ticker can only be selected once per day for live signals (excludes replay and simulated signals)';