
import { determineTimeWindow } from './market-hours.ts';
import { processTickerBatch } from './stocktwits-ingestion-service.ts';
import { createEnrichedSignalEntry } from './signal-enrichment-integration.ts';

export interface ProcessingResult {
  batchesCompleted: number;
  totalProcessed: number;
  totalAnomalies: number;
  totalSignals: number;
  totalIngestionStats: any;
}

export async function processBatches(
  supabase: any,
  sessionId: string,
  startTime: number
): Promise<ProcessingResult> {
  console.log('🚀 BATCH PROCESSOR: Starting complete ingestion cycle...');
  
  let batchesCompleted = 0;
  let totalProcessed = 0;
  let totalAnomalies = 0;
  let totalSignals = 0;
  let totalIngestionStats = {};

  try {
    // Process industry-focused batch
    const currentTimeWindow = determineTimeWindow();
    console.log(`⏰ PROCESSING TIME WINDOW: ${currentTimeWindow}`);
    
    const batchResult = await processTickerBatch(
      supabase,
      sessionId,
      0, // batch index
      1, // total batches
      currentTimeWindow
    );

    if (batchResult.success) {
      batchesCompleted = 1;
      totalProcessed = batchResult.stats?.processed || 0;
      totalAnomalies = batchResult.stats?.anomalies || 0;
      totalSignals = batchResult.stats?.signals || 0;
      totalIngestionStats = batchResult.stats || {};

      // Process signals for enrichment
      if (batchResult.signals && batchResult.signals.length > 0) {
        console.log(`🎯 ENRICHING ${batchResult.signals.length} signals...`);
        
        for (const signal of batchResult.signals) {
          try {
            const enrichmentResult = await createEnrichedSignalEntry(supabase, {
              ticker: signal.ticker,
              time_window: currentTimeWindow,
              sentiment_type: signal.signal_type || 'sentiment_anomaly',
              z_score: signal.anomaly_score || 0,
              sentiment_velocity: signal.sentiment_shift_percent || 0,
              message_volume: signal.message_volume || 0,
              anomaly_score: signal.anomaly_score || 0,
              signal_confidence: signal.signal_confidence || 'medium'
            });

            if (enrichmentResult.success) {
              console.log(`✅ ENRICHED: ${signal.ticker} -> ${enrichmentResult.enriched_signal_id}`);
            } else {
              console.log(`⚠️ ENRICHMENT SKIPPED: ${signal.ticker}`);
            }
          } catch (enrichError) {
            console.error(`❌ ENRICHMENT ERROR for ${signal.ticker}:`, enrichError);
            // Continue processing other signals
          }
        }
      }
    }

    const executionTime = Date.now() - startTime;
    console.log(`✅ BATCH PROCESSING COMPLETE: ${executionTime}ms`);
    console.log(`📊 Processed: ${totalProcessed}, Anomalies: ${totalAnomalies}, Signals: ${totalSignals}`);

    return {
      batchesCompleted,
      totalProcessed,
      totalAnomalies,
      totalSignals,
      totalIngestionStats
    };

  } catch (error) {
    console.error('❌ BATCH PROCESSOR ERROR:', error);
    throw error;
  }
}
