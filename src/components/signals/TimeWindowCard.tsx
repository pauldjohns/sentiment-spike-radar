
import React from 'react';

interface TimeWindow {
  key: string;
  label: string;
  time: string;
  color: string;
}

interface TimeWindowCardProps {
  window: TimeWindow;
  signalCount: number;
}

export const TimeWindowCard = React.memo(({ window, signalCount }: TimeWindowCardProps) => {
  return (
    <div className="flex items-center justify-between p-2 bg-slate-800/30 rounded">
      <div>
        <div className={`font-medium ${window.color}`}>{window.label}</div>
        <div className="text-slate-500">{window.time}</div>
      </div>
      <div className={`text-sm font-bold ${
        signalCount > 0 ? 'text-green-400' : 'text-slate-500'
      }`}>
        {signalCount}
      </div>
    </div>
  );
});

TimeWindowCard.displayName = 'TimeWindowCard';
