
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEnrichedSignals } from '@/hooks/useEnrichedSignals';
import { useSignalPatterns } from '@/hooks/useSignalPatterns';
import { ConfidenceBadge } from './ConfidenceBadge';
import { 
  Target, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  BarChart3,
  Brain,
  Zap
} from 'lucide-react';

export const EnrichmentTestPanel = () => {
  const { 
    enrichedSignals, 
    stats, 
    isLoading, 
    error, 
    fetchEnrichedSignals, 
    createEnrichedSignal,
    evaluateSignalSuccess,
    analyzeSignalPatterns,
    updateSignalConfidence
  } = useEnrichedSignals();

  const { analyzePatterns, isAnalyzing } = useSignalPatterns();

  const [isCreating, setIsCreating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isUpdatingConfidence, setIsUpdatingConfidence] = useState(false);

  // Fetch signals on component mount, sorted by confidence
  useEffect(() => {
    fetchEnrichedSignals({ 
      limit: 50, 
      sort_by_confidence: true 
    });
  }, [fetchEnrichedSignals]);

  const handleCreateTestSignal = async () => {
    setIsCreating(true);
    try {
      const testTickers = ['AAPL', 'TSLA', 'NVDA', 'MSFT'];
      const randomTicker = testTickers[Math.floor(Math.random() * testTickers.length)];
      
      const result = await createEnrichedSignal({
        ticker: randomTicker,
        time_window: 'market_open',
        signal_detected_at: new Date(),
        sentiment_type: Math.random() > 0.5 ? 'bullish' : 'bearish',
        z_score: Math.random() * 4 + 1, // 1-5 range
        sentiment_velocity: Math.random() * 50 + 10, // 10-60 range
        message_volume: Math.floor(Math.random() * 100) + 20
      });
      
      if (result.success) {
        console.log('✅ Test signal created successfully');
        await fetchEnrichedSignals({ 
          limit: 50, 
          sort_by_confidence: true 
        });
      }
    } catch (error) {
      console.error('❌ Failed to create test signal:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEvaluateSignals = async () => {
    setIsEvaluating(true);
    try {
      const result = await evaluateSignalSuccess({ 
        batch_mode: true, 
        limit: 20 
      });
      
      if (result.success) {
        console.log('✅ Signal evaluation completed');
        await fetchEnrichedSignals({ 
          limit: 50, 
          sort_by_confidence: true 
        });
      }
    } catch (error) {
      console.error('❌ Failed to evaluate signals:', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleAnalyzePatterns = async () => {
    try {
      const result = await analyzePatterns({ force_refresh: true });
      
      if (result.success) {
        console.log('✅ Pattern analysis completed');
      }
    } catch (error) {
      console.error('❌ Failed to analyze patterns:', error);
    }
  };

  const handleUpdateConfidence = async () => {
    setIsUpdatingConfidence(true);
    try {
      const result = await updateSignalConfidence({ 
        batch_mode: true, 
        limit: 50 
      });
      
      if (result.success) {
        console.log('✅ Confidence update completed');
        await fetchEnrichedSignals({ 
          limit: 50, 
          sort_by_confidence: true 
        });
      }
    } catch (error) {
      console.error('❌ Failed to update confidence:', error);
    } finally {
      setIsUpdatingConfidence(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card className="p-6 bg-slate-800 border-slate-600">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Signal Intelligence Testing</h3>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Button
            onClick={handleCreateTestSignal}
            disabled={isCreating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Zap className="h-4 w-4 mr-2" />
            {isCreating ? 'Creating...' : 'Create Test Signal'}
          </Button>

          <Button
            onClick={handleEvaluateSignals}
            disabled={isEvaluating}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isEvaluating ? 'Evaluating...' : 'Evaluate Success'}
          </Button>

          <Button
            onClick={handleAnalyzePatterns}
            disabled={isAnalyzing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Analyze Patterns'}
          </Button>

          <Button
            onClick={handleUpdateConfidence}
            disabled={isUpdatingConfidence}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Brain className="h-4 w-4 mr-2" />
            {isUpdatingConfidence ? 'Updating...' : 'Update Confidence'}
          </Button>
        </div>

        {/* Stats Display */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-center">
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xl font-bold text-white">{stats.total_signals}</div>
              <div className="text-sm text-slate-400">Total Signals</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xl font-bold text-green-400">{stats.completed_enrichments}</div>
              <div className="text-sm text-slate-400">Completed</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xl font-bold text-yellow-400">{stats.pending_enrichments}</div>
              <div className="text-sm text-slate-400">Pending</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xl font-bold text-red-400">{stats.failed_enrichments}</div>
              <div className="text-sm text-slate-400">Failed</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xl font-bold text-blue-400">{stats.completion_rate.toFixed(1)}%</div>
              <div className="text-sm text-slate-400">Success Rate</div>
            </div>
          </div>
        )}
      </Card>

      {/* Signals List */}
      <Card className="p-6 bg-slate-800 border-slate-600">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Enriched Signals</h3>
          <div className="text-sm text-slate-400">
            Sorted by Confidence Score (Highest First)
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
            <div className="flex items-center text-red-400">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-slate-400">Loading signals...</div>
        ) : enrichedSignals.length === 0 ? (
          <div className="text-center py-8 text-slate-400">No enriched signals found.</div>
        ) : (
          <div className="space-y-3">
            {enrichedSignals.slice(0, 20).map((signal) => (
              <div key={signal.id} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-bold text-white">{signal.ticker}</span>
                    <ConfidenceBadge 
                      score={signal.confidence_score} 
                      source={signal.confidence_source}
                      showDetails={true}
                    />
                    <Badge variant="outline" className="text-slate-300">
                      {signal.sentiment_type || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-slate-400">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(signal.signal_detected_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-slate-400">Z-Score</div>
                    <div className="text-sm font-medium text-blue-400">
                      {signal.z_score?.toFixed(2) || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Velocity</div>
                    <div className="text-sm font-medium text-green-400">
                      {signal.sentiment_velocity?.toFixed(1) || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Status</div>
                    <Badge variant={
                      signal.price_metadata_status === 'complete' ? 'default' :
                      signal.price_metadata_status === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {signal.price_metadata_status || 'unknown'}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Evaluation</div>
                    <Badge variant={
                      signal.evaluation_status === 'complete' ? 'default' :
                      signal.evaluation_status === 'pending' ? 'secondary' : 'outline'
                    }>
                      {signal.evaluation_status || 'unevaluated'}
                    </Badge>
                  </div>
                </div>

                {/* Success Indicators */}
                {signal.evaluation_status === 'complete' && (
                  <div className="flex space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-400">1H:</span>
                      {signal.success_1h === true ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : signal.success_1h === false ? (
                        <AlertCircle className="h-4 w-4 text-red-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-400">3H:</span>
                      {signal.success_3h === true ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : signal.success_3h === false ? (
                        <AlertCircle className="h-4 w-4 text-red-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-400">EOD:</span>
                      {signal.success_eod === true ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : signal.success_eod === false ? (
                        <AlertCircle className="h-4 w-4 text-red-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
