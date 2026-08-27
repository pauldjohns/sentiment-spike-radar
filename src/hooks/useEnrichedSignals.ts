
// Main hook that orchestrates all enriched signals functionality
import { useEnrichedSignalsData } from './enriched-signals/useEnrichedSignalsData';
import { useEnrichedSignalsStats } from './enriched-signals/useEnrichedSignalsStats';
import { useEnrichedSignalsMutations } from './enriched-signals/useEnrichedSignalsMutations';
import { useEnrichedSignalsAnalysis } from './enriched-signals/useEnrichedSignalsAnalysis';

export const useEnrichedSignals = () => {
  const {
    enrichedSignals,
    isLoading,
    error,
    fetchEnrichedSignals,
    clearError
  } = useEnrichedSignalsData();

  const { stats, fetchStats } = useEnrichedSignalsStats();

  const {
    createEnrichedSignal,
    updateSignalConfidence
  } = useEnrichedSignalsMutations(fetchEnrichedSignals, fetchStats);

  const {
    evaluateSignalSuccess,
    analyzeSignalPatterns,
    logLearningData,
    exportLearningData
  } = useEnrichedSignalsAnalysis(fetchEnrichedSignals, fetchStats);

  return {
    // Data
    enrichedSignals,
    stats,
    isLoading,
    error,
    
    // Data fetching
    fetchEnrichedSignals,
    fetchStats,
    
    // Mutations
    createEnrichedSignal,
    updateSignalConfidence,
    
    // Analysis
    evaluateSignalSuccess,
    analyzeSignalPatterns,
    logLearningData,
    exportLearningData,
    
    // Utilities
    clearError
  };
};

// Re-export types for backward compatibility
export type { EnrichmentStats } from './enriched-signals/useEnrichedSignalsStats';
