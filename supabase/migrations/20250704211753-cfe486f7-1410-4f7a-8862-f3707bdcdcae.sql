-- Add daily price fields to enriched_signals table
ALTER TABLE public.enriched_signals
ADD COLUMN price_open DOUBLE PRECISION,
ADD COLUMN price_high DOUBLE PRECISION,
ADD COLUMN price_low DOUBLE PRECISION,
ADD COLUMN price_close DOUBLE PRECISION,
ADD COLUMN price_volume BIGINT;

-- Add index on price fields for better query performance
CREATE INDEX idx_enriched_signals_daily_prices ON public.enriched_signals(ticker, price_close, price_volume);

-- Add comment to document the schema change
COMMENT ON COLUMN public.enriched_signals.price_open IS 'Daily opening price from Finnhub candle data';
COMMENT ON COLUMN public.enriched_signals.price_high IS 'Daily high price from Finnhub candle data';
COMMENT ON COLUMN public.enriched_signals.price_low IS 'Daily low price from Finnhub candle data';
COMMENT ON COLUMN public.enriched_signals.price_close IS 'Daily closing price from Finnhub candle data';
COMMENT ON COLUMN public.enriched_signals.price_volume IS 'Daily trading volume from Finnhub candle data';