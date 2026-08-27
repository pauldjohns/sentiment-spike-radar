
-- Create table to track stock prices for anomalous equities
CREATE TABLE public.stock_price_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  flagged_at TIMESTAMP WITH TIME ZONE NOT NULL,
  flag_reason TEXT NOT NULL,
  predicted_direction TEXT NOT NULL CHECK (predicted_direction IN ('bullish', 'bearish')),
  price_at_flag NUMERIC(10, 2),
  price_1h_after NUMERIC(10, 2),
  price_4h_after NUMERIC(10, 2),
  price_24h_after NUMERIC(10, 2),
  actual_direction TEXT CHECK (actual_direction IN ('up', 'down', 'flat')),
  accuracy_score NUMERIC(3, 2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to track overall application accuracy metrics
CREATE TABLE public.accuracy_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_predictions INTEGER NOT NULL DEFAULT 0,
  correct_predictions INTEGER NOT NULL DEFAULT 0,
  accuracy_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  bullish_predictions INTEGER NOT NULL DEFAULT 0,
  bullish_correct INTEGER NOT NULL DEFAULT 0,
  bearish_predictions INTEGER NOT NULL DEFAULT 0,
  bearish_correct INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date)
);

-- Create indexes for better performance
CREATE INDEX idx_stock_price_tracking_ticker ON public.stock_price_tracking(ticker);
CREATE INDEX idx_stock_price_tracking_flagged_at ON public.stock_price_tracking(flagged_at);
CREATE INDEX idx_accuracy_metrics_date ON public.accuracy_metrics(date);

-- Enable RLS (no policies needed since this is system data)
ALTER TABLE public.stock_price_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accuracy_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (no authentication required)
CREATE POLICY "Allow public read access to stock price tracking" 
  ON public.stock_price_tracking 
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Allow public read access to accuracy metrics" 
  ON public.accuracy_metrics 
  FOR SELECT 
  TO public 
  USING (true);
