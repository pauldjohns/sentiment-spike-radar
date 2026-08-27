
import { useMemo } from 'react';

export interface DataValidationResult {
  isLiveData: boolean;
  isSimulated: boolean;
  hasReplayData: boolean;
  dataSourceSummary: {
    liveCount: number;
    simulatedCount: number;
    totalCount: number;
  };
}

export const useDataSourceValidation = (signals: any[]): DataValidationResult => {
  return useMemo(() => {
    const liveSignals = signals.filter(s => !s.is_simulated && s.source !== 'replay');
    const simulatedSignals = signals.filter(s => s.is_simulated || s.source === 'replay');
    
    return {
      isLiveData: liveSignals.length > 0,
      isSimulated: simulatedSignals.length > 0,
      hasReplayData: signals.some(s => s.source === 'replay' || s.replay_batch_id),
      dataSourceSummary: {
        liveCount: liveSignals.length,
        simulatedCount: simulatedSignals.length,
        totalCount: signals.length
      }
    };
  }, [signals]);
};
