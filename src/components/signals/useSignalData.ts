import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  entryReason?: string;
  messageVolume?: number;
  bullishSentiment?: number;
  messageConcentration?: number;
  disparityDetected?: boolean;
  anomalyScore?: number;
  timeWindow?: string;
}

interface GroupedSignals {
  [key: string]: SignalDetail[];
}

export const useSignalData = () => {
  const [signals, setSignals] = useState<SignalDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTodaysSignals = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: signalLogs, error: signalError } = await supabase
        .from('signal_logs')
        .select('*')
        .gte('signal_timestamp', today.toISOString())
        .order('signal_timestamp', { ascending: false });

      if (signalError) throw signalError;

      if (!signalLogs || signalLogs.length === 0) {
        setSignals([]);
        return;
      }

      const enrichedSignals: SignalDetail[] = signalLogs.map(signal => {
        const confidence: 'high' | 'medium' | 'low' = 
          signal.signal_confidence === 'high' || 
          signal.signal_confidence === 'medium' || 
          signal.signal_confidence === 'low' 
            ? signal.signal_confidence 
            : 'medium';
        
        return {
          id: signal.id,
          ticker: signal.ticker,
          signalType: signal.signal_type || 'anomaly_detection',
          confidence,
          timestamp: new Date(signal.signal_timestamp),
          volumeRatio: signal.volume_anomaly_score ? signal.volume_anomaly_score / 10 : 1.0,
          sentimentChange: signal.sentiment_shift_percent ? 
            `${signal.sentiment_shift_percent > 0 ? '+' : ''}${signal.sentiment_shift_percent.toFixed(1)}%` : 'N/A',
          messageCount: signal.message_volume || 0,
          userCount: signal.user_diversity_score || 0,
          rationale: signal.entry_reason || 'Multi-factor anomaly detected',
          entryReason: signal.entry_reason,
          messageVolume: signal.message_volume,
          bullishSentiment: signal.bullish_sentiment,
          messageConcentration: signal.message_concentration,
          disparityDetected: signal.disparity_detected || false,
          anomalyScore: signal.anomaly_score,
          timeWindow: signal.time_window || 'market_hours'
        };
      });

      setSignals(enrichedSignals);
    } catch (error) {
      console.error('Error fetching signal details:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const groupSignalsByTimeWindow = useCallback((
    signals: SignalDetail[],
    confidenceFilter: string,
    disparityFilter: string
  ): GroupedSignals => {
    let filtered = signals;

    if (confidenceFilter !== 'all') {
      filtered = filtered.filter(s => s.confidence === confidenceFilter);
    }

    if (disparityFilter === 'disparity_only') {
      filtered = filtered.filter(s => s.disparityDetected);
    } else if (disparityFilter === 'no_disparity') {
      filtered = filtered.filter(s => !s.disparityDetected);
    }

    return filtered.reduce((acc: GroupedSignals, signal) => {
      const timeWindow = signal.timeWindow || 'market_hours';
      if (!acc[timeWindow]) {
        acc[timeWindow] = [];
      }
      // Keep max 10 signals per time window for UI performance
      if (acc[timeWindow].length < 10) {
        acc[timeWindow].push(signal);
      }
      return acc;
    }, {});
  }, []);

  return {
    signals,
    isLoading,
    fetchTodaysSignals,
    groupSignalsByTimeWindow
  };
};
