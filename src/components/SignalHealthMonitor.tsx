import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SignalHealthReport {
  interval: string;
  total_eligible_tickers: number;
  signals_detected: number;
  unique_tickers: number;
  status: 'pass' | 'warn' | 'fail';
  duplicate_ticker_flag: boolean;
  baseline_coverage_score: number;
  timestamp: string;
  health_details: {
    sentiment_health: Array<{
      ticker: string;
      issue?: string;
      action?: string;
      sentiment_score?: number;
      message_volume?: number;
      baseline_available?: boolean;
    }>;
    duplicates?: Array<{
      ticker: string;
      count: number;
    }>;
    warnings: string[];
    errors: string[];
  };
}

export const SignalHealthMonitor = () => {
  const [healthReport, setHealthReport] = useState<SignalHealthReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();
  
  const [manualTriggerLoading, setManualTriggerLoading] = useState(false);
  const [manualTriggerResult, setManualTriggerResult] = useState<any>(null);

  const runHealthCheck = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Running signal health validation...');
      
      const { data, error } = await supabase.functions.invoke('validate-signal-health', {
        body: { timestamp: new Date().toISOString() }
      });

      if (error) {
        throw new Error(`Health check failed: ${error.message}`);
      }

      setHealthReport(data);
      setLastUpdated(new Date());
      
      // Show toast based on health status
      const statusMessage = {
        pass: 'Signal generation is healthy ✅',
        warn: 'Signal generation has warnings ⚠️',
        fail: 'Signal generation has critical issues ❌'
      };

      toast({
        title: 'Health Check Complete',
        description: statusMessage[data.status],
        variant: data.status === 'fail' ? 'destructive' : 'default'
      });

      console.log('✅ Health check completed:', data);
    } catch (error) {
      console.error('❌ Health check failed:', error);
      toast({
        title: 'Health Check Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runManualSignalTrigger = async () => {
    setManualTriggerLoading(true);
    setManualTriggerResult(null);
    
    try {
      console.log('🧪 Running manual signal trigger...');
      
      const { data, error } = await supabase.functions.invoke('manual-select-signals');
      
      if (error) {
        throw new Error(`Manual trigger failed: ${error.message}`);
      }
      
      setManualTriggerResult(data);
      toast({
        title: 'Manual Signal Trigger Complete',
        description: `Selected ${data.result?.selectedSignals?.length || 0} signals`,
      });
      
    } catch (error) {
      console.error('❌ Manual trigger failed:', error);
      toast({
        title: 'Manual Trigger Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setManualTriggerLoading(false);
    }
  };

  useEffect(() => {
    // Run initial health check
    runHealthCheck();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'warn': return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'fail': return <XCircle className="h-5 w-5 text-red-400" />;
      default: return <Activity className="h-5 w-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-500';
      case 'warn': return 'bg-yellow-500';
      case 'fail': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-slate-800 border-slate-600">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Signal Health Monitor</h3>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={runHealthCheck}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="bg-slate-700 border-slate-500 text-white hover:bg-slate-600"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Run Health Check
            </Button>
            
            <Button 
              onClick={runManualSignalTrigger}
              disabled={manualTriggerLoading}
              variant="default"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {manualTriggerLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                '🧪'
              )}
              {manualTriggerLoading ? 'Triggering...' : 'Manual Trigger 10 Signals'}
            </Button>
          </div>
        </div>

        {healthReport && (
          <div className="space-y-4">
            {/* Status Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  {getStatusIcon(healthReport.status)}
                  <Badge variant="outline" className={`${getStatusColor(healthReport.status)} text-white border-0`}>
                    {healthReport.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-slate-400">Overall Status</p>
                <p className="text-sm text-slate-300">Interval: {healthReport.interval}</p>
              </div>

              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-white">{healthReport.signals_detected}</div>
                <p className="text-sm text-slate-400">Signals Detected</p>
                <p className="text-sm text-slate-300">{healthReport.unique_tickers} unique tickers</p>
              </div>

              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-white">{healthReport.total_eligible_tickers}</div>
                <p className="text-sm text-slate-400">Eligible Tickers</p>
                <p className="text-sm text-slate-300">Full universe coverage</p>
              </div>

              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-white">{healthReport.baseline_coverage_score.toFixed(1)}%</div>
                <p className="text-sm text-slate-400">Baseline Coverage</p>
                <p className="text-sm text-slate-300">Historical data available</p>
              </div>
            </div>

            {/* Duplicate Detection */}
            {healthReport.duplicate_ticker_flag && (
              <Alert className="bg-red-900/20 border-red-700">
                <XCircle className="h-4 w-4" />
                <AlertDescription className="text-red-300">
                  <strong>Duplicate Tickers Detected!</strong>
                  {healthReport.health_details.duplicates?.map(dup => (
                    <div key={dup.ticker} className="mt-1">
                      {dup.ticker}: appears {dup.count} times
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {healthReport.health_details.warnings.length > 0 && (
              <Alert className="bg-yellow-900/20 border-yellow-700">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-yellow-300">
                  <strong>Warnings ({healthReport.health_details.warnings.length}):</strong>
                  <ul className="mt-1 space-y-1">
                    {healthReport.health_details.warnings.map((warning, index) => (
                      <li key={index} className="text-sm">• {warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Errors */}
            {healthReport.health_details.errors.length > 0 && (
              <Alert className="bg-red-900/20 border-red-700">
                <XCircle className="h-4 w-4" />
                <AlertDescription className="text-red-300">
                  <strong>Errors ({healthReport.health_details.errors.length}):</strong>
                  <ul className="mt-1 space-y-1">
                    {healthReport.health_details.errors.map((error, index) => (
                      <li key={index} className="text-sm">• {error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Sentiment Health Details */}
            {healthReport.health_details.sentiment_health.length > 0 && (
              <div className="bg-slate-700 p-4 rounded-lg">
                <h4 className="text-white font-medium mb-3">Signal Sentiment Health</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {healthReport.health_details.sentiment_health.map((signal, index) => (
                    <div key={index} className="bg-slate-600 p-3 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white">{signal.ticker}</span>
                        <Badge variant={signal.baseline_available ? "default" : "destructive"} className="text-xs">
                          {signal.baseline_available ? "Baseline ✓" : "No Baseline"}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-300">
                        Vol: {signal.message_volume || 'N/A'} | 
                        Sentiment: {signal.sentiment_score?.toFixed(1) || 'N/A'}
                      </div>
                      {signal.issue && (
                        <div className="text-xs text-red-300 mt-1">
                          ⚠️ {signal.issue}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Trigger Results */}
            {manualTriggerResult && manualTriggerResult.success && (
              <div className="bg-blue-900/20 border border-blue-700 p-4 rounded-lg">
                <h4 className="text-blue-300 font-medium mb-3">
                  🧪 Manual Signal Run — [{manualTriggerResult.result?.selectedSignals?.length || 0} tickers]
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-slate-400">Timestamp:</span>
                    <div className="text-blue-300">{new Date(manualTriggerResult.result?.timestamp || '').toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Trigger ID:</span>
                    <div className="text-blue-300 font-mono text-xs">{manualTriggerResult.result?.runId}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Time Window:</span>
                    <div className="text-blue-300">{manualTriggerResult.result?.timeWindow}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Eligible:</span>
                    <div className="text-blue-300">{manualTriggerResult.result?.totalEligible}</div>
                  </div>
                </div>
                
                {manualTriggerResult.result?.selectedSignals && (
                  <div className="mt-4">
                    <h5 className="text-blue-300 font-medium mb-2">Selected Signals:</h5>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {manualTriggerResult.result.selectedSignals.map((signal: any, idx: number) => (
                        <div key={idx} className="bg-slate-600 p-2 rounded text-xs">
                          <div className="font-medium text-white">{signal.ticker}</div>
                          <div className="text-blue-300">Score: {signal.anomalyScore.toFixed(1)}</div>
                          <div className="text-slate-300">Vol: {signal.messageVolume}</div>
                          <Badge variant={signal.confidence === 'high' ? 'default' : 'secondary'} className="text-xs mt-1">
                            {signal.confidence}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {lastUpdated && (
              <div className="text-sm text-slate-400 text-center">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        {!healthReport && !isLoading && (
          <div className="text-center py-8 text-slate-400">
            Click "Run Health Check" to validate signal generation
          </div>
        )}
      </Card>
    </div>
  );
};