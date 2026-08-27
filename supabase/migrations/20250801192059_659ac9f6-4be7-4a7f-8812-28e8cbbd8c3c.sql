-- Fix the search_path issue in the newly created function
CREATE OR REPLACE FUNCTION extract_signal_date(signal_detected_at timestamp with time zone)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT signal_detected_at::date;
$$;