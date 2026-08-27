import { supabase } from '@/integrations/supabase/client';

export interface BacktestConfig {
  date_range: {
    start: string;
    end: string;
  };
  tickers: string[];
  min_z_score?: number;
  min_velocity?: number;
  batch_id?: string;
  run_name?: string;
  notes?: string;
}

export interface BacktestResult {
  success: boolean;
  batch_id: string;
  run_id: string;
  signals_replayed: number;
  date_range: {
    start: string;
    end: string;
  };
  filters: {
    min_z_score: number;
    min_velocity: number;
  };
  message: string;
  error?: string;
}

export interface BacktestRun {
  id: string;
  run_name: string | null;
  created_by: string | null;
  created_at: string;
  date_range: string | null;
  ticker_filter: string[] | null;
  min_z_score: number | null;
  min_velocity: number | null;
  notes: string | null;
  status: string;
  completed_at: string | null;
  signal_count?: number;
}

export interface ReplaySignalStats {
  total_signals: number;
  success_rate_1h: number;
  success_rate_3h: number;
  success_rate_eod: number;
  avg_change_1h: number;
  avg_change_3h: number;
  avg_change_eod: number;
  best_performing_ticker: string;
  worst_performing_ticker: string;
}

export class BacktestingService {
  
  static async replayHistoricalSignals(config: BacktestConfig): Promise<BacktestResult> {
    try {
      console.log('🔄 BACKTESTING: Starting historical signal replay...');
      
      const { data, error } = await supabase.functions.invoke('replay-historical-signals', {
        body: config
      });

      if (error) {
        throw new Error(`Backtest function error: ${error.message}`);
      }

      console.log('✅ BACKTESTING: Historical replay completed');
      return data;
      
    } catch (error) {
      console.error('❌ BACKTESTING ERROR:', error);
      throw error;
    }
  }

  static async crawlAndReplaySignals(config: {
    tickers: string[];
    start_date: string;
    end_date: string;
    min_z_score?: number;
    min_velocity?: number;
    batch_size?: number;
    run_name?: string;
    notes?: string;
  }): Promise<any> {
    try {
      console.log('📡 CRAWL-REPLAY: Starting historical crawl and replay...');
      
      const { data, error } = await supabase.functions.invoke('crawl-and-replay-signals', {
        body: config
      });

      if (error) {
        throw new Error(`Crawl and replay function error: ${error.message}`);
      }

      console.log('✅ CRAWL-REPLAY: Historical crawl completed');
      return data;
      
    } catch (error) {
      console.error('❌ CRAWL-REPLAY ERROR:', error);
      throw error;
    }
  }

