
import { determineTimeWindow } from './market-hours.ts';

// Import industry tickers from database query
let INDUSTRY_FOCUS_TICKERS: string[] = [];

// Initialize tickers from database
async function initializeIndustryTickers(supabase: any): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('industry_tickers')
      .select('symbol')
      .order('symbol');
    
    if (error) {
      console.error('❌ Failed to load industry tickers from database:', error);
      // Fallback to a minimal set - this should never happen in production
      INDUSTRY_FOCUS_TICKERS = ['LMT', 'RTX', 'BA', 'NOC', 'GD'];
      return;
    }
    
    INDUSTRY_FOCUS_TICKERS = data.map(t => t.symbol);
    console.log(`✅ Loaded ${INDUSTRY_FOCUS_TICKERS.length} industry tickers from database`);
  } catch (error) {
    console.error('❌ Error initializing industry tickers:', error);
    INDUSTRY_FOCUS_TICKERS = ['LMT', 'RTX', 'BA', 'NOC', 'GD']; // Emergency fallback
  }
}

export interface ProcessingStats {
  processed: number;
  anomalies: number;
  signals: number;
}

export interface BatchResult {
  success: boolean;
  stats?: ProcessingStats;
  signals?: any[];
  error?: string;
}

export async function processTickerBatch(
  supabase: any,
  sessionId: string,
  batchIndex: number,
  totalBatches: number,
  timeWindow: string
): Promise<BatchResult> {
  console.log(`🔄 PROCESSING BATCH ${batchIndex + 1}/${totalBatches} for ${timeWindow}`);
  
  try {
    // Initialize tickers from database if not already loaded
    if (INDUSTRY_FOCUS_TICKERS.length === 0) {
      await initializeIndustryTickers(supabase);
    }
    
    // Validate that we have tickers
    if (INDUSTRY_FOCUS_TICKERS.length === 0) {
      throw new Error('No industry tickers available from database');
    }
    
    const batchSize = 75; // Process larger batches for better coverage
    const startIndex = batchIndex * batchSize;
    const tickersToProcess = INDUSTRY_FOCUS_TICKERS.slice(startIndex, startIndex + batchSize);
    
    console.log(`🎯 BATCH ${batchIndex + 1}: Processing ${tickersToProcess.length} tickers (${startIndex}-${startIndex + tickersToProcess.length - 1})`);
    
    if (tickersToProcess.length === 0) {
      console.log(`✅ BATCH ${batchIndex + 1}: No more tickers to process`);
      return { success: true, stats: { processed: 0, anomalies: 0, signals: 0 } };
    }
    
    const stats: ProcessingStats = {
      processed: 0,
      anomalies: 0,
      signals: 0
    };

    const signals: any[] = [];

    // Process tickers for signal detection
    for (const ticker of tickersToProcess) {
      console.log(`📊 Processing ${ticker}...`);
      
      // Check for recent StockTwits messages (last 30 minutes)
      const { data: recentMessages, error: messagesError } = await supabase
        .from('stocktwits_messages_live')
        .select('*')
        .eq('ticker', ticker)
        .gte('created_at_stocktwits', new Date(Date.now() - 30 * 60 * 1000).toISOString())
        .order('created_at_stocktwits', { ascending: false })
        .limit(100);

      if (messagesError) {
        console.warn(`⚠️ Failed to fetch messages for ${ticker}:`, messagesError);
        continue;
      }

      if (!recentMessages || recentMessages.length < 3) {
        console.log(`📉 ${ticker}: Insufficient recent messages (${recentMessages?.length || 0})`);
        continue;
      }

      stats.processed++;

      // Enhanced sentiment analysis
      const bullishCount = recentMessages.filter(m => m.sentiment_label === 'Bullish').length;
      const bearishCount = recentMessages.filter(m => m.sentiment_label === 'Bearish').length;
      const neutralCount = recentMessages.filter(m => m.sentiment_label === 'Neutral').length;
      const totalMessages = recentMessages.length;
      
      if (totalMessages === 0) continue;

      // Calculate sentiment metrics
      const sentimentRatio = bullishCount / totalMessages;
      const sentimentScore = (sentimentRatio - 0.5) * 100;
      const messageVolume = totalMessages;
      
      // Check for historical baseline
      const { data: baseline } = await supabase
        .from('message_volume_history')
        .select('*')
        .eq('ticker', ticker)
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(7);

      const avgVolume = baseline && baseline.length > 0 ? 
        baseline.reduce((sum, b) => sum + b.message_count, 0) / baseline.length : 10;
      
      const volumeMultiplier = avgVolume > 0 ? messageVolume / avgVolume : messageVolume / 10;
      
      // Enhanced anomaly detection with diversity scoring preparation
      const isVolumeAnomaly = volumeMultiplier > 2.0; // 2x normal volume
      const isSentimentAnomaly = Math.abs(sentimentScore) > 25; // Strong sentiment bias
      const hasHighEngagement = messageVolume > 15; // High absolute engagement
      
      // Calculate z-score equivalent
      const zScore = Math.abs(sentimentScore) / 10; // Normalize sentiment to z-score scale
      
      // Calculate user diversity for scoring
      const uniqueUsers = new Set(recentMessages.map(m => m.username)).size;
      const userGrowth = Math.min(uniqueUsers / messageVolume, 1.0);
      
      if ((isVolumeAnomaly || isSentimentAnomaly || hasHighEngagement) && messageVolume >= 5) {
        stats.anomalies++;
        
        // Create enhanced signal with proper data structure
        if ((isVolumeAnomaly && isSentimentAnomaly) || (hasHighEngagement && Math.abs(sentimentScore) > 15)) {
          const signalType = sentimentScore > 0 ? 'bullish_surge' : 'bearish_surge';
          const anomalyScore = Math.max(Math.abs(sentimentScore), volumeMultiplier * 10);
          
          // Insert signal into enriched_signals table
          const { data: signalData, error: signalError } = await supabase
            .from('enriched_signals')
            .insert({
              ticker: ticker,
              signal_detected_at: new Date().toISOString(),
              time_window: timeWindow,
              sentiment_type: signalType,
              z_score: zScore,
              sentiment_velocity: sentimentScore,
              message_volume: messageVolume,
              price_metadata_status: 'pending',
              evaluation_status: 'unevaluated',
              source: 'live'
            })
            .select()
            .single();
          
          if (signalError) {
            console.error(`❌ Failed to create signal for ${ticker}:`, signalError);
          } else {
            signals.push(signalData);
            stats.signals++;
            
            // Also log to signal_logs for historical tracking
            await supabase
              .from('signal_logs')
              .insert({
                ticker: ticker,
                signal_type: signalType,
                anomaly_score: anomalyScore,
                message_volume: messageVolume,
                sentiment_shift_percent: sentimentScore,
                signal_confidence: anomalyScore > 50 ? 'high' : 'medium',
                time_window: timeWindow,
                trigger_details: {
                  bullish_count: bullishCount,
                  bearish_count: bearishCount,
                  neutral_count: neutralCount,
                  volume_multiplier: volumeMultiplier,
                  z_score: zScore
                }
              });
            
            console.log(`🎯 SIGNAL CREATED: ${ticker} - ${signalType} (${anomalyScore.toFixed(1)} score, ${messageVolume} msgs)`);
          }
        }
      }
    }

    console.log(`✅ BATCH ${batchIndex + 1} COMPLETE: ${stats.processed} processed, ${stats.anomalies} anomalies, ${stats.signals} signals`);
    
    return {
      success: true,
      stats,
      signals
    };

  } catch (error) {
    console.error(`❌ BATCH ${batchIndex + 1} ERROR:`, error);
    return {
      success: false,
      error: error.message,
      stats: { processed: 0, anomalies: 0, signals: 0 }
    };
  }
}

// Export additional utility functions
export async function validateTickerData(supabase: any, ticker: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('stocktwits_messages_live')
      .select('count')
      .eq('ticker', ticker)
      .limit(1);
    
    return !error;
  } catch (error) {
    return false;
  }
}

export function calculateSentimentMetrics(messages: any[]): {
  sentimentScore: number;
  volumeScore: number;
  diversityScore: number;
} {
  if (!messages || messages.length === 0) {
    return { sentimentScore: 0, volumeScore: 0, diversityScore: 0 };
  }

  const bullishCount = messages.filter(m => m.sentiment_label === 'Bullish').length;
  const totalMessages = messages.length;
  const uniqueUsers = new Set(messages.map(m => m.username)).size;
  
  const sentimentScore = totalMessages > 0 ? (bullishCount / totalMessages - 0.5) * 100 : 0;
  const volumeScore = Math.min(totalMessages / 10, 10); // Cap at 10
  const diversityScore = Math.min(uniqueUsers, 10); // Cap at 10
  
  return {
    sentimentScore,
    volumeScore,
    diversityScore
  };
}
