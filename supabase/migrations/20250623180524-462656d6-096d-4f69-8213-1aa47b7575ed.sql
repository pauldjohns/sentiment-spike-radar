
-- Add a new column to track when each ticker was last processed/checked
ALTER TABLE ticker_sentiment 
ADD COLUMN last_checked_at timestamp with time zone DEFAULT now();

-- Update existing records to have the same value as last_updated initially
UPDATE ticker_sentiment 
SET last_checked_at = last_updated 
WHERE last_checked_at IS NULL;

-- Create an index for better performance on queries filtering by last_checked_at
CREATE INDEX IF NOT EXISTS idx_ticker_sentiment_last_checked_at 
ON ticker_sentiment(last_checked_at);
