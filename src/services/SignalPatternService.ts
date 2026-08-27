
import { supabase } from '@/integrations/supabase/client';

export interface SignalPattern {
  id: string;
  ticker: string;
  rounded_z_score: number;
  rounded_sentiment_velocity: number;
  signal_count: number;
  success_count_1h: number;
  success_count_3h: number;
  success_count_eod: number;
  success_rate_1h: number | null;
  success_rate_3h: number | null;
  success_rate_eod: number | null;
  last_updated: string;
  created_at: string;
}

export interface PatternAnalysisResult {
  success: boolean;
  patterns_processed?: number;
  total_signals_analyzed?: number;
  unique_patterns_found?: number;
  errors?: string[];
  message?: string;
  error?: string;
}

export class SignalPatternService {
  /**
   * Trigger pattern analysis to update signal pattern statistics
   */
  static async analyzePatterns(options?: {
    force_refresh?: boolean;
    ticker_filter?: string;
    success_threshold?: number;
  }): Promise<PatternAnalysisResult> {
    try {
      console.log('🔍 FRONTEND: Triggering signal pattern analysis');
      console.log('📊 FRONTEND: Options:', options);

      const requestBody = options || {};

      const { data, error } = await supabase.functions.invoke(
        'analyze-signal-patterns',
        {
          body: requestBody
        }
      );

      console.log('📥 FRONTEND: Pattern analysis response');
      console.log('✅ FRONTEND: Data:', data);
      console.log('❌ FRONTEND: Error:', error);

      if (error) {
        console.error('❌ FRONTEND: Error calling analyze-signal-patterns function:', error);
        return { success: false, error: error.message };
      }

      return data || { success: false, error: 'No response data' };

    } catch (error) {
      console.error('❌ FRONTEND: Pattern analysis service error:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Get signal patterns with filtering and sorting options
   */
  static async getSignalPatterns(filters?: {
    ticker?: string;
    min_signal_count?: number;
    min_success_rate_eod?: number;
    limit?: number;
    sort_by?: 'success_rate_eod' | 'success_rate_1h' | 'success_rate_3h' | 'signal_count';
    sort_desc?: boolean;
  }): Promise<SignalPattern[]> {
    try {
      let query = supabase
        .from('signal_pattern_stats')
        .select('*');

      if (filters?.ticker) {
        query = query.eq('ticker', filters.ticker);
      }

      if (filters?.min_signal_count) {
        query = query.gte('signal_count', filters.min_signal_count);
      }

      if (filters?.min_success_rate_eod) {
        query = query.gte('success_rate_eod', filters.min_success_rate_eod);
      }

      if (filters?.sort_by) {
        query = query.order(filters.sort_by, { ascending: !filters.sort_desc });
      } else {
        query = query.order('success_rate_eod', { ascending: false });
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ ERROR fetching signal patterns:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ GET SIGNAL PATTERNS ERROR:', error);
      return [];
    }
  }

  /**
   * Get top performing patterns by ticker
   */
  static async getTopPatternsByTicker(ticker: string, limit: number = 5): Promise<SignalPattern[]> {
    return this.getSignalPatterns({
      ticker,
      min_signal_count: 3, // Only patterns with at least 3 signals
      limit,
      sort_by: 'success_rate_eod',
      sort_desc: true
    });
  }

  /**
   * Get pattern performance summary
   */
  static async getPatternSummary(): Promise<{
    total_patterns: number;
    patterns_with_high_success: number;
    avg_success_rate_eod: number;
    top_ticker: string | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('signal_pattern_stats')
        .select('ticker, signal_count, success_rate_eod')
        .gte('signal_count', 2); // Only patterns with at least 2 signals

      if (error) {
        console.error('❌ ERROR fetching pattern summary:', error);
        return {
          total_patterns: 0,
          patterns_with_high_success: 0,
          avg_success_rate_eod: 0,
          top_ticker: null
        };
      }

      const patterns = data || [];
      const total_patterns = patterns.length;
      const patterns_with_high_success = patterns.filter(p => p.success_rate_eod >= 60).length;
      const avg_success_rate_eod = patterns.length > 0 
        ? patterns.reduce((sum, p) => sum + p.success_rate_eod, 0) / patterns.length 
        : 0;

      // Find ticker with most high-performing patterns
      const tickerCounts = patterns
        .filter(p => p.success_rate_eod >= 60)
        .reduce((acc, p) => {
          acc[p.ticker] = (acc[p.ticker] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const top_ticker = Object.keys(tickerCounts).length > 0
        ? Object.entries(tickerCounts).sort(([,a], [,b]) => b - a)[0][0]
        : null;

      return {
        total_patterns,
        patterns_with_high_success,
        avg_success_rate_eod: Math.round(avg_success_rate_eod * 100) / 100,
        top_ticker
      };
    } catch (error) {
      console.error('❌ PATTERN SUMMARY ERROR:', error);
      return {
        total_patterns: 0,
        patterns_with_high_success: 0,
        avg_success_rate_eod: 0,
        top_ticker: null
      };
    }
  }
}
