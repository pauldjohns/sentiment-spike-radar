
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { DataIngestionHeader } from './DataIngestionHeader';
import { SentimentAnalysisButton } from './SentimentAnalysisButton';
import { ProcessingTimestamps } from './ProcessingTimestamps';
import { ProcessingResults } from './ProcessingResults';
import { ProcessingFeatures } from './ProcessingFeatures';
import { TickerValidator } from '@/utils/tickerValidation';
import { CheckCircle, AlertTriangle, TrendingUp, Clock, Zap } from 'lucide-react';

export const DataIngestionPanel = () => {
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string; stats?: any } | null>(null);
  const [tickerCount, setTickerCount] = useState<number>(357); // Default estimate
  
  // Load ticker count on component mount
  useEffect(() => {
    const loadTickerCount = async () => {
      try {
        const count = await TickerValidator.getValidTickerCount();
        setTickerCount(count);
      } catch (error) {
        console.error('Failed to load ticker count:', error);
        setTickerCount(357); // Fallback to estimated count
      }
    };
    
    loadTickerCount();
  }, []);

  const handleSentimentProcessingStart = () => {
    // Processing start logic if needed
  };

  const handleSentimentProcessingEnd = (result: { success: boolean; message: string; stats?: any }) => {
    setLastResult(result);
  };

  const handleSentimentTimestampUpdate = (timestamp: Date) => {
    setLastRun(timestamp);
  };

  // Calculate processing efficiency from last result
  const getProcessingStatus = () => {
    if (!lastResult?.stats) return { status: 'ready', color: 'text-slate-400', icon: CheckCircle };
    
    const efficiency = lastResult.stats.efficiencyPercent || 0;
    if (efficiency >= 95) return { status: 'complete', color: 'text-green-500', icon: CheckCircle };
    if (efficiency >= 80) return { status: 'partial', color: 'text-yellow-500', icon: AlertTriangle };
    return { status: 'incomplete', color: 'text-red-500', icon: AlertTriangle };
  };

  const processingStatus = getProcessingStatus();
  const StatusIcon = processingStatus.icon;

  // Get current time window info
  const getCurrentTimeWindow = () => {
    const now = new Date();
    const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = etNow.getHours();
    const minute = etNow.getMinutes();
    
    if (hour === 9 && minute < 30) return { label: "Pre-Market", color: "text-purple-400" };
    if (hour === 9 && minute >= 30) return { label: "Market Open", color: "text-green-400" };
    if (hour === 10 && minute < 30) return { label: "+30 Min Window", color: "text-blue-400" };
    if (hour === 10 && minute >= 30) return { label: "+1 Hr Window", color: "text-orange-400" };
    if (hour >= 16) return { label: "After Hours", color: "text-slate-400" };
    return { label: "Market Hours", color: "text-cyan-400" };
  };

  const currentWindow = getCurrentTimeWindow();

  return (
    <Card className="p-3 md:p-4 bg-slate-800 border-slate-600">
      <DataIngestionHeader />
      
      <div className="space-y-3 md:space-y-4">
        {/* ✅ REAL-TIME DATA indicator */}
        <div className="mb-4 p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="h-4 w-4 text-green-400" />
            <span className="text-green-400 font-semibold text-sm">REAL-TIME DATA ACTIVE</span>
          </div>
          <div className="text-xs text-green-300">
            <p>• StockTwits API integration with live message feeds</p>
            <p>• HuggingFace FinALBERT sentiment analysis (AI-powered)</p>
            <p>• Historical baseline calculations from Supabase</p>
            <p>• Real user diversity and pump risk detection</p>
          </div>
        </div>

        {/* Enhanced ticker information with validation status and time windows */}
        <div className="text-xs md:text-sm text-slate-300">
          <div className="flex items-center justify-between mb-2">
            <p><strong>🎯 Industry-Focused Anomaly Detection:</strong></p>
            <div className="flex items-center space-x-2">
              <StatusIcon className={`h-3 w-3 ${processingStatus.color}`} />
              <span className={`text-xs ${processingStatus.color}`}>
                {processingStatus.status === 'complete' && 'Full Coverage'}
                {processingStatus.status === 'partial' && 'Partial Coverage'}
                {processingStatus.status === 'incomplete' && 'Incomplete'}
                {processingStatus.status === 'ready' && 'Ready'}
              </span>
              {/* Current time window indicator */}
              <div className="flex items-center space-x-1">
                <Clock className={`h-3 w-3 ${currentWindow.color}`} />
                <span className={`text-xs ${currentWindow.color}`}>{currentWindow.label}</span>
              </div>
            </div>
          </div>
          
          <p>Processing {tickerCount} curated tickers across Defense/Aerospace, Energy & Renewables, and Biotech/Pharma sectors with REAL-TIME data sources</p>
          
          {/* Four-window schedule information */}
          <div className="mt-2 text-xs text-slate-400 space-y-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-3 w-3 text-purple-400" />
                <span><strong>9:00 AM ET:</strong> Pre-Market Analysis</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-3 w-3 text-green-400" />
                <span><strong>9:30 AM ET:</strong> Market Open</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-3 w-3 text-blue-400" />
                <span><strong>10:00 AM ET:</strong> +30 Minutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-3 w-3 text-orange-400" />
                <span><strong>10:30 AM ET:</strong> +1 Hour</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mt-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span><strong>Daily Target:</strong> 40 signals (10 per time window) from {tickerCount} industry tickers using REAL data</span>
            </div>
            
            <div className="hidden sm:block flex items-center space-x-2">
              <TrendingUp className="h-3 w-3 text-blue-400" />
              <span><strong>Real-Time Processing:</strong> Live StockTwits feeds + AI sentiment analysis + historical baselines</span>
            </div>
            <p className="hidden md:block">• <strong>Enhanced Detection:</strong> Real sentiment disparity + volume anomaly scoring with historical validation</p>
            <p className="hidden lg:block">• <strong>Time Windows:</strong> Pre-market (9:00 AM) + Market hours (9:30-10:30 AM ET) with AI-powered time-weighted scoring</p>
            
            {/* Last processing efficiency indicator */}
            {lastResult?.stats && (
              <div className="mt-2 p-2 bg-slate-700 rounded text-xs">
                <div className="flex items-center justify-between">
                  <span>Last Run Efficiency:</span>
                  <span className={processingStatus.color}>
                    {lastResult.stats.processed}/{lastResult.stats.total} 
                    ({(lastResult.stats.efficiencyPercent || 0).toFixed(1)}%)
                  </span>
                </div>
                {/* Show time window of last run */}
                {lastResult.stats.time_window && (
                  <div className="flex items-center justify-between mt-1">
                    <span>Time Window:</span>
                    <span className="text-blue-400">{lastResult.stats.time_window}</span>
                  </div>
                )}
                <div className="w-full bg-slate-600 rounded-full h-1 mt-1">
                  <div 
                    className={`h-1 rounded-full ${
                      processingStatus.status === 'complete' ? 'bg-green-500' :
                      processingStatus.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(lastResult.stats.efficiencyPercent || 0, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="w-full">
          <SentimentAnalysisButton 
            onProcessingStart={handleSentimentProcessingStart}
            onProcessingEnd={handleSentimentProcessingEnd}
            onTimestampUpdate={handleSentimentTimestampUpdate}
          />
        </div>
        
        <ProcessingTimestamps 
          lastRun={lastRun} 
          lastPriceUpdate={null} 
        />
        
        <ProcessingResults 
          sentimentResult={lastResult} 
          priceResult={null} 
        />
        
        <ProcessingFeatures />
      </div>
    </Card>
  );
};
