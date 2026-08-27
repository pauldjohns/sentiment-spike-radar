-- Phase 1: Emergency Migration - Fix stuck signals and add failure tracking
-- Update all 'tracking' status signals to 'pending' so they can be reprocessed
UPDATE enriched_signals 
SET price_metadata_status = 'pending'
WHERE price_metadata_status = 'tracking';

-- Add failure_reason column to track specific error causes
ALTER TABLE enriched_signals 
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Add retry_count to prevent infinite retry loops
ALTER TABLE enriched_signals 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Add last_retry_at for better retry scheduling
ALTER TABLE enriched_signals 
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient retry queries
CREATE INDEX IF NOT EXISTS idx_enriched_signals_retry_status 
ON enriched_signals(price_metadata_status, retry_count, last_retry_at)
WHERE price_metadata_status IN ('pending', 'failed');

-- Add constraint to prevent excessive retries
ALTER TABLE enriched_signals 
ADD CONSTRAINT check_retry_count_limit 
CHECK (retry_count <= 5);