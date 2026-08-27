-- Complete the remaining function search_path fixes
CREATE OR REPLACE FUNCTION public.update_daily_message_volume(p_ticker text, p_date date, p_message_count integer, p_bullish_ratio numeric DEFAULT 0.0, p_bearish_ratio numeric DEFAULT 0.0, p_neutral_ratio numeric DEFAULT 0.0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.message_volume_history (
    ticker, date, message_count, bullish_ratio, bearish_ratio, neutral_ratio, updated_at
  ) VALUES (
    p_ticker, p_date, p_message_count, p_bullish_ratio, p_bearish_ratio, p_neutral_ratio, NOW()
  )
  ON CONFLICT (ticker, date) 
  DO UPDATE SET 
    message_count = EXCLUDED.message_count,
    bullish_ratio = EXCLUDED.bullish_ratio,
    bearish_ratio = EXCLUDED.bearish_ratio,
    neutral_ratio = EXCLUDED.neutral_ratio,
    updated_at = NOW();
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_price_tracking_record(tracking_id uuid, new_price numeric, hours_after integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  record_data RECORD;
  price_change NUMERIC;
  direction TEXT;
BEGIN
  -- Get the original record
  SELECT * INTO record_data FROM public.stock_price_tracking WHERE id = tracking_id;
  
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
      UPDATE public.stock_price_tracking 
      SET price_1h_after = new_price,
          actual_direction = direction,
          updated_at = now()
      WHERE id = tracking_id;
    ELSIF hours_after = 4 THEN
      UPDATE public.stock_price_tracking 
      SET price_4h_after = new_price,
          actual_direction = direction,
          updated_at = now()
      WHERE id = tracking_id;
    ELSIF hours_after = 24 THEN
      UPDATE public.stock_price_tracking 
      SET price_24h_after = new_price,
          actual_direction = direction,
          updated_at = now()
      WHERE id = tracking_id;
      
      -- Calculate accuracy score for 24h predictions
      UPDATE public.stock_price_tracking 
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
$function$;

CREATE OR REPLACE FUNCTION public.calculate_daily_performance_metrics(target_date date DEFAULT CURRENT_DATE)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.signal_performance_metrics (
    date,
    config_version,
    total_signals,
    successful_signals,
    false_positives,
    pending_signals,
    accuracy_rate,
    avg_time_to_peak,
    high_confidence_signals,
    high_confidence_success_rate,
    volume_only_signals,
    sentiment_only_signals,
    combined_signals
  )
  SELECT 
    target_date,
    config_version,
    COUNT(*) as total_signals,
    COUNT(*) FILTER (WHERE outcome_achieved = true) as successful_signals,
    COUNT(*) FILTER (WHERE outcome_achieved = false) as false_positives,
    COUNT(*) FILTER (WHERE outcome_achieved IS NULL) as pending_signals,
    CASE 
      WHEN COUNT(*) FILTER (WHERE outcome_achieved IS NOT NULL) > 0 
      THEN (COUNT(*) FILTER (WHERE outcome_achieved = true)::NUMERIC / COUNT(*) FILTER (WHERE outcome_achieved IS NOT NULL)) * 100
      ELSE 0 
    END as accuracy_rate,
    AVG(time_to_peak) FILTER (WHERE outcome_achieved = true) as avg_time_to_peak,
    COUNT(*) FILTER (WHERE signal_confidence = 'high') as high_confidence_signals,
    CASE 
      WHEN COUNT(*) FILTER (WHERE signal_confidence = 'high' AND outcome_achieved IS NOT NULL) > 0 
      THEN (COUNT(*) FILTER (WHERE signal_confidence = 'high' AND outcome_achieved = true)::NUMERIC / COUNT(*) FILTER (WHERE signal_confidence = 'high' AND outcome_achieved IS NOT NULL)) * 100
      ELSE 0 
    END as high_confidence_success_rate,
    COUNT(*) FILTER (WHERE signal_type = 'volume_spike') as volume_only_signals,
    COUNT(*) FILTER (WHERE signal_type = 'sentiment_flip') as sentiment_only_signals,
    COUNT(*) FILTER (WHERE signal_type = 'combined_signal') as combined_signals
  FROM public.signal_logs 
  WHERE DATE(signal_timestamp) = target_date
  GROUP BY config_version
  ON CONFLICT (date, config_version) 
  DO UPDATE SET
    total_signals = EXCLUDED.total_signals,
    successful_signals = EXCLUDED.successful_signals,
    false_positives = EXCLUDED.false_positives,
    pending_signals = EXCLUDED.pending_signals,
    accuracy_rate = EXCLUDED.accuracy_rate,
    avg_time_to_peak = EXCLUDED.avg_time_to_peak,
    high_confidence_signals = EXCLUDED.high_confidence_signals,
    high_confidence_success_rate = EXCLUDED.high_confidence_success_rate,
    volume_only_signals = EXCLUDED.volume_only_signals,
    sentiment_only_signals = EXCLUDED.sentiment_only_signals,
    combined_signals = EXCLUDED.combined_signals,
    updated_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND role = 'admin' 
    AND approved = true
  );
$function$;