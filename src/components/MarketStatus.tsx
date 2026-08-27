
import { Clock, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MarketStatusProps {
  isMarketOpen: boolean;
  marketStatus: {
    status: string;
    reason: string;
    nextOpen?: string;
    nextClose?: string;
  };
}

export const MarketStatus = ({ isMarketOpen, marketStatus }: MarketStatusProps) => {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour12: true,
    hour: 'numeric',
    minute: '2-digit'
  });

  return (
    <Card className="p-6 bg-slate-800 border-slate-600">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${isMarketOpen ? 'bg-green-600' : 'bg-red-600'}`}>
            {isMarketOpen ? <TrendingUp className="h-5 w-5 text-white" /> : <Clock className="h-5 w-5 text-white" />}
          </div>
          <div>
            <h3 className="font-semibold text-white">US Market Status</h3>
            <p className="text-sm text-slate-400">Eastern Time: {timeString}</p>
          </div>
        </div>
        
        <div className="text-right">
          <Badge className={isMarketOpen ? 'bg-green-600 hover:bg-green-600' : 'bg-red-600 hover:bg-red-600'}>
            {isMarketOpen ? 'OPEN' : 'CLOSED'}
          </Badge>
          <p className="text-xs text-slate-400 mt-1">
            {marketStatus.reason}
          </p>
        </div>
      </div>
    </Card>
  );
};
