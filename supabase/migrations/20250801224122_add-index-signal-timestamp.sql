-- Add index on signal_logs.signal_timestamp for faster time-based queries
CREATE INDEX IF NOT EXISTS idx_signal_logs_signal_timestamp
ON public.signal_logs(signal_timestamp DESC);
