
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Target, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDataFreshness } from '@/contexts/DataFreshnessContext';


interface SentimentAnalysisButtonProps {
  onProcessingStart: () => void;
  onProcessingEnd: (result: { success: boolean; message: string; stats?: any }) => void;
  onTimestampUpdate: (timestamp: Date) => void;
}

export const SentimentAnalysisButton = ({ 
  onProcessingStart, 
  onProcessingEnd, 
  onTimestampUpdate 
}: SentimentAnalysisButtonProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { setJobRunning } = useDataFreshness();

  const triggerIngestion = async () => {
    setIsProcessing(true);
    setJobRunning(true);
    onProcessingStart();
    
    try {
      console.log(`🎯 Triggering industry-focused analysis...`);
      
      const { data, error } = await supabase.functions.invoke('ingest-sentiment-data', {
        body: { 
          manual: true,
          industry_focused: true,
          sessionId: `manual_${Date.now()}`
        }
      });
      
      if (error) {
        throw error;
      }
      
      console.log('Industry-focused analysis response:', data);
      const timestamp = new Date();
      onTimestampUpdate(timestamp);
      
      const stats = {
        processed: data.total_tickers || 0,
        total: data.total_tickers || 0,
        anomalies: data.anomalies_found || 0,
        signals: data.top_signals_logged || 0,
        batchesProcessed: data.batches_processed || 0,
        totalBatches: data.total_batches || 0,
        maxAnomalyScore: data.max_anomaly_score || 0,
        validationStatus: data.validation_status || {},
        efficiencyPercent: data.validation_status?.efficiency_percent || 0
      };
      
      const processingComplete = stats.processed >= stats.total * 0.95;
      const validationIcon = processingComplete ? '✅' : '⚠️';
      const validationMessage = processingComplete ? 'Complete' : 'Partial';
      
      const result = { 
        success: true, 
        message: `${validationIcon} Industry Analysis ${validationMessage}: Processed ${stats.processed}/${stats.total} tickers (${stats.efficiencyPercent.toFixed(1)}%) across ${stats.batchesProcessed}/${stats.totalBatches} batches. Found ${stats.anomalies} anomalies and ${stats.signals} high-confidence signals (max score: ${stats.maxAnomalyScore.toFixed(1)}).`,
        stats
      };
      
      onProcessingEnd(result);
      
      toast({
        title: processingComplete ? "🎯 Industry Analysis Complete" : "⚠️ Industry Analysis Partial",
        description: `Processed ${stats.processed}/${stats.total} tickers (${stats.efficiencyPercent.toFixed(1)}%). Found ${stats.signals} signals across ${stats.batchesProcessed} batches.`,
        duration: 10000,
        variant: processingComplete ? "default" : "destructive",
      });
      
      if (!processingComplete) {
        console.warn(`⚠️ Manual trigger incomplete: ${stats.processed}/${stats.total} tickers processed (${stats.efficiencyPercent.toFixed(1)}%)`);
      }
      
    } catch (error) {
      console.error('Industry analysis error:', error);
      const result = { 
        success: false, 
        message: error.message || "Failed to execute industry-focused analysis" 
      };
      
      onProcessingEnd(result);
      
      toast({
        title: "Processing Failed",
        description: error.message || "Industry analysis failed. Check logs for details.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setJobRunning(false);
    }
  };

  

  return (
    <div className="space-y-2">
      <Button 
        onClick={triggerIngestion}
        disabled={isProcessing}
        className="w-full bg-green-600 hover:bg-green-700 text-sm md:text-base"
      >
        {isProcessing ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            <span className="hidden sm:inline">Processing Industry Tickers...</span>
            <span className="sm:hidden">Processing...</span>
          </>
        ) : (
          <>
            <Target className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Start Industry Analysis</span>
            <span className="sm:hidden">Industry Analysis</span>
          </>
        )}
      </Button>
      
      <div className="flex items-center justify-center text-xs text-slate-400 space-x-2">
        <CheckCircle className="h-3 w-3 text-green-500" />
        <span>Verified Scope: All Industry Tickers</span>
      </div>
    </div>
  );
};
