
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Target } from 'lucide-react';
import { SignalFilterControls } from './SignalFilterControls';
import { CSVDownloadButton } from './CSVDownloadButton';
import { SignalTable } from './SignalTable';
import { TimeWindowStatus } from './signals/TimeWindowStatus';
import { useSignalData } from './signals/useSignalData';

export const SignalTransparencyPanel = React.memo(() => {
  const [groupedSignals, setGroupedSignals] = useState<any>({});
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [disparityFilter, setDisparityFilter] = useState<string>('all');

  const { signals, isLoading, fetchTodaysSignals, groupSignalsByTimeWindow } = useSignalData();

  const updateGroupedSignals = useCallback(() => {
    const grouped = groupSignalsByTimeWindow(signals, confidenceFilter, disparityFilter);
    setGroupedSignals(grouped);
  }, [signals, confidenceFilter, disparityFilter, groupSignalsByTimeWindow]);

  useEffect(() => {
    fetchTodaysSignals();
  }, [fetchTodaysSignals]);

  useEffect(() => {
    updateGroupedSignals();
  }, [updateGroupedSignals]);

  return (
    <Card className="p-6 bg-slate-800 border-slate-600">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Target className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Daily Signal Predictions by Time Window</h3>
        </div>
        
        <div className="flex items-center space-x-3">
          <SignalFilterControls
            confidenceFilter={confidenceFilter}
            disparityFilter={disparityFilter}
            onConfidenceFilterChange={setConfidenceFilter}
            onDisparityFilterChange={setDisparityFilter}
          />
          <CSVDownloadButton groupedSignals={groupedSignals} />
        </div>
      </div>

      <TimeWindowStatus groupedSignals={groupedSignals} />

      {isLoading ? (
        <div className="text-center py-8 text-slate-400">Loading daily signal predictions...</div>
      ) : (
        <SignalTable groupedSignals={groupedSignals} />
      )}
    </Card>
  );
});

SignalTransparencyPanel.displayName = 'SignalTransparencyPanel';
