
-- Add move_probability_score column to ticker_sentiment table
ALTER TABLE ticker_sentiment 
ADD COLUMN IF NOT EXISTS move_probability_score INTEGER DEFAULT 0;

-- Add comment to document the column
COMMENT ON COLUMN ticker_sentiment.move_probability_score IS 'Probability score (0-100) for 10% intraday move prediction';
