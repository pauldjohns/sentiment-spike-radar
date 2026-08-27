import { useState, useCallback } from 'react';
import { BacktestingService, BacktestConfig, BacktestResult, ReplaySignalStats, BacktestRun } from '@/services/BacktestingService';

export const useBacktesting = () => {
  const [isReplaying, setIsReplaying] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [replaySignals, setReplaySignals] = useState<any[]>([]);
  const [replayBatches, setReplayBatches] = useState<any[]>([]);
  const [backtestRuns, setBacktestRuns] = useState<BacktestRun[]>([]);
  const [replayStats, setReplayStats] = useState<ReplaySignalStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runBacktest = useCallback(async (config: BacktestConfig): Promise<BacktestResult | null> => {
    setIsReplaying(true);
    setError(null);
    
    try {
      console.log('🎯 BACKTEST: Starting historical signal replay...');
      const result = await BacktestingService.replayHistoricalSignals(config);
      
      // Refresh data after successful backtest
      await fetchReplayBatches();
      await fetchBacktestRuns();
      
      console.log(`✅ BACKTEST: Completed with ${result.signals_replayed} signals`);
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run backtest';
      setError(errorMessage);
      console.error('❌ BACKTEST ERROR:', err);
      return null;
    } finally {
      setIsReplaying(false);
    }
  }, []);

  const fetchReplaySignals = useCallback(async (batch_id?: string) => {
    try {
      const signals = await BacktestingService.getReplaySignals(batch_id);
      setReplaySignals(signals);
      
      console.log(`📊 FETCHED: ${signals.length} replay signals`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch replay signals';
      setError(errorMessage);
      console.error('❌ REPLAY SIGNALS FETCH ERROR:', err);
    }
  }, []);

  const fetchReplayBatches = useCallback(async () => {
    try {
      const batches = await BacktestingService.getReplayBatches();
      setReplayBatches(batches);
      
      console.log(`📦 FETCHED: ${batches.length} replay batches`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch replay batches';
      setError(errorMessage);
      console.error('❌ REPLAY BATCHES FETCH ERROR:', err);
    }
  }, []);

  const fetchBacktestRuns = useCallback(async () => {
    try {
      const runs = await BacktestingService.getBacktestRuns();
      setBacktestRuns(runs);
      
      console.log(`📋 FETCHED: ${runs.length} backtest runs`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch backtest runs';
      setError(errorMessage);
      console.error('❌ BACKTEST RUNS FETCH ERROR:', err);
    }
  }, []);

  const fetchReplayStats = useCallback(async (batch_id: string) => {
    try {
      const stats = await BacktestingService.getReplayStats(batch_id);
      setReplayStats(stats);
      
      console.log(`📈 STATS: Fetched replay statistics for batch ${batch_id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch replay stats';
      setError(errorMessage);
      console.error('❌ REPLAY STATS FETCH ERROR:', err);
    }
  }, []);

  const deleteReplayBatch = useCallback(async (batch_id: string) => {
    try {
      await BacktestingService.deleteBacktestRun(batch_id);
      
      // Refresh batches after deletion
      await fetchReplayBatches();
      await fetchBacktestRuns();
      
      console.log(`🗑️ DELETED: Backtest run ${batch_id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete backtest run';
      setError(errorMessage);
      console.error('❌ BACKTEST RUN DELETE ERROR:', err);
    }
  }, [fetchReplayBatches, fetchBacktestRuns]);

  const evaluateReplaySignals = useCallback(async (config: {
    replay_batch_id?: string;
    date_range?: { start: string; end: string };
    batch_size?: number;
    success_threshold?: number;
  }) => {
    setIsEvaluating(true);
    setError(null);
    
    try {
      console.log('📈 EVALUATION PIPELINE: Starting automated evaluation...');
      const result = await BacktestingService.evaluateReplaySignals(config);
      
      // Refresh signals after evaluation
      if (config.replay_batch_id) {
        await fetchReplaySignals(config.replay_batch_id);
      }
      
      console.log(`✅ EVALUATION PIPELINE: Completed ${result.evaluated_count} signals`);
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to evaluate replay signals';
      setError(errorMessage);
      console.error('❌ EVALUATION PIPELINE ERROR:', err);
      return null;
    } finally {
      setIsEvaluating(false);
    }
  }, [fetchReplaySignals]);

  const runCrawlAndReplay = useCallback(async (config: {
    tickers: string[];
    start_date: string;
    end_date: string;
    min_z_score?: number;
    min_velocity?: number;
    batch_size?: number;
    run_name?: string;
    notes?: string;
  }) => {
    setIsReplaying(true);
    setError(null);
    
    try {
      console.log('📡 CRAWL-REPLAY: Starting historical crawl and replay...');
      const result = await BacktestingService.crawlAndReplaySignals(config);
      
      // Refresh data after successful crawl
      await fetchReplayBatches();
      await fetchBacktestRuns();
      
      console.log(`✅ CRAWL-REPLAY: Completed with ${result.signals_inserted} signals`);
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run crawl and replay';
      setError(errorMessage);
      console.error('❌ CRAWL-REPLAY ERROR:', err);
      return null;
    } finally {
      setIsReplaying(false);
    }
  }, [fetchReplayBatches, fetchBacktestRuns]);

  const runEvaluationPipeline = useCallback(async (options?: {
    batch_size?: number;
    success_threshold?: number;
  }) => {
    setIsEvaluating(true);
    setError(null);
    
    try {
      console.log('📈 PIPELINE: Starting automated evaluation pipeline...');
      const result = await BacktestingService.runEvaluationPipeline(options);
      
      // Refresh all data after pipeline run
      await fetchReplaySignals();
      await fetchReplayBatches();
      await fetchBacktestRuns();
      
      console.log(`✅ PIPELINE: Completed evaluation of ${result.evaluated_count} signals`);
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run evaluation pipeline';
      setError(errorMessage);
      console.error('❌ EVALUATION PIPELINE ERROR:', err);
      return null;
    } finally {
      setIsEvaluating(false);
    }
  }, [fetchReplaySignals, fetchReplayBatches, fetchBacktestRuns]);

  const getBatchEvaluationStats = useCallback(async (replay_batch_id: string) => {
    try {
      const stats = await BacktestingService.getBatchEvaluationStats(replay_batch_id);
      console.log(`📊 BATCH STATS: Retrieved evaluation stats for batch ${replay_batch_id}`);
      return stats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get batch evaluation stats';
      setError(errorMessage);
      console.error('❌ BATCH STATS ERROR:', err);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isReplaying,
    isEvaluating,
    replaySignals,
    replayBatches,
    backtestRuns,
    replayStats,
    error,
    
    // Actions
    runBacktest,
    runCrawlAndReplay,
    evaluateReplaySignals,
    runEvaluationPipeline,
    getBatchEvaluationStats,
    fetchReplaySignals,
    fetchReplayBatches,
    fetchBacktestRuns,
    fetchReplayStats,
    deleteReplayBatch,
    clearError
  };
};
