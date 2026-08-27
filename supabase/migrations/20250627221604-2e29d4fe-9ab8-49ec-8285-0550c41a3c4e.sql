
-- Rollback: Remove the INSERT policy that was added in Option 1
DROP POLICY IF EXISTS "Allow authenticated users to insert enriched signals" ON public.enriched_signals;
