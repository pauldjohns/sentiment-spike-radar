
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ProcessingResult {
  success: boolean;
  message: string;
  stats?: any;
}

interface ProcessingResultsProps {
  sentimentResult: ProcessingResult | null;
  priceResult: ProcessingResult | null;
}

export const ProcessingResults = ({ sentimentResult, priceResult }: ProcessingResultsProps) => {
  return (
    <>
      {sentimentResult && (
        <div className={`text-xs p-2 md:p-3 rounded ${
          sentimentResult.success ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
        }`}>
          <div className="flex items-start space-x-2">
            {sentimentResult.success ? (
              <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            )}
            <div className="space-y-1">
              <div className="break-words">{sentimentResult.message}</div>
              {sentimentResult.stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 text-xs">
                  <div>✅ Processed: {sentimentResult.stats.processed}/{sentimentResult.stats.total}</div>
                  <div>📊 Success: {sentimentResult.stats.successRate}</div>
                  <div>💬 Messages: {sentimentResult.stats.messages?.toLocaleString()}</div>
                  <div>🎯 High Prob: {sentimentResult.stats.highProbabilityCandidates || 0}</div>
                  <div>⏱️ Time: {sentimentResult.stats.processingTimeSeconds}s</div>
                  <div className="hidden md:block">📦 Batches: {sentimentResult.stats.batchesProcessed}/{sentimentResult.stats.totalBatches}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {priceResult && (
        <div className={`text-xs p-2 md:p-3 rounded ${
          priceResult.success ? 'bg-blue-900/30 text-blue-300' : 'bg-red-900/30 text-red-300'
        }`}>
          <div className="flex items-start space-x-2">
            {priceResult.success ? (
              <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            )}
            <div className="space-y-1">
              <div className="break-words">{priceResult.message}</div>
              {priceResult.stats && (
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div>💰 Updated: {priceResult.stats.updated}</div>
                  <div>📊 Processed: {priceResult.stats.processed}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
