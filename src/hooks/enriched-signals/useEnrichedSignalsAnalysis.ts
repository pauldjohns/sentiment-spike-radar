
import { useCallback } from 'react';
import { SignalAnalysisService, SignalLearningService } from '@/services/SignalEnrichmentService';

export const useEnrichedSignalsAnalysis = (
  refreshSignals: () => Promise<void>,
  refreshStats: () => Promise<void>
) => {
  const evaluateSignalSuccess = useCallback(async (options?: {
    signal_id?: string;
    batch_mode?: boolean;
    limit?: number;
  }) => {
    try {
      const result = await SignalAnalysisService.evaluateSignalSuccess(options);
      
      if (result.success) {
        // Refresh the signals list to show updated success evaluation data
        await refreshSignals();
        await refreshStats();
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to evaluate signal success';
      return { success: false, error };
    }
  }, [refreshSignals, refreshStats]);

  const analyzeSignalPatterns = useCallback(async (options?: {
    force_refresh?: boolean;
    ticker_filter?: string;
  }) => {
    try {
      const result = await SignalAnalysisService.analyzeSignalPatterns(options);
      
      if (result.success) {
        // Refresh signals and stats after successful analysis
        await refreshSignals();
        await refreshStats();
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to analyze signal patterns';
      return { success: false, error };
    }
  }, [refreshSignals, refreshStats]);

  const logLearningData = useCallback(async (options?: {
    enriched_signal_ids?: string[];
    batch_mode?: boolean;
    limit?: number;
  }) => {
    try {
      const result = await SignalLearningService.logSignalLearningData(options);
      
      if (result.success) {
        console.log(`✅ LEARNING LOG: ${result.logged_count || 0} entries logged`);
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to log learning data';
      return { success: false, error };
    }
  }, []);

  const exportLearningData = useCallback(async (options?: {
    format?: 'csv' | 'json';
    limit?: number;
    ticker?: string;
  }) => {
    try {
      const result = await SignalLearningService.exportLearningData(options);
      
      if (result.success && options?.format === 'csv') {
        // Trigger download for CSV format
        console.log('📥 CSV Export successful');
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to export learning data';
      return { success: false, error };
    }
  }, []);

  return {
    evaluateSignalSuccess,
    analyzeSignalPatterns,
    logLearningData,
    exportLearningData
  };
};
