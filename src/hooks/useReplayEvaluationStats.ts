
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReplayEvaluationStats {
  totalSignals: number;
  successRates: {
    '1h': number;
    '3h': number;
    'eod': number;
  };
  avgChanges: {
    '1h': number;
    '3h': number;
    'eod': number;
  };
  tickerPerformance: Array<{
    ticker: string;
    totalSignals: number;
    successRate: number;
    avgChange: number;
  }>;
  timeWindowPerformance: Array<{
    timeWindow: string;
    totalSignals: number;
    successRate: number;
    avgChange: number;
  }>;
  sentimentTypePerformance: Array<{
    sentimentType: string;
    totalSignals: number;
    successRate: number;
    avgChange: number;
  }>;
}

export interface ReplayEvaluationFilters {
  replay_batch_id?: string;
  min_z_score?: number;
  sentiment_type?: string;
  time_window?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

export const useReplayEvaluationStats = () => {
  const [stats, setStats] = useState<ReplayEvaluationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (filters: ReplayEvaluationFilters = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📊 FETCHING REPLAY EVALUATION STATS:', filters);
      
      // Build query for evaluated replay signals
      let query = supabase
        .from('enriched_signals')
        .select(`
          ticker,
          time_window,
          sentiment_type,
          z_score,
          change_1h,
          change_3h,
          change_eod,
          success_1h,
          success_3h,
          success_eod,
          signal_detected_at,
          replay_batch_id
        `)
        .eq('source', 'replay')
        .eq('evaluation_status', 'complete');

      // Apply filters
      if (filters.replay_batch_id) {
        query = query.eq('replay_batch_id', filters.replay_batch_id);
      }
      if (filters.min_z_score) {
        query = query.gte('z_score', filters.min_z_score);
      }
      if (filters.sentiment_type) {
        query = query.eq('sentiment_type', filters.sentiment_type);
      }
      if (filters.time_window) {
        query = query.eq('time_window', filters.time_window);
      }
      if (filters.date_range) {
        query = query
          .gte('signal_detected_at', filters.date_range.start)
          .lte('signal_detected_at', filters.date_range.end);
      }

      const { data: signals, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch replay signals: ${error.message}`);
      }

      if (!signals || signals.length === 0) {
        console.log('ℹ️ NO EVALUATED REPLAY SIGNALS FOUND');
        setStats({
          totalSignals: 0,
          successRates: { '1h': 0, '3h': 0, 'eod': 0 },
          avgChanges: { '1h': 0, '3h': 0, 'eod': 0 },
          tickerPerformance: [],
          timeWindowPerformance: [],
          sentimentTypePerformance: []
        });
        return;
      }

      console.log(`📊 PROCESSING ${signals.length} EVALUATED SIGNALS`);

      // Calculate overall success rates
      const valid1h = signals.filter(s => s.success_1h !== null);
      const valid3h = signals.filter(s => s.success_3h !== null);
      const validEod = signals.filter(s => s.success_eod !== null);

      const success1h = signals.filter(s => s.success_1h === true).length;
      const success3h = signals.filter(s => s.success_3h === true).length;
      const successEod = signals.filter(s => s.success_eod === true).length;

      const successRates = {
        '1h': valid1h.length > 0 ? (success1h / valid1h.length) * 100 : 0,
        '3h': valid3h.length > 0 ? (success3h / valid3h.length) * 100 : 0,
        'eod': validEod.length > 0 ? (successEod / validEod.length) * 100 : 0
      };

      // Calculate average changes
      const avgChanges = {
        '1h': signals.reduce((sum, s) => sum + (s.change_1h || 0), 0) / signals.length,
        '3h': signals.reduce((sum, s) => sum + (s.change_3h || 0), 0) / signals.length,
        'eod': signals.reduce((sum, s) => sum + (s.change_eod || 0), 0) / signals.length
      };

      // Calculate ticker performance
      const tickerGroups = new Map();
      signals.forEach(signal => {
        const ticker = signal.ticker;
        if (!tickerGroups.has(ticker)) {
          tickerGroups.set(ticker, []);
        }
        tickerGroups.get(ticker).push(signal);
      });

      const tickerPerformance = Array.from(tickerGroups.entries()).map(([ticker, tickerSignals]) => {
        const validEodSignals = tickerSignals.filter((s: any) => s.success_eod !== null);
        const successCount = tickerSignals.filter((s: any) => s.success_eod === true).length;
        const avgChange = tickerSignals.reduce((sum: number, s: any) => sum + (s.change_eod || 0), 0) / tickerSignals.length;
        
        return {
          ticker,
          totalSignals: tickerSignals.length,
          successRate: validEodSignals.length > 0 ? (successCount / validEodSignals.length) * 100 : 0,
          avgChange
        };
      }).sort((a, b) => b.successRate - a.successRate);

      // Calculate time window performance
      const timeWindowGroups = new Map();
      signals.forEach(signal => {
        const timeWindow = signal.time_window || 'unknown';
        if (!timeWindowGroups.has(timeWindow)) {
          timeWindowGroups.set(timeWindow, []);
        }
        timeWindowGroups.get(timeWindow).push(signal);
      });

      const timeWindowPerformance = Array.from(timeWindowGroups.entries()).map(([timeWindow, windowSignals]) => {
        const validEodSignals = windowSignals.filter((s: any) => s.success_eod !== null);
        const successCount = windowSignals.filter((s: any) => s.success_eod === true).length;
        const avgChange = windowSignals.reduce((sum: number, s: any) => sum + (s.change_eod || 0), 0) / windowSignals.length;
        
        return {
          timeWindow,
          totalSignals: windowSignals.length,
          successRate: validEodSignals.length > 0 ? (successCount / validEodSignals.length) * 100 : 0,
          avgChange
        };
      }).sort((a, b) => b.successRate - a.successRate);

      // Calculate sentiment type performance
      const sentimentGroups = new Map();
      signals.forEach(signal => {
        const sentimentType = signal.sentiment_type || 'unknown';
        if (!sentimentGroups.has(sentimentType)) {
          sentimentGroups.set(sentimentType, []);
        }
        sentimentGroups.get(sentimentType).push(signal);
      });

      const sentimentTypePerformance = Array.from(sentimentGroups.entries()).map(([sentimentType, sentimentSignals]) => {
        const validEodSignals = sentimentSignals.filter((s: any) => s.success_eod !== null);
        const successCount = sentimentSignals.filter((s: any) => s.success_eod === true).length;
        const avgChange = sentimentSignals.reduce((sum: number, s: any) => sum + (s.change_eod || 0), 0) / sentimentSignals.length;
        
        return {
          sentimentType,
          totalSignals: sentimentSignals.length,
          successRate: validEodSignals.length > 0 ? (successCount / validEodSignals.length) * 100 : 0,
          avgChange
        };
      }).sort((a, b) => b.successRate - a.successRate);

      const calculatedStats: ReplayEvaluationStats = {
        totalSignals: signals.length,
        successRates,
        avgChanges,
        tickerPerformance,
        timeWindowPerformance,
        sentimentTypePerformance
      };

      setStats(calculatedStats);
      console.log('✅ REPLAY EVALUATION STATS CALCULATED:', calculatedStats);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch replay evaluation stats';
      setError(errorMessage);
      console.error('❌ REPLAY EVALUATION STATS ERROR:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exportResults = useCallback(async (filters: ReplayEvaluationFilters = {}, format: 'csv' | 'json' = 'csv') => {
    try {
      console.log('📊 EXPORTING REPLAY RESULTS:', { filters, format });
      
      const { data, error } = await supabase.functions.invoke('export-replay-results', {
        body: { ...filters, format }
      });

      if (error) {
        throw new Error(`Export failed: ${error.message}`);
      }

      console.log('✅ EXPORT SUCCESSFUL');
      return data;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export replay results';
      setError(errorMessage);
      console.error('❌ EXPORT ERROR:', err);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    stats,
    isLoading,
    error,
    fetchStats,
    exportResults,
    clearError
  };
};
