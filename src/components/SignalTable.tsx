
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Users } from 'lucide-react';

interface SignalDetail {
  id: string;
  ticker: string;
  signalType: string;
  confidence: 'high' | 'medium' | 'low';
  timestamp: Date;
  volumeRatio: number;
  sentimentChange: string;
  messageCount: number;
  userCount: number;
  rationale: string;
  disparityDetected?: boolean;
  anomalyScore?: number;
  timeWindow?: string;
}

interface GroupedSignals {
  [key: string]: SignalDetail[];
}

interface SignalTableProps {
  groupedSignals: GroupedSignals;
}

// ✅ FIXED: Updated time window configuration to match backend implementation
const TIME_WINDOW_CONFIG = {
  'pre_market': {
    label: 'Pre-Market Predictions (9:00 AM ET)',
    description: 'Signals captured during pre-market analysis',
    order: 1,
    captureTime: '9:00 AM ET'
  },
  'market_open': {
    label: 'Market Open Predictions (9:30 AM ET)', 
    description: 'Signals detected at market opening',
    order: 2,
    captureTime: '9:30 AM ET'
  },
  'plus_30_min': {
    label: '+30 Min Predictions (10:00 AM ET)',
    description: 'Signals detected 30 minutes after market open',
    order: 3,
    captureTime: '10:00 AM ET'
  },
  'plus_1_hr': {
    label: '+60 Min Predictions (10:30 AM ET)',
    description: 'Signals detected 1 hour after market open', 
    order: 4,
    captureTime: '10:30 AM ET'
  },
  // Legacy support for old time window names
  '30_min': {
    label: '+30 Min Predictions (10:00 AM ET)',
    description: 'Signals detected 30 minutes after market open',
    order: 3,
    captureTime: '10:00 AM ET'
  },
  '60_min': {
    label: '+60 Min Predictions (10:30 AM ET)',
    description: 'Signals detected 1 hour after market open', 
    order: 4,
    captureTime: '10:30 AM ET'
  },
  'market_hours': {
    label: 'Market Hours Predictions',
    description: 'Signals detected during regular market hours',
    order: 5,
    captureTime: 'Various times'
  }
};

// ✅ Type safety for time windows
type ValidTimeWindow = keyof typeof TIME_WINDOW_CONFIG;

export const SignalTable = ({ groupedSignals }: SignalTableProps) => {
  const getConfidenceBadgeVariant = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getTimeWindowInfo = (timeWindow: string) => {
    return TIME_WINDOW_CONFIG[timeWindow as ValidTimeWindow] || 
           { 
             label: `${timeWindow.replace('_', ' ').toUpperCase()} Predictions`, 
             description: 'Signals detected during market hours', 
             order: 999,
             captureTime: 'Unknown'
           };
  };

  const getSortedTimeWindows = () => {
    return Object.keys(groupedSignals).sort((a, b) => {
      const orderA = TIME_WINDOW_CONFIG[a as ValidTimeWindow]?.order || 999;
      const orderB = TIME_WINDOW_CONFIG[b as ValidTimeWindow]?.order || 999;
      return orderA - orderB;
    });
  };

  // ✅ Helper function to get the earliest signal timestamp for display
  const getEarliestSignalTime = (signals: SignalDetail[]) => {
    if (signals.length === 0) return null;
    return signals.reduce((earliest, signal) => 
      signal.timestamp < earliest ? signal.timestamp : earliest, 
      signals[0].timestamp
    );
  };


  if (getSortedTimeWindows().length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <div className="space-y-2">
          <div>No signals detected for today.</div>
          <div className="text-sm">
            Predictions will appear during the following time windows:
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
            <div className="flex items-center space-x-2">
              <Clock className="h-3 w-3 text-purple-400" />
              <span>Pre-Market (9:00 AM ET)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-3 w-3 text-green-400" />
              <span>Market Open (9:30 AM ET)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-3 w-3 text-blue-400" />
              <span>+30 Minutes (10:00 AM ET)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-3 w-3 text-orange-400" />
              <span>+60 Minutes (10:30 AM ET)</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {getSortedTimeWindows().map((timeWindow) => {
        const timeWindowInfo = getTimeWindowInfo(timeWindow);
        const windowSignals = groupedSignals[timeWindow] || [];
        
        // Show all signals from the database
        const filteredSignals = windowSignals;
        const earliestSignal = getEarliestSignalTime(filteredSignals);
        
        return (
          <div key={timeWindow} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-white mb-1">
                  {timeWindowInfo.label}
                </h4>
                <div className="space-y-1">
                  <p className="text-sm text-slate-400">
                    {timeWindowInfo.description} • {filteredSignals.length} signal{filteredSignals.length !== 1 ? 's' : ''} detected
                    {filteredSignals.length === 10 && ' (max reached)'}
                  </p>
                  {/* ✅ NEW: Show actual capture time from signal data */}
                  {earliestSignal && (
                    <p className="text-xs text-slate-500">
                      Captured at: {earliestSignal.toLocaleTimeString('en-US', {
                        timeZone: 'America/New_York',
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZoneName: 'short'
                      })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-slate-300">
                  {timeWindow.replace('_', ' ').toUpperCase()}
                </Badge>
                {/* ✅ Time window indicator with color coding */}
                <div className={`h-2 w-2 rounded-full ${
                  timeWindow === 'pre_market' ? 'bg-purple-400' :
                  timeWindow === 'market_open' ? 'bg-green-400' :
                  timeWindow === 'plus_30_min' || timeWindow === '30_min' ? 'bg-blue-400' :
                  timeWindow === 'plus_1_hr' || timeWindow === '60_min' ? 'bg-orange-400' :
                  'bg-slate-400'
                }`}></div>
              </div>
            </div>

            <div className="space-y-3">
              {filteredSignals.map((signal) => (
                <div key={signal.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <h5 className="text-lg font-bold text-white">{signal.ticker}</h5>
                      <Badge variant={getConfidenceBadgeVariant(signal.confidence)}>
                        {signal.confidence.toUpperCase()}
                      </Badge>
                      {signal.disparityDetected && (
                        <Badge variant="destructive" className="text-white">
                          SENTIMENT DISPARITY
                        </Badge>
                      )}
                      {signal.anomalyScore && signal.anomalyScore > 70 && (
                        <Badge variant="default" className="bg-yellow-600 text-white">
                          HIGH ANOMALY: {signal.anomalyScore.toFixed(0)}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-slate-400">
                      <Clock className="h-4 w-4" />
                      <span>{signal.timestamp.toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-2">
                    <div className="space-y-1">
                      <div className="text-xs text-slate-400">Volume Spike</div>
                      <div className="text-sm font-medium text-blue-400">
                        {signal.volumeRatio.toFixed(1)}x baseline
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-xs text-slate-400">Sentiment Change</div>
                      <div className="text-sm font-medium text-green-400">
                        {signal.sentimentChange}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-xs text-slate-400">Messages/Users</div>
                      <div className="text-sm font-medium text-yellow-400 flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {signal.messageCount}/{signal.userCount}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-300 bg-slate-800/30 rounded p-2">
                    <strong>Detection Rationale:</strong> {signal.rationale}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
