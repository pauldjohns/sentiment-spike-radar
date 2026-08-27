-- PHASE 2: Clean Up Data Inconsistencies 
-- Risk mitigation: Clear stale failure_reason fields from completed enrichments
-- Risk Level: LOW - Data cleanup only, no schema changes

-- Clear failure reasons from successfully completed enrichments
UPDATE enriched_signals 
SET failure_reason = NULL 
WHERE price_metadata_status = 'complete' 
  AND failure_reason IS NOT NULL;

-- Add comment for audit trail
COMMENT ON COLUMN enriched_signals.failure_reason IS 'Error details for failed enrichments. Should be NULL for completed enrichments.';