
import { useState, useCallback } from 'react';
import { SignalPatternService, SignalPattern, PatternAnalysisResult } from '@/services/SignalPatternService';

export interface PatternFilters {
  ticker?: string;
  min_signal_count?: number;
  min_success_rate_eod?: number;
  limit?: number;
  sort_by?: 'success_rate_eod' | 'success_rate_1h' | 'success_rate_3h' | 'signal_count';
  sort_desc?: boolean;
}

export const useSignalPatterns = () => {
  const [patterns, setPatterns] = useState<SignalPattern[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPatterns = useCallback(async (filters?: PatternFilters) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const patternData = await SignalPatternService.getSignalPatterns(filters);
      setPatterns(patternData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch signal patterns');
      console.error('Error fetching signal patterns:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const analyzePatterns = useCallback(async (options?: {
    force_refresh?: boolean;
    ticker_filter?: string;
  }): Promise<PatternAnalysisResult> => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await SignalPatternService.analyzePatterns(options);
      
      if (result.success) {
        // Refresh patterns after successful analysis
        await fetchPatterns();
      } else {
        setError(result.error || 'Pattern analysis failed');
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to analyze patterns';
      setError(error);
      return { success: false, error };
    } finally {
      setIsAnalyzing(false);
    }
  }, [fetchPatterns]);

  const getTopPatterns = useCallback(async (ticker: string, limit: number = 5) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const topPatterns = await SignalPatternService.getTopPatternsByTicker(ticker, limit);
      return topPatterns;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch top patterns');
      console.error('Error fetching top patterns:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPatternSummary = useCallback(async () => {
    try {
      return await SignalPatternService.getPatternSummary();
    } catch (err) {
      console.error('Error fetching pattern summary:', err);
      return {
        total_patterns: 0,
        patterns_with_high_success: 0,
        avg_success_rate_eod: 0,
        top_ticker: null
      };
    }
  }, []);

  return {
    patterns,
    isLoading,
    isAnalyzing,
    error,
    fetchPatterns,
    analyzePatterns,
    getTopPatterns,
    getPatternSummary,
    clearError: () => setError(null)
  };
};
