
-- Add INSERT policy for authenticated users to create test signals
CREATE POLICY "Allow authenticated users to insert enriched signals" 
  ON public.enriched_signals 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);
