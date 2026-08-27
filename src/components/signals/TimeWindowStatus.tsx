
import React, { useMemo } from 'react';
import { TimeWindowCard } from './TimeWindowCard';

interface GroupedSignals {
  [key: string]: any[];
}

interface TimeWindowStatusProps {
  groupedSignals: GroupedSignals;
}

export const TimeWindowStatus = React.memo(({ groupedSignals }: TimeWindowStatusProps) => {
  const timeWindows = useMemo(() => [
    { key: 'pre_market', label: 'Pre-Market', time: '9:00 AM ET', color: 'text-purple-400' },
    { key: 'market_open', label: 'Market Open', time: '9:30 AM ET', color: 'text-green-400' },
    { key: 'plus_30_min', label: '+30 Min', time: '10:00 AM ET', color: 'text-blue-400' },
    { key: 'plus_1_hr', label: '+60 Min', time: '10:30 AM ET', color: 'text-orange-400' }
  ], []);

  const renderedTimeWindowCards = useMemo(() => {
    return timeWindows.map(window => (
      <TimeWindowCard
        key={window.key}
        window={window}
        signalCount={groupedSignals[window.key]?.length || 0}
      />
    ));
  }, [timeWindows, groupedSignals]);

  return (
    <div className="mb-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
      <div className="text-sm text-slate-300 mb-2">
        <strong>Today's Signal Distribution:</strong>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {renderedTimeWindowCards}
      </div>
    </div>
  );
});

TimeWindowStatus.displayName = 'TimeWindowStatus';