  static async getReplaySignals(batch_id?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('enriched_signals')
        .select('*')
        .eq('source', 'replay')
        .order('signal_detected_at', { ascending: false });

      if (batch_id) {
        query = query.eq('replay_batch_id', batch_id);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch replay signals: ${error.message}`);
      }

      return data || [];
      
    } catch (error) {
      console.error('❌ REPLAY SIGNALS FETCH ERROR:', error);
      throw error;
    }
  }

  static async getBacktestRuns(): Promise<BacktestRun[]> {
    try {
      // First get the backtest runs
      const { data: runs, error: runsError } = await supabase
        .from('backtest_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (runsError) {
        throw new Error(`Failed to fetch backtest runs: ${runsError.message}`);
      }

      // Then get signal counts for each run
      const runsWithCounts = await Promise.all(
        (runs || []).map(async (run) => {
          const { count, error: countError } = await supabase
            .from('enriched_signals')
            .select('*', { count: 'exact', head: true })
            .eq('replay_batch_id', run.id);

          if (countError) {
            console.warn(`Failed to get count for run ${run.id}:`, countError);
          }

          return {
            ...run,
            date_range: run.date_range ? String(run.date_range) : null,
            signal_count: count || 0
          };
        })
      );

      return runsWithCounts;
      
    } catch (error) {
      console.error('❌ BACKTEST RUNS FETCH ERROR:', error);
      throw error;
    }
  }

  // Keep existing methods for backward compatibility
  static async getReplayBatches(): Promise<any[]> {
    try {
      const runs = await this.getBacktestRuns();
      return runs.map(run => ({
        replay_batch_id: run.id,
        created_at: run.created_at,
        count: run.signal_count || 0,
        run_name: run.run_name,
        status: run.status
      }));
    } catch (error) {
      console.error('❌ REPLAY BATCHES FETCH ERROR:', error);
      throw error;
    }
  }

  static async getReplayStats(batch_id: string): Promise<ReplaySignalStats> {
    try {
      const signals = await this.getReplaySignals(batch_id);
      
      if (signals.length === 0) {
        throw new Error('No replay signals found for this batch');
      }

      const total_signals = signals.length;
      const success_1h = signals.filter(s => s.success_1h).length;
      const success_3h = signals.filter(s => s.success_3h).length;
      const success_eod = signals.filter(s => s.success_eod).length;

      const avg_change_1h = signals.reduce((sum, s) => sum + (s.change_1h || 0), 0) / total_signals;
      const avg_change_3h = signals.reduce((sum, s) => sum + (s.change_3h || 0), 0) / total_signals;
      const avg_change_eod = signals.reduce((sum, s) => sum + (s.change_eod || 0), 0) / total_signals;

      // Find best/worst performing tickers
      const tickerPerformance = new Map();
      signals.forEach(signal => {
        const ticker = signal.ticker;
        if (!tickerPerformance.has(ticker)) {
          tickerPerformance.set(ticker, []);
        }
        tickerPerformance.get(ticker).push(signal.change_eod || 0);
      });

      let bestTicker = '';
      let worstTicker = '';
      let bestAvg = -Infinity;
      let worstAvg = Infinity;

      for (const [ticker, changes] of tickerPerformance.entries()) {
        const avg = changes.reduce((sum: number, change: number) => sum + change, 0) / changes.length;
        if (avg > bestAvg) {
          bestAvg = avg;
          bestTicker = ticker;
        }
        if (avg < worstAvg) {
          worstAvg = avg;
          worstTicker = ticker;
        }
      }

      return {
        total_signals,
        success_rate_1h: (success_1h / total_signals) * 100,
        success_rate_3h: (success_3h / total_signals) * 100,
        success_rate_eod: (success_eod / total_signals) * 100,
        avg_change_1h,
        avg_change_3h,
        avg_change_eod,
        best_performing_ticker: bestTicker,
        worst_performing_ticker: worstTicker
      };
      
    } catch (error) {
      console.error('❌ REPLAY STATS ERROR:', error);
      throw error;
    }
  }

  static async deleteBacktestRun(run_id: string): Promise<void> {
    try {
      // Delete the backtest run (cascades to delete associated signals due to foreign key)
      const { error } = await supabase
        .from('backtest_runs')
        .delete()
        .eq('id', run_id);

      if (error) {
        throw new Error(`Failed to delete backtest run: ${error.message}`);
      }

      console.log(`✅ BACKTESTING: Deleted backtest run ${run_id}`);
      
    } catch (error) {
      console.error('❌ BACKTEST RUN DELETE ERROR:', error);
      throw error;
    }
  }

  // Keep backward compatibility method
  static async deleteReplayBatch(batch_id: string): Promise<void> {
    return this.deleteBacktestRun(batch_id);
  }

  static async evaluateReplaySignals(config: {
    replay_batch_id?: string;
    date_range?: { start: string; end: string };
    batch_size?: number;
    success_threshold?: number;
  }): Promise<any> {
    try {
      console.log('🧠 REPLAY EVALUATION: Starting automated pipeline evaluation...');
      
      const { data, error } = await supabase.functions.invoke('evaluate-replay-success', {
        body: config
      });

      if (error) {
        throw new Error(`Replay evaluation function error: ${error.message}`);
      }

      console.log('✅ REPLAY EVALUATION: Pipeline completed successfully');
      return data;
      
    } catch (error) {
      console.error('❌ REPLAY EVALUATION ERROR:', error);
      throw error;
    }
  }

  /**
   * Run automated evaluation pipeline for all pending replay signals
   */
  static async runEvaluationPipeline(options?: {
    batch_size?: number;
    success_threshold?: number;
  }): Promise<any> {
    try {
      console.log('📈 EVALUATION PIPELINE: Starting automated evaluation...');
      
      const { data, error } = await supabase.functions.invoke('evaluate-replay-success', {
        body: {
          batch_size: options?.batch_size || 100,
          success_threshold: options?.success_threshold || 1.5
        }
      });

      if (error) {
        throw new Error(`Evaluation pipeline error: ${error.message}`);
      }

      console.log('✅ EVALUATION PIPELINE: Completed successfully');
      return data;
      
    } catch (error) {
      console.error('❌ EVALUATION PIPELINE ERROR:', error);
      throw error;
    }
  }

  /**
   * Get evaluation statistics for a specific batch
   */
  static async getBatchEvaluationStats(replay_batch_id: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('enriched_signals')
        .select('success_1h, success_3h, success_eod, change_1h, change_3h, change_eod, ticker, evaluation_status')
        .eq('replay_batch_id', replay_batch_id)
        .eq('source', 'replay')
        .eq('evaluation_status', 'complete');

      if (error) {
        throw new Error(`Failed to fetch batch evaluation stats: ${error.message}`);
      }

      const signals = data || [];
      if (signals.length === 0) {
        return {
          total_signals: 0,
          evaluated_signals: 0,
          success_rates: { '1h': 0, '3h': 0, 'eod': 0 },
          avg_changes: { '1h': 0, '3h': 0, 'eod': 0 }
        };
      }

      const success_1h = signals.filter(s => s.success_1h === true).length;
      const success_3h = signals.filter(s => s.success_3h === true).length;
      const success_eod = signals.filter(s => s.success_eod === true).length;

      const valid_1h = signals.filter(s => s.success_1h !== null).length;
      const valid_3h = signals.filter(s => s.success_3h !== null).length;
      const valid_eod = signals.filter(s => s.success_eod !== null).length;

      const avg_1h = signals.reduce((sum, s) => sum + (s.change_1h || 0), 0) / signals.length;
      const avg_3h = signals.reduce((sum, s) => sum + (s.change_3h || 0), 0) / signals.length;
      const avg_eod = signals.reduce((sum, s) => sum + (s.change_eod || 0), 0) / signals.length;

      return {
        total_signals: signals.length,
        evaluated_signals: signals.length,
        success_rates: {
          '1h': valid_1h > 0 ? (success_1h / valid_1h) * 100 : 0,
          '3h': valid_3h > 0 ? (success_3h / valid_3h) * 100 : 0,
          'eod': valid_eod > 0 ? (success_eod / valid_eod) * 100 : 0
        },
        avg_changes: {
          '1h': avg_1h,
          '3h': avg_3h,
          'eod': avg_eod
        }
      };
      
    } catch (error) {
      console.error('❌ BATCH EVALUATION STATS ERROR:', error);
      throw error;
    }
  }

  /**
   * Export replay results with filtering options
   */
  static async exportReplayResults(config: {
    replay_batch_id?: string;
    min_z_score?: number;
    sentiment_type?: string;
    time_window?: string;
    format?: 'csv' | 'json';
  }): Promise<any> {
    try {
      console.log('📊 EXPORT REPLAY RESULTS: Starting export...');
      
      const { data, error } = await supabase.functions.invoke('export-replay-results', {
        body: config
      });

      if (error) {
        throw new Error(`Export function error: ${error.message}`);
      }

      console.log('✅ EXPORT REPLAY RESULTS: Export completed successfully');
      return data;
      
    } catch (error) {
      console.error('❌ EXPORT REPLAY RESULTS ERROR:', error);
      throw error;
    }
  }
}
