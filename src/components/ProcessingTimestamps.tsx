
import { Clock, DollarSign } from 'lucide-react';

interface ProcessingTimestampsProps {
  lastRun: Date | null;
  lastPriceUpdate: Date | null;
}

export const ProcessingTimestamps = ({ lastRun, lastPriceUpdate }: ProcessingTimestampsProps) => {
  if (!lastRun && !lastPriceUpdate) {
    return null;
  }

  return (
    <div className="flex flex-col space-y-1 text-xs text-slate-400">
      {lastRun && (
        <div className="flex items-center space-x-2">
          <Clock className="h-3 w-3" />
          <span>Last sentiment run: {lastRun.toLocaleTimeString()}</span>
        </div>
      )}
      {lastPriceUpdate && (
        <div className="flex items-center space-x-2">
          <DollarSign className="h-3 w-3" />
          <span>Last price update: {lastPriceUpdate.toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
};
