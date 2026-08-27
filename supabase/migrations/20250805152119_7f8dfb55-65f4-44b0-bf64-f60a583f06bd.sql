-- Create runtime_processing_state table for real-time signal processing state persistence
CREATE TABLE public.runtime_processing_state (
    ticker TEXT NOT NULL PRIMARY KEY,
    state TEXT NOT NULL CHECK (state IN ('processed', 'queued')),
    priority NUMERIC DEFAULT 0,
    anomaly_score NUMERIC DEFAULT 0,
    last_processed TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.runtime_processing_state ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to access runtime processing state
CREATE POLICY "Users can view runtime processing state" 
ON public.runtime_processing_state 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can modify runtime processing state" 
ON public.runtime_processing_state 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Create index for performance
CREATE INDEX idx_runtime_processing_state_updated_at ON public.runtime_processing_state(updated_at);
CREATE INDEX idx_runtime_processing_state_state ON public.runtime_processing_state(state);
CREATE INDEX idx_runtime_processing_state_priority ON public.runtime_processing_state(priority DESC);