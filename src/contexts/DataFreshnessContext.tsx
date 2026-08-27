
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type DataFreshness = 'fresh' | 'moderate' | 'stale';

interface DataFreshnessContextType {
  lastIngestionRun: Date | null;
  isIngesting: boolean;
  isJobRunning: boolean; // New stable job-level flag
  dataFreshness: DataFreshness;
  setIngestionStatus: (status: boolean) => void;
  setJobRunning: (running: boolean) => void; // New setter for job status
  updateIngestionTimestamp: (timestamp: Date) => void;
  triggerDataRefresh: number;
  triggerRefresh: () => void;
}

const DataFreshnessContext = createContext<DataFreshnessContextType | undefined>(undefined);

export const DataFreshnessProvider = ({ children }: { children: ReactNode }) => {
  const [lastIngestionRun, setLastIngestionRun] = useState<Date | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isJobRunning, setIsJobRunning] = useState(false); // New stable job status
  const [triggerDataRefresh, setTriggerDataRefresh] = useState(0);

  const calculateDataFreshness = useCallback((timestamp: Date | null): DataFreshness => {
    if (!timestamp) return 'stale';
    
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffMinutes <= 3) return 'fresh';
    if (diffMinutes <= 8) return 'moderate';
    return 'stale';
  }, []);

  const dataFreshness = calculateDataFreshness(lastIngestionRun);

  const setIngestionStatus = useCallback((status: boolean) => {
    setIsIngesting(status);
  }, []);

  const setJobRunning = useCallback((running: boolean) => {
    setIsJobRunning(running);
    
    // When job completes, also clear the ingesting flag
    if (!running) {
      setIsIngesting(false);
    }
  }, []);

  const updateIngestionTimestamp = useCallback((timestamp: Date) => {
    setLastIngestionRun(timestamp);
    setTriggerDataRefresh(prev => prev + 1);
  }, []);

  const triggerRefresh = useCallback(() => {
    setTriggerDataRefresh(prev => prev + 1);
  }, []);

  return (
    <DataFreshnessContext.Provider
      value={{
        lastIngestionRun,
        isIngesting,
        isJobRunning,
        dataFreshness,
        setIngestionStatus,
        setJobRunning,
        updateIngestionTimestamp,
        triggerDataRefresh,
        triggerRefresh,
      }}
    >
      {children}
    </DataFreshnessContext.Provider>
  );
};

export const useDataFreshness = () => {
  const context = useContext(DataFreshnessContext);
  if (context === undefined) {
    throw new Error('useDataFreshness must be used within a DataFreshnessProvider');
  }
  return context;
};
