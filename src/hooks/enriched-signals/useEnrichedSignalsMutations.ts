
import { useCallback } from 'react';
import { SignalEnrichmentMutations } from '@/services/SignalEnrichmentService';

export const useEnrichedSignalsMutations = (
  refreshSignals: () => Promise<void>,
  refreshStats: () => Promise<void>
) => {
  const createEnrichedSignal = useCallback(async (signalData: {
    ticker: string;
    time_window?: string;
    signal_detected_at: Date;
    sentiment_type?: string;
    z_score?: number;
    sentiment_velocity?: number;
    message_volume?: number;
  }) => {
    try {
      const result = await SignalEnrichmentMutations.createEnrichedSignal(signalData);
      
      if (result.success) {
        // Refresh the signals list
        await refreshSignals();
        await refreshStats();
        
        if (result.is_simulated) {
          console.log('🧪 HOOK: Test signal created successfully (simulated)');
        } else {
          console.log('✅ HOOK: Live signal created successfully');
        }
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create enriched signal';
      return { success: false, error };
    }
  }, [refreshSignals, refreshStats]);

  const updateSignalConfidence = useCallback(async (options?: {
    signal_id?: string;
    batch_mode?: boolean;
    limit?: number;
  }) => {
    try {
      const result = await SignalEnrichmentMutations.updateSignalConfidence(options);
      
      if (result.success) {
        // Refresh the signals list to show updated confidence scores
        await refreshSignals();
        await refreshStats();
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update signal confidence';
      return { success: false, error };
    }
  }, [refreshSignals, refreshStats]);

  return {
    createEnrichedSignal,
    updateSignalConfidence
  };
};
