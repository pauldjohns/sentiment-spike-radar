import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pause, Play, RotateCcw, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProcessingState {
  sessionId: string;
  totalBatches: number;
  completedBatches: number;
  currentBatch: number;
  totalTickers: number;
  processedTickers: number;
  totalMessages: number;
  totalErrors: number;
  rateLimitViolations: number;
  startTime: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  lastError?: string;
  highProbabilityCandidates?: number;
}

export const ProcessingQueuePanel = () => {
  const [processingState, setProcessingState] = useState<ProcessingState | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isTracking) {
      const interval = setInterval(() => {
        // This would fetch real processing state from your backend
        // For now, we'll simulate progress
        setProcessingState(prev => {
          if (!prev) return null;
          
          if (prev.status === 'running' && prev.completedBatches < prev.totalBatches) {
            const progress = Math.min(
              prev.completedBatches + Math.random() * 0.1,
              prev.totalBatches
            );
            
            return {
              ...prev,
              completedBatches: progress,
              processedTickers: Math.floor((progress / prev.totalBatches) * prev.totalTickers),
              totalMessages: prev.totalMessages + Math.floor(Math.random() * 50),
              highProbabilityCandidates: (prev.highProbabilityCandidates || 0) + (Math.random() > 0.8 ? 1 : 0)
            };
          }
          
          if (prev.completedBatches >= prev.totalBatches && prev.status === 'running') {
            return { ...prev, status: 'completed' };
          }
          
          return prev;
        });
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isTracking]);

  const startProcessing = () => {
    const newState: ProcessingState = {
      sessionId: `session_${Date.now()}`,
      totalBatches: 20,
      completedBatches: 0,
      currentBatch: 0,
      totalTickers: 200,
      processedTickers: 0,
      totalMessages: 0,
      totalErrors: 0,
      rateLimitViolations: 0,
      startTime: new Date().toISOString(),
      status: 'running',
      highProbabilityCandidates: 0
    };
    
    setProcessingState(newState);
    setIsTracking(true);
    
    toast({
      title: "Processing Started",
      description: "10% move detection processing has begun",
      duration: 3000,
    });
  };

  const pauseProcessing = () => {
    if (processingState) {
      setProcessingState({ ...processingState, status: 'paused' });
      setIsTracking(false);
    }
  };

  const resumeProcessing = () => {
    if (processingState && processingState.status === 'paused') {
      setProcessingState({ ...processingState, status: 'running' });
      setIsTracking(true);
    }
  };

  const resetProcessing = () => {
    setProcessingState(null);
    setIsTracking(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Zap className="h-4 w-4 text-green-400 animate-pulse" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-400" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-700 text-green-300';
      case 'paused':
        return 'bg-yellow-700 text-yellow-300';
      case 'completed':
        return 'bg-blue-700 text-blue-300';
      case 'failed':
        return 'bg-red-700 text-red-300';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  if (!processingState) {
    return (
      <Card className="p-6 bg-slate-800 border-slate-600">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Processing Queue</h3>
          <Button onClick={startProcessing} className="bg-green-600 hover:bg-green-700">
            Start Background Processing
          </Button>
        </div>
        <div className="text-sm text-slate-400">
          <p>No active processing session. Click to start background processing for 10% move detection.</p>
        </div>
      </Card>
    );
  }

  const progressPercentage = Math.round((processingState.completedBatches / processingState.totalBatches) * 100);
  const tickerProgressPercentage = Math.round((processingState.processedTickers / processingState.totalTickers) * 100);

  return (
    <Card className="p-6 bg-slate-800 border-slate-600">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-white">Processing Queue</h3>
          {getStatusIcon(processingState.status)}
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className={getStatusColor(processingState.status)}>
            {processingState.status.toUpperCase()}
          </Badge>
          <div className="flex space-x-1">
            {processingState.status === 'running' && (
              <Button size="sm" variant="outline" onClick={pauseProcessing}>
                <Pause className="h-3 w-3" />
              </Button>
            )}
            {processingState.status === 'paused' && (
              <Button size="sm" variant="outline" onClick={resumeProcessing}>
                <Play className="h-3 w-3" />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={resetProcessing}>
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Batch Progress */}
        <div>
          <div className="flex justify-between text-sm text-slate-300 mb-2">
            <span>Batch Progress</span>
            <span>{processingState.completedBatches.toFixed(1)}/{processingState.totalBatches} ({progressPercentage}%)</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Ticker Progress */}
        <div>
          <div className="flex justify-between text-sm text-slate-300 mb-2">
            <span>Tickers Processed</span>
            <span>{processingState.processedTickers}/{processingState.totalTickers} ({tickerProgressPercentage}%)</span>
          </div>
          <Progress value={tickerProgressPercentage} className="h-2" />
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-700/50 p-2 rounded">
            <div className="text-slate-400">Messages</div>
            <div className="text-white font-medium">{processingState.totalMessages.toLocaleString()}</div>
          </div>
          <div className="bg-slate-700/50 p-2 rounded">
            <div className="text-slate-400">High Prob Candidates</div>
            <div className="text-green-400 font-medium">{processingState.highProbabilityCandidates || 0}</div>
          </div>
          <div className="bg-slate-700/50 p-2 rounded">
            <div className="text-slate-400">Errors</div>
            <div className="text-red-400 font-medium">{processingState.totalErrors}</div>
          </div>
          <div className="bg-slate-700/50 p-2 rounded">
            <div className="text-slate-400">Rate Limits</div>
            <div className="text-yellow-400 font-medium">{processingState.rateLimitViolations}</div>
          </div>
        </div>

        {/* Error Display */}
        {processingState.lastError && (
          <div className="bg-red-900/30 border border-red-700 p-3 rounded text-sm">
            <div className="flex items-center space-x-2 text-red-300">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Last Error:</span>
            </div>
            <div className="text-red-200 mt-1">{processingState.lastError}</div>
          </div>
        )}

        {/* Session Info */}
        <div className="text-xs text-slate-500 border-t border-slate-700 pt-2">
          <div>Session ID: {processingState.sessionId}</div>
          <div>Started: {new Date(processingState.startTime).toLocaleString()}</div>
        </div>
      </div>
    </Card>
  );
};
