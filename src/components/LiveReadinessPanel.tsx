
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { LiveReadinessChecker, ReadinessCheckResult } from '@/services/LiveReadinessChecker';

export const LiveReadinessPanel = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ReadinessCheckResult[]>([]);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runReadinessCheck = async () => {
    setIsRunning(true);
    // PHASE 3 Risk Mitigation: Clear previous results and reset state
    setResults([]);
    setLastRun(null);
    
    try {
      const checker = new LiveReadinessChecker();
      
      // Force cache refresh by creating a new checker instance
      console.log('🔄 Starting fresh readiness check with cache clearing...');
      const checkResults = await checker.runFullCheck();
      
      setResults(checkResults);
      setLastRun(new Date());
      
      // Log the full report to console for debugging
      console.log('📋 READINESS CHECK COMPLETE:');
      console.log(checker.getReport());
      
    } catch (error) {
      console.error('❌ Readiness check failed:', error);
      // Risk mitigation: Show error state instead of failing silently
      setResults([{
        component: 'System Check',
        status: 'FAIL',
        details: `Health check failed: ${error.message}`,
        issues: ['Check console for detailed error information']
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAIL': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'WARNING': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'PASS': 'default',
      'FAIL': 'destructive',
      'WARNING': 'secondary'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const summary = results.reduce((acc, result) => {
    acc[result.status]++;
    return acc;
  }, { PASS: 0, FAIL: 0, WARNING: 0 });

  const isSystemReady = summary.FAIL === 0 && results.length > 0;

  return (
    <Card className="p-6 bg-slate-800 border-slate-600">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <PlayCircle className="h-6 w-6 text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Live Readiness Check</h3>
            <p className="text-sm text-slate-400">
              Comprehensive system verification for live market operation
            </p>
          </div>
        </div>
        
        <Button 
          onClick={runReadinessCheck} 
          disabled={isRunning}
          className="flex items-center space-x-2"
        >
          {isRunning ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="h-4 w-4" />
          )}
          <span>{isRunning ? 'Running...' : 'Run Check'}</span>
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-slate-700 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{results.length}</div>
              <div className="text-sm text-slate-400">Total Checks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{summary.PASS}</div>
              <div className="text-sm text-slate-400">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{summary.WARNING}</div>
              <div className="text-sm text-slate-400">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{summary.FAIL}</div>
              <div className="text-sm text-slate-400">Failed</div>
            </div>
          </div>

          {/* Overall Status */}
          <div className={`p-4 rounded-lg border-2 ${
            isSystemReady 
              ? 'bg-green-900/20 border-green-500/50' 
              : 'bg-red-900/20 border-red-500/50'
          }`}>
            <div className="flex items-center space-x-3">
              {isSystemReady ? (
                <CheckCircle className="h-6 w-6 text-green-400" />
              ) : (
                <XCircle className="h-6 w-6 text-red-400" />
              )}
              <div>
                <div className={`font-semibold ${isSystemReady ? 'text-green-400' : 'text-red-400'}`}>
                  {isSystemReady ? '🚀 SYSTEM READY FOR LIVE OPERATION' : '🚨 SYSTEM REQUIRES FIXES'}
                </div>
                <div className="text-sm text-slate-400">
                  {isSystemReady 
                    ? 'All critical systems are functional and ready for market hours'
                    : 'Critical issues must be resolved before live operation'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="space-y-2">
            <h4 className="text-md font-medium text-white mb-3">Detailed Results</h4>
            {results.map((result, index) => (
              <div key={index} className="p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium text-white">{result.component}</span>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
                <div className="text-sm text-slate-300 mb-2">{result.details}</div>
                {result.issues && result.issues.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {result.issues.map((issue, issueIndex) => (
                      <div key={issueIndex} className="text-xs text-slate-400 ml-6">
                        • {issue}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {lastRun && (
            <div className="text-xs text-slate-500 text-center">
              Last run: {lastRun.toLocaleString()}
            </div>
          )}
        </div>
      )}

      {results.length === 0 && !isRunning && (
        <div className="text-center py-8 text-slate-400">
          <PlayCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Click "Run Check" to verify system readiness for live operation</p>
        </div>
      )}
    </Card>
  );
};
