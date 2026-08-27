
import { useState, useCallback } from 'react';
import { SignalEnrichmentClient, EnrichedSignal } from '@/services/SignalEnrichmentService';

export const useEnrichedSignalsData = () => {
  const [enrichedSignals, setEnrichedSignals] = useState<EnrichedSignal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrichedSignals = useCallback(async (filters?: {
    ticker?: string;
    status?: string;
    evaluation_status?: string;
    limit?: number;
    sort_by_confidence?: boolean;
    include_simulated?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const signals = await SignalEnrichmentClient.getEnrichedSignals(filters);
      
      // Sort by confidence score if requested (highest first)
      if (filters?.sort_by_confidence) {
        signals.sort((a, b) => {
          const scoreA = a.confidence_score || 0;
          const scoreB = b.confidence_score || 0;
          return scoreB - scoreA;
        });
      }
      
      setEnrichedSignals(signals);
      
      const includeSimulated = filters?.include_simulated;
      const dataType = includeSimulated ? 'all signals' : 'live signals only';
      console.log(`✅ HOOK: Fetched ${signals.length} enriched signals (${dataType})`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch enriched signals');
      console.error('Error fetching enriched signals:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    enrichedSignals,
    isLoading,
    error,
    fetchEnrichedSignals,
    clearError
  };
};
