
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, Play, Trash2, Download, BarChart3, Target, Clock, Users, TrendingUp, AlertTriangle, MoreHorizontal } from 'lucide-react';
import { useBacktesting } from '@/hooks/useBacktesting';
import { ReplayAnalysisPanel } from './ReplayAnalysisPanel';
import { toast } from '@/hooks/use-toast';

export default function BacktestingPanel() {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined, to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [tickers, setTickers] = useState<string>('');
  const [minZScore, setMinZScore] = useState<number | undefined>(undefined);
  const [minVelocity, setMinVelocity] = useState<number | undefined>(undefined);
  const [runName, setRunName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [crawlTickers, setCrawlTickers] = useState<string>('');
  const [crawlStartDate, setCrawlStartDate] = useState<Date | undefined>(undefined);
  const [crawlEndDate, setCrawlEndDate] = useState<Date | undefined>(undefined);

  const {
    isReplaying,
    isEvaluating,
    replaySignals,
    replayBatches,
    backtestRuns,
    replayStats,
    error,
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
  } = useBacktesting();

  useEffect(() => {
    fetchReplayBatches();
    fetchBacktestRuns();
  }, [fetchReplayBatches, fetchBacktestRuns]);

  const handleBacktest = async () => {
    if (!dateRange.from || !dateRange.to) {
      toast({
        title: "Error",
        description: "Please select a date range.",
        variant: "destructive",
      });
      return;
    }

    if (!tickers) {
      toast({
        title: "Error",
        description: "Please enter at least one ticker.",
        variant: "destructive",
      });
      return;
    }

    const config = {
      date_range: {
        start: dateRange.from.toISOString(),
        end: dateRange.to.toISOString(),
      },
      tickers: tickers.split(',').map(t => t.trim()),
      min_z_score: minZScore,
      min_velocity: minVelocity,
      run_name: runName,
      notes: notes
    };

    await runBacktest(config);
  };

  const handleCrawlAndReplay = async () => {
    if (!crawlStartDate || !crawlEndDate) {
      toast({
        title: "Error",
        description: "Please select a crawl date range.",
        variant: "destructive",
      });
      return;
    }

    if (!crawlTickers) {
      toast({
        title: "Error",
        description: "Please enter at least one ticker to crawl.",
        variant: "destructive",
      });
      return;
    }

    const config = {
      tickers: crawlTickers.split(',').map(t => t.trim()),
      start_date: crawlStartDate.toISOString(),
      end_date: crawlEndDate.toISOString(),
      min_z_score: minZScore,
      min_velocity: minVelocity,
      run_name: runName,
      notes: notes
    };

    await runCrawlAndReplay(config);
  };

  const handleDeleteBatch = async (batch_id: string) => {
    await deleteReplayBatch(batch_id);
  };

  const handleEvaluateSignals = async (batch_id?: string) => {
    await evaluateReplaySignals({ replay_batch_id: batch_id });
  };

  const handleRunEvaluationPipeline = async () => {
    await runEvaluationPipeline();
  };

  const clearFilters = () => {
    setMinZScore(undefined);
    setMinVelocity(undefined);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-slate-800 border-slate-600">
        <div className="flex items-center space-x-2 mb-6">
          <Target className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Signal Backtesting & Analysis</h3>
        </div>

        <Tabs defaultValue="backtest" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-700">
            <TabsTrigger value="backtest" className="text-slate-300 data-[state=active]:text-white">
              Historical Backtest
            </TabsTrigger>
            <TabsTrigger value="crawl" className="text-slate-300 data-[state=active]:text-white">
              Crawl & Replay
            </TabsTrigger>
            <TabsTrigger value="evaluation" className="text-slate-300 data-[state=active]:text-white">
              Evaluation Pipeline
            </TabsTrigger>
            <TabsTrigger value="analysis" className="text-slate-300 data-[state=active]:text-white">
              Analysis Dashboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="backtest" className="space-y-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Date Range</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={dateRange.from ? dateRange.from.toISOString().split('T')[0] : ''}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value ? new Date(e.target.value) : undefined })}
                    className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                  />
                  <span className="text-white">to</span>
                  <input
                    type="date"
                    value={dateRange.to ? dateRange.to.toISOString().split('T')[0] : ''}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value ? new Date(e.target.value) : undefined })}
                    className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Tickers (comma-separated)</label>
                <input
                  type="text"
                  value={tickers}
                  onChange={(e) => setTickers(e.target.value)}
                  placeholder="e.g., LMT, RTX, BA (industry tickers only)"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Min Z-Score</label>
                <input
                  type="number"
                  value={minZScore !== undefined ? minZScore : ''}
                  onChange={(e) => setMinZScore(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="e.g., 2.0"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Min Velocity</label>
                <input
                  type="number"
                  value={minVelocity !== undefined ? minVelocity : ''}
                  onChange={(e) => setMinVelocity(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="e.g., 0.5"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Run Name</label>
                <input
                  type="text"
                  value={runName}
                  onChange={(e) => setRunName(e.target.value)}
                  placeholder="e.g., My Backtest Run"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Testing new strategy"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button onClick={handleBacktest} disabled={isReplaying}>
                {isReplaying ? (
                  <>
                    <Play className="mr-2 h-4 w-4 animate-spin" />
                    Running Backtest...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Backtest
                  </>
                )}
              </Button>
              <Button onClick={clearFilters} variant="secondary">
                Clear Filters
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="crawl" className="space-y-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Crawl Date Range</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={crawlStartDate ? crawlStartDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setCrawlStartDate(e.target.value ? new Date(e.target.value) : undefined)}
                    className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                  />
                  <span className="text-white">to</span>
                  <input
                    type="date"
                    value={crawlEndDate ? crawlEndDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setCrawlEndDate(e.target.value ? new Date(e.target.value) : undefined)}
                    className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Tickers to Crawl (comma-separated)</label>
                <input
                  type="text"
                  value={crawlTickers}
                  onChange={(e) => setCrawlTickers(e.target.value)}
                  placeholder="e.g., LMT, RTX, BA (industry tickers only)"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Min Z-Score</label>
                <input
                  type="number"
                  value={minZScore !== undefined ? minZScore : ''}
                  onChange={(e) => setMinZScore(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="e.g., 2.0"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Min Velocity</label>
                <input
                  type="number"
                  value={minVelocity !== undefined ? minVelocity : ''}
                  onChange={(e) => setMinVelocity(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="e.g., 0.5"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Run Name</label>
                <input
                  type="text"
                  value={runName}
                  onChange={(e) => setRunName(e.target.value)}
                  placeholder="e.g., My Crawl Run"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Crawling for new signals"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button onClick={handleCrawlAndReplay} disabled={isReplaying}>
                {isReplaying ? (
                  <>
                    <Play className="mr-2 h-4 w-4 animate-spin" />
                    Running Crawl...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Crawl & Replay
                  </>
                )}
              </Button>
              <Button onClick={clearFilters} variant="secondary">
                Clear Filters
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="evaluation" className="space-y-6">
            <p className="text-white">Run the evaluation pipeline on all pending replay signals.</p>
            <Button onClick={handleRunEvaluationPipeline} disabled={isEvaluating}>
              {isEvaluating ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Evaluating Signals...
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Run Evaluation Pipeline
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <ReplayAnalysisPanel />
          </TabsContent>
        </Tabs>
      </Card>

      {error && (
        <Card className="p-4 bg-red-900 border-red-700 text-white">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm">{error}</p>
          </div>
          <Button onClick={clearError} variant="secondary" size="sm">
            Clear Error
          </Button>
        </Card>
      )}

      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-white">Backtest Runs</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {backtestRuns.map((run) => (
            <Card key={run.id} className="bg-slate-700 border-slate-600 text-white">
              <div className="flex items-start justify-between p-4">
                <div className="space-y-2">
                  <h5 className="text-md font-semibold">{run.run_name || 'Unnamed Run'}</h5>
                  <p className="text-sm text-slate-400">Created: {new Date(run.created_at).toLocaleDateString()}</p>
                  <p className="text-sm text-slate-400">Signals: {run.signal_count}</p>
                  <Badge variant="secondary">
                    {run.status}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEvaluateSignals(run.id)}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Evaluate Signals
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => fetchReplayStats(run.id)}>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      View Stats
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDeleteBatch(run.id)} disabled={isReplaying}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Run
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {replayStats && replayStats.total_signals > 0 && (
                <div className="p-4">
                  <h6 className="text-sm font-semibold">Replay Statistics</h6>
                  <p className="text-xs text-slate-400">Total Signals: {replayStats.total_signals}</p>
                  <p className="text-xs text-slate-400">Success (EOD): {replayStats.success_rate_eod.toFixed(1)}%</p>
                  <p className="text-xs text-slate-400">Avg Change (EOD): {replayStats.avg_change_eod.toFixed(2)}%</p>
                  <p className="text-xs text-slate-400">Best Ticker: {replayStats.best_performing_ticker}</p>
                  <p className="text-xs text-slate-400">Worst Ticker: {replayStats.worst_performing_ticker}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
