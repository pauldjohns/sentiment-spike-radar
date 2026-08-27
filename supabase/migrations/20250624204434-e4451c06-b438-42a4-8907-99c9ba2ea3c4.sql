
-- Add time_window field to signal_logs table
ALTER TABLE signal_logs ADD COLUMN IF NOT EXISTS time_window text;

-- Create index for better query performance on time_window
CREATE INDEX IF NOT EXISTS idx_signal_logs_time_window ON signal_logs(time_window);

-- Update existing records to have a default time_window value
UPDATE signal_logs 
SET time_window = 'market_hours' 
WHERE time_window IS NULL;
