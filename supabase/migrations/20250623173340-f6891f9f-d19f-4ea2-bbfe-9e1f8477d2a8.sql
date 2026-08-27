
-- First, let's add the missing time_weight column to the ticker_sentiment table
-- This will fix the schema mismatch causing the ingestion failures
ALTER TABLE public.ticker_sentiment 
ADD COLUMN time_weight NUMERIC DEFAULT 1.0;

-- Create an index for better performance on time-based queries
CREATE INDEX IF NOT EXISTS idx_ticker_sentiment_time_weight 
ON public.ticker_sentiment(time_weight);

-- Update the stock_price_tracking table to ensure we have proper constraints
ALTER TABLE public.stock_price_tracking 
ADD CONSTRAINT check_predicted_direction 
CHECK (predicted_direction IN ('bullish', 'bearish'));

ALTER TABLE public.stock_price_tracking 
ADD CONSTRAINT check_actual_direction 
CHECK (actual_direction IS NULL OR actual_direction IN ('up', 'down', 'flat'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stock_price_tracking_flagged_at 
ON public.stock_price_tracking(flagged_at);

CREATE INDEX IF NOT EXISTS idx_stock_price_tracking_ticker_flagged 
ON public.stock_price_tracking(ticker, flagged_at);

-- Enable real-time updates for stock price tracking
ALTER TABLE public.stock_price_tracking REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_price_tracking;

-- Create a function to automatically update price tracking records
CREATE OR REPLACE FUNCTION update_price_tracking_record(
  tracking_id UUID,
  new_price NUMERIC,
  hours_after INTEGER
) RETURNS VOID AS $$
DECLARE
  record_data RECORD;
  price_change NUMERIC;
  direction TEXT;
BEGIN
  -- Get the original record
  SELECT * INTO record_data FROM stock_price_tracking WHERE id = tracking_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate price change percentage
  IF record_data.price_at_flag IS NOT NULL AND record_data.price_at_flag > 0 THEN
    price_change := ((new_price - record_data.price_at_flag) / record_data.price_at_flag) * 100;
    
    -- Determine actual direction based on price change
    IF price_change >= 1.0 THEN
      direction := 'up';
    ELSIF price_change <= -1.0 THEN
      direction := 'down';
    ELSE
      direction := 'flat';
    END IF;
    
    -- Update the appropriate price column based on hours_after
    IF hours_after = 1 THEN
      UPDATE stock_price_tracking 
      SET price_1h_after = new_price,
          actual_direction = direction,
          updated_at = now()
      WHERE id = tracking_id;
    ELSIF hours_after = 4 THEN
      UPDATE stock_price_tracking 
      SET price_4h_after = new_price,
          actual_direction = direction,
          updated_at = now()
      WHERE id = tracking_id;
    ELSIF hours_after = 24 THEN
      UPDATE stock_price_tracking 
      SET price_24h_after = new_price,
          actual_direction = direction,
          updated_at = now()
      WHERE id = tracking_id;
      
      -- Calculate accuracy score for 24h predictions
      UPDATE stock_price_tracking 
      SET accuracy_score = CASE 
        WHEN (predicted_direction = 'bullish' AND direction = 'up') OR 
             (predicted_direction = 'bearish' AND direction = 'down') THEN 1.0
        WHEN direction = 'flat' THEN 0.5
        ELSE 0.0
      END
      WHERE id = tracking_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;
