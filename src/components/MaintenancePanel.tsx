import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench, Database, TrendingUp, Play, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { SignalMaintenanceService } from '@/services/SignalMaintenanceService';
import { toast } from 'sonner';

export const MaintenancePanel = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [isRunningIntegrityCheck, setIsRunningIntegrityCheck] = useState(false);

  const runLearningDataLog = async () => {
    setIsRunning(true);
    try {
      const result = await SignalMaintenanceService.triggerLearningDataLog();
      setResults({ type: 'learning', result });
      
      if (result.success) {
        toast.success(`✅ Learning data logged: ${result.logged_count || 0} entries`);
      } else {
        toast.error(`❌ Learning data failed: ${result.error}`);
      }
    } catch (error) {
      toast.error(`❌ Learning data error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runPatternAnalysis = async () => {
    setIsRunning(true);
    try {
      const result = await SignalMaintenanceService.triggerPatternAnalysis();
      setResults({ type: 'patterns', result });
      
      if (result.success) {
        toast.success(`✅ Pattern analysis complete: ${result.patterns_processed || 0} patterns`);
      } else {
        toast.error(`❌ Pattern analysis failed: ${result.error}`);
      }
    } catch (error) {
      toast.error(`❌ Pattern analysis error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runFullMaintenance = async () => {
    setIsRunning(true);
    try {
      const result = await SignalMaintenanceService.runFullMaintenance();
      setResults({ type: 'full', result });
      
      const learningSuccess = result.learning.success;
      const patternSuccess = result.patterns.success;
      
      if (learningSuccess && patternSuccess) {
        toast.success('✅ Full maintenance cycle completed successfully');
      } else if (learningSuccess || patternSuccess) {
        toast.warning('⚠️ Partial maintenance success - check results');
      } else {
        toast.error('❌ Maintenance cycle failed');
      }
    } catch (error) {
      toast.error(`❌ Maintenance error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runIntegrityCheck = async () => {
    setIsRunningIntegrityCheck(true);
    try {
      const result = await SignalMaintenanceService.runIntegrityCheck();
      setResults({ type: 'integrity', result });
      
      if (result.success) {
        toast.success(`✅ Integrity check passed: ${result.metrics?.valid_signals || 0} valid signals`);
      } else {
        toast.error(`❌ Integrity check failed: ${result.message}`);
      }
    } catch (error) {
      toast.error(`❌ Integrity check error: ${error.message}`);
    } finally {
      setIsRunningIntegrityCheck(false);
    }
  };

  const getStatusBadge = (success: boolean) => (
    <Badge variant={success ? 'default' : 'destructive'}>
      {success ? 'Success' : 'Failed'}
    </Badge>
  );

  return (
    <Card className="p-6 bg-slate-800 border-slate-600">
      <div className="flex items-center space-x-3 mb-6">
        <Wrench className="h-6 w-6 text-blue-400" />
        <div>
          <h3 className="text-lg font-semibold text-white">Signal Maintenance</h3>
          <p className="text-sm text-slate-400">
            Trigger learning and pattern analysis functions manually
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Button 
          onClick={runLearningDataLog}
          disabled={isRunning}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
        >
          {isRunning ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Database className="h-4 w-4" />
          )}
          <span>Log Learning Data</span>
        </Button>

        <Button 
          onClick={runPatternAnalysis}
          disabled={isRunning}
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
        >
          {isRunning ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          )}
          <span>Analyze Patterns</span>
        </Button>

        <Button 
          onClick={runFullMaintenance}
          disabled={isRunning}
          className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
        >
          {isRunning ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          <span>Full Cycle</span>
        </Button>

        <Button 
          onClick={runIntegrityCheck}
          disabled={isRunningIntegrityCheck}
          className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700"
        >
          {isRunningIntegrityCheck ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <span>Integrity Check</span>
        </Button>
      </div>

      {results && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-white">Last Operation Results</h4>
          
          {results.type === 'learning' && (
            <div className="p-3 bg-slate-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white">Learning Data Logging</span>
                {getStatusBadge(results.result.success)}
              </div>
              <div className="text-sm text-slate-300">
                {results.result.success ? (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Logged {results.result.logged_count || 0} learning entries</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <span>{results.result.error}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {results.type === 'patterns' && (
            <div className="p-3 bg-slate-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white">Pattern Analysis</span>
                {getStatusBadge(results.result.success)}
              </div>
              <div className="text-sm text-slate-300">
                {results.result.success ? (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Processed {results.result.patterns_processed || 0} patterns</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <span>{results.result.error}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {results.type === 'full' && (
            <div className="space-y-2">
              <div className="p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">Learning Data Logging</span>
                  {getStatusBadge(results.result.learning.success)}
                </div>
                <div className="text-sm text-slate-300">
                  {results.result.learning.success ? (
                    <span>Logged {results.result.learning.logged_count || 0} entries</span>
                  ) : (
                    <span className="text-red-400">{results.result.learning.error}</span>
                  )}
                </div>
              </div>
              
              <div className="p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">Pattern Analysis</span>
                  {getStatusBadge(results.result.patterns.success)}
                </div>
                <div className="text-sm text-slate-300">
                  {results.result.patterns.success ? (
                    <span>Processed {results.result.patterns.patterns_processed || 0} patterns</span>
                  ) : (
                    <span className="text-red-400">{results.result.patterns.error}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {results.type === 'integrity' && (
            <div className="p-3 bg-slate-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white">Signal Integrity Check</span>
                {getStatusBadge(results.result.success)}
              </div>
              <div className="text-sm text-slate-300">
                {results.result.success ? (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>{results.result.message}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <span>{results.result.message}</span>
                  </div>
                )}
                {results.result.metrics && (
                  <div className="mt-2 text-xs text-slate-400">
                    Checked: {results.result.metrics.total_checked} | 
                    Valid: {results.result.metrics.valid_signals} | 
                    Issues: {results.result.metrics.scope_violations + results.result.metrics.data_integrity_issues}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 p-3 bg-slate-700/50 rounded-lg">
        <div className="text-xs text-slate-400">
          <div className="font-medium mb-1">Scheduled Automation:</div>
          <div>• Learning data logging: Every 30 minutes</div>
          <div>• Pattern analysis: Every hour</div>
          <div>• Manual triggers available above for immediate execution</div>
        </div>
      </div>
    </Card>
  );
};