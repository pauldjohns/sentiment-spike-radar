-- Reset failed enrichments to pending for retry
UPDATE enriched_signals 
SET price_metadata_status = 'pending' 
WHERE price_metadata_status = 'failed';