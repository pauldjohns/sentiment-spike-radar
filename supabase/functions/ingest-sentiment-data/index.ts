
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { TickerDeduplicationService } from './ticker-deduplication.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Market hours logic - embedded to avoid import issues
function determineTimeWindow(): string {
  const now = new Date();
  const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const day = etNow.getDay();
  const hour = etNow.getHours();
  const minute = etNow.getMinutes();
  const currentTime = hour * 60 + minute;
  
  // Weekend check
  if (day === 0 || day === 6) return 'weekend';
  
  // Pre-market: 4:00 AM - 9:30 AM ET
  if (currentTime >= 4 * 60 && currentTime < 9 * 60 + 30) return 'pre_market';
  
  // Market hours with specific windows
  if (currentTime >= 9 * 60 + 30 && currentTime < 10 * 60) return 'market_open'; // 9:30-10:00 AM
  if (currentTime >= 10 * 60 && currentTime < 10 * 60 + 30) return 'plus_30_min'; // 10:00-10:30 AM
  if (currentTime >= 10 * 60 + 30 && currentTime < 11 * 60) return 'plus_1_hr'; // 10:30-11:00 AM
  if (currentTime >= 11 * 60 && currentTime < 16 * 60) return 'market_hours'; // 11:00 AM-4:00 PM
  
  // After-hours: 4:00 PM - 8:00 PM ET
  if (currentTime >= 16 * 60 && currentTime < 20 * 60) return 'after_hours';
  
  return 'overnight';
}

// Enhanced signal detection with proper database integration
async function processSignalDetection(supabase: any, sessionId: string, test_mode: boolean = false): Promise<any> {
  console.log(`🎯 SIGNAL DETECTION: Starting enhanced processing...`);
  
  const timeWindow = determineTimeWindow();
  console.log(`📊 Current time window: ${timeWindow}`);
  
  const stats = {
    processed: 0,
    anomalies: 0,
    signals: 0,
    time_window: timeWindow
  };

  const signals: any[] = [];
  
  // ✅ DYNAMIC: Load industry tickers from database
  const { data: tickerData, error: tickerError } = await supabase
    .from('industry_tickers')
    .select('symbol')
    .order('symbol');
  
  if (tickerError) {
    console.error('❌ Failed to load industry tickers from database:', tickerError);
    throw new Error('Could not load industry tickers from database');
  }
  
  if (!tickerData || tickerData.length === 0) {
    console.error('❌ No industry tickers found in database');
    throw new Error('No industry tickers available');
  }
  
  const INDUSTRY_FOCUS_TICKERS = tickerData.map(t => t.symbol);
  console.log(`✅ Loaded ${INDUSTRY_FOCUS_TICKERS.length} industry tickers from database`);

  // ✅ Health check: Verify ticker list has sufficient coverage
  if (INDUSTRY_FOCUS_TICKERS.length < 300) {
    console.warn(`⚠️ TICKER COUNT LOW: Only ${INDUSTRY_FOCUS_TICKERS.length} tickers (expected ~357)`);
  } else {
    console.log(`✅ FULL TICKER COVERAGE: Processing ${INDUSTRY_FOCUS_TICKERS.length} industry tickers`);
  }

  // ✅ ULTRA-LOW THRESHOLDS: Process tickers with minimal detection criteria for low-volume periods
  const fallbackSignalCount = parseInt(Deno.env.get('FALLBACK_SIGNAL_COUNT') || '10', 10);

  const config = {
    minMessageVolume: 1,        // Ultra-low threshold for any activity
    volumeMultiplier: 1.1,      // Very low multiplier - even slight increases matter
    sentimentBiasThreshold: 5,  // Any sentiment bias above 5%
    highEngagementThreshold: 2, // Very low engagement threshold
    fallbackSignalCount,        // Target fallback signals from env or default
    emergencyFallbackThreshold: 0 // Allow zero-message tickers in emergency
  };

  const batchSize = test_mode ? 10 : 50;
  const tickersToProcess = INDUSTRY_FOCUS_TICKERS.slice(0, test_mode ? 20 : INDUSTRY_FOCUS_TICKERS.length);
  
  console.log(`📊 PROCESSING: ${tickersToProcess.length} tickers with LOWERED thresholds`);
  console.log(`⚙️ CONFIG: minVol=${config.minMessageVolume}, volMult=${config.volumeMultiplier}x, sentiment=${config.sentimentBiasThreshold}%, engagement=${config.highEngagementThreshold}`);

  // Collect all ticker sentiment data for fallback logic
  const allTickerData: Array<{
    ticker: string;
    messageVolume: number;
    sentimentScore: number;
    volumeMultiplier: number;
    zScore: number;
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
  }> = [];

  // Process each ticker for anomaly detection
  for (const ticker of tickersToProcess) {
    try {
      console.log(`📊 Processing ${ticker}...`);
      
      // Get recent messages (last 30 minutes)
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

      if (!recentMessages || recentMessages.length < config.minMessageVolume) {
        // ✅ RELAXED: Still track tickers with ANY messages for fallback purposes
        if (recentMessages && recentMessages.length > 0) {
          console.log(`📊 ${ticker}: Low volume but tracking (${recentMessages.length} msgs)`);
          
          // Calculate basic metrics for low-volume tickers
          const bullishCount = recentMessages.filter(m => m.sentiment_label === 'bullish').length;
          const bearishCount = recentMessages.filter(m => m.sentiment_label === 'bearish').length;
          const neutralCount = recentMessages.filter(m => m.sentiment_label === 'neutral').length;
          const sentimentScore = ((bullishCount - bearishCount) / recentMessages.length) * 100;
          
          allTickerData.push({
            ticker,
            messageVolume: recentMessages.length,
            sentimentScore,
            volumeMultiplier: 1.0,
            zScore: Math.abs(sentimentScore) / 25,
            bullishCount,
            bearishCount,
            neutralCount
          });
        } else {
          console.log(`📉 ${ticker}: No recent messages (${recentMessages?.length || 0})`);
        }
        continue;
      }

      stats.processed++;

      // Enhanced sentiment analysis (case-insensitive matching)
      const bullishCount = recentMessages.filter(m => m.sentiment_label?.toLowerCase() === 'bullish').length;
      const bearishCount = recentMessages.filter(m => m.sentiment_label?.toLowerCase() === 'bearish').length;
      const neutralCount = recentMessages.filter(m => m.sentiment_label?.toLowerCase() === 'neutral').length;
      const totalMessages = recentMessages.length;
      
      // Calculate sentiment metrics
      const sentimentRatio = bullishCount / totalMessages;
      const sentimentScore = (sentimentRatio - 0.5) * 100; // Convert to percentage
      const messageVolume = totalMessages;
      
      // Get historical baseline for volume comparison with fallback
      const { data: baseline } = await supabase
        .from('message_volume_history')
        .select('*')
        .eq('ticker', ticker)
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(7);

      // ✅ FALLBACK BASELINE: Use adaptive baseline when no history exists
      const avgVolume = baseline && baseline.length > 0 ? 
        baseline.reduce((sum: number, b: any) => sum + b.message_count, 0) / baseline.length : 
        Math.max(3, messageVolume * 0.7); // Adaptive fallback based on current volume
      
      const volumeMultiplier = avgVolume > 0 ? messageVolume / avgVolume : messageVolume / 3;
      
      // ✅ LOWERED DETECTION CRITERIA
      const isVolumeAnomaly = volumeMultiplier > config.volumeMultiplier;
      const isSentimentAnomaly = Math.abs(sentimentScore) > config.sentimentBiasThreshold;
      const hasHighEngagement = messageVolume > config.highEngagementThreshold;
      
      // Calculate z-score equivalent for scoring
      const zScore = Math.abs(sentimentScore) / 15;
      
      console.log(`📈 ${ticker}: Vol=${messageVolume} (${volumeMultiplier.toFixed(1)}x), Sentiment=${sentimentScore.toFixed(1)}%, Z=${zScore.toFixed(2)}`);
      
      // Store ticker data for potential fallback signals
      allTickerData.push({
        ticker,
        messageVolume,
        sentimentScore,
        volumeMultiplier,
        zScore,
        bullishCount,
        bearishCount,
        neutralCount
      });
      
      if ((isVolumeAnomaly || isSentimentAnomaly || hasHighEngagement) && messageVolume >= config.minMessageVolume) {
        stats.anomalies++;
        
        // ✅ LOWERED SIGNAL CRITERIA: More permissive signal generation
        if ((isVolumeAnomaly && Math.abs(sentimentScore) > 10) || // Volume + mild sentiment
            (isSentimentAnomaly && messageVolume >= config.minMessageVolume) || // Strong sentiment + min volume
            (hasHighEngagement && Math.abs(sentimentScore) > 10)) { // High engagement + mild sentiment
          const signalType = sentimentScore > 0 ? 'bullish_surge' : 'bearish_surge';
          const anomalyScore = Math.max(Math.abs(sentimentScore), volumeMultiplier * 15);
          
          console.log(`🎯 SIGNAL CANDIDATE: ${ticker} - ${signalType} (Score: ${anomalyScore.toFixed(1)})`);
          
          // Check if ticker is already selected today before creating signal
          const deduplicationResult = await TickerDeduplicationService.filterUniqueTickersForWindow(
            supabase, [ticker], timeWindow
          );
          
          if (deduplicationResult.uniqueTickers.length === 0) {
            console.warn(`⚠️ DEDUPLICATION: Skipping ${ticker} - already selected today`);
            continue;
          }
          
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
              source: 'live',
              confidence_score: Math.min(0.95, anomalyScore / 100) // Convert to 0-1 scale
            })
            .select()
            .single();
          
          if (signalError) {
            console.error(`❌ Failed to create signal for ${ticker}:`, signalError);
          } else {
            signals.push(signalData);
            stats.signals++;
            
            // Also create signal log entry for historical tracking
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
                  z_score: zScore,
                  session_id: sessionId
                }
              });
            
            console.log(`✅ SIGNAL CREATED: ${ticker} - ${signalType} (${anomalyScore.toFixed(1)} score, ${messageVolume} msgs)`);
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${ticker}:`, error);
    }
  }

  // ✅ FALLBACK LOGIC: Ensure minimum coverage by selecting top tickers even without anomalies
  if (stats.signals < config.fallbackSignalCount) {
    const initialSignalCount = stats.signals;
    let remainingNeeded = config.fallbackSignalCount - stats.signals;
    console.log(`🔁 FALLBACK MODE: Only ${stats.signals} signals detected, selecting ${remainingNeeded} additional tickers...`);

    // ✅ EMERGENCY MODE: If very little data, use any available tickers with any activity
    if (allTickerData.length === 0) {
      console.log(`🚨 EMERGENCY FALLBACK: No ticker data available, using recent message activity...`);

      const { data: emergencyTickers } = await supabase
        .from('stocktwits_messages_live')
        .select('ticker, COUNT(*) as message_count')
        .gte('created_at_stocktwits', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .group('ticker')
        .order('message_count', { ascending: false })
        .limit(15);

      if (emergencyTickers && emergencyTickers.length > 0) {
        console.log(`🚨 EMERGENCY: Found ${emergencyTickers.length} tickers with recent activity`);

        for (const emergency of emergencyTickers.slice(0, remainingNeeded)) {
          const deduplicationResult = await TickerDeduplicationService.filterUniqueTickersForWindow(
            supabase, [emergency.ticker], timeWindow
          );
          if (deduplicationResult.uniqueTickers.length === 0) {
            console.warn(`⚠️ EMERGENCY DEDUPLICATION: Skipping ${emergency.ticker} - already selected today`);
            continue;
          }

          const { data: signalData, error: signalError } = await supabase
            .from('enriched_signals')
            .insert({
              ticker: emergency.ticker,
              signal_detected_at: new Date().toISOString(),
              time_window: timeWindow,
              sentiment_type: 'emergency_fallback',
              z_score: 0.5,
              sentiment_velocity: 0,
              message_volume: emergency.message_count || 1,
              price_metadata_status: 'pending',
              evaluation_status: 'unevaluated',
              source: 'live',
              confidence_score: 0.1
            })
            .select()
            .single();

          if (!signalError) {
            signals.push(signalData);
            stats.signals++;
            remainingNeeded--;
            console.log(`🚨 EMERGENCY SIGNAL: ${emergency.ticker} (${emergency.message_count} msgs)`);
          }
        }
      }
    }

    if (remainingNeeded > 0) {
      const existingTickers = new Set(signals.map(s => s.ticker));
      console.log(`🚫 DUPLICATE CHECK: Excluding ${existingTickers.size} already selected tickers: [${Array.from(existingTickers).join(', ')}]`);

      const sortedCandidates = [...allTickerData]
        .filter(t => !existingTickers.has(t.ticker) && t.messageVolume >= config.minMessageVolume)
        .sort((a, b) => b.zScore - a.zScore || Math.abs(b.sentimentScore) - Math.abs(a.sentimentScore))
        .slice(0, remainingNeeded);

      console.log(`🎯 FALLBACK CANDIDATES: ${sortedCandidates.length} tickers selected by zScore/sentiment`);

      for (const tickerData of sortedCandidates) {
        try {
          if (signals.some(s => s.ticker === tickerData.ticker)) {
            console.log(`⚠️ DUPLICATE DETECTED: Skipping ${tickerData.ticker} - already has signal`);
            continue;
          }

          const signalType = tickerData.sentimentScore > 0 ? 'bullish_fallback' : 'bearish_fallback';
          const anomalyScore = Math.abs(tickerData.sentimentScore) + (tickerData.volumeMultiplier * 10);

          const deduplicationResult = await TickerDeduplicationService.filterUniqueTickersForWindow(
            supabase, [tickerData.ticker], timeWindow
          );
          if (deduplicationResult.uniqueTickers.length === 0) {
            console.warn(`⚠️ FALLBACK DEDUPLICATION: Skipping ${tickerData.ticker} - already selected today`);
            continue;
          }

          const { data: signalData, error: signalError } = await supabase
            .from('enriched_signals')
            .insert({
              ticker: tickerData.ticker,
              signal_detected_at: new Date().toISOString(),
              time_window: timeWindow,
              sentiment_type: signalType,
              z_score: tickerData.zScore,
              sentiment_velocity: tickerData.sentimentScore,
              message_volume: tickerData.messageVolume,
              price_metadata_status: 'pending',
              evaluation_status: 'unevaluated',
              source: 'live',
              confidence_score: Math.min(0.7, anomalyScore / 100)
            })
            .select()
            .single();

          if (signalError) {
            console.error(`❌ Failed to create fallback signal for ${tickerData.ticker}:`, signalError);
          } else {
            signals.push(signalData);
            stats.signals++;
            remainingNeeded--;

            await supabase
              .from('signal_logs')
              .insert({
                ticker: tickerData.ticker,
                signal_type: signalType,
                anomaly_score: anomalyScore,
                message_volume: tickerData.messageVolume,
                sentiment_shift_percent: tickerData.sentimentScore,
                signal_confidence: 'low',
                time_window: timeWindow,
                trigger_details: {
                  bullish_count: tickerData.bullishCount,
                  bearish_count: tickerData.bearishCount,
                  neutral_count: tickerData.neutralCount,
                  volume_multiplier: tickerData.volumeMultiplier,
                  z_score: tickerData.zScore,
                  fallback_mode: true,
                  session_id: sessionId
                }
              });

            console.log(`🎯 FALLBACK SIGNAL: ${tickerData.ticker} - ${signalType} (${anomalyScore.toFixed(1)} score, ${tickerData.messageVolume} msgs)`);
          }
        } catch (error) {
          console.error(`❌ Error creating fallback signal for ${tickerData.ticker}:`, error);
        }
      }
    }

    console.log(`🔁 Fallback logic added ${stats.signals - initialSignalCount} tickers to ensure minimum coverage of ${config.fallbackSignalCount}`);
  } else {
    console.log(`✅ Minimum coverage achieved without fallback: ${stats.signals} signals`);
  }

  // ✅ FINAL VALIDATION: Check for duplicates and log warnings
  const uniqueTickers = new Set(signals.map(s => s.ticker));
  if (uniqueTickers.size !== signals.length) {
    console.error(`❌ DUPLICATE DETECTED: Found ${signals.length} signals but only ${uniqueTickers.size} unique tickers!`);
    console.error(`📋 Signal tickers: [${signals.map(s => s.ticker).join(', ')}]`);
    
    // Remove duplicates if any exist
    const deduplicatedSignals = signals.filter((signal, index, arr) => 
      arr.findIndex(s => s.ticker === signal.ticker) === index
    );
    
    if (deduplicatedSignals.length !== signals.length) {
      console.log(`🔧 DEDUPLICATION: Removed ${signals.length - deduplicatedSignals.length} duplicate signals`);
      stats.signals = deduplicatedSignals.length;
    }
    
    console.log(`✅ SIGNAL DETECTION COMPLETE: ${stats.processed} processed, ${stats.anomalies} anomalies, ${stats.signals} unique signals (${stats.signals >= config.fallbackSignalCount ? 'normal' : 'with fallbacks'})`);
    
    return {
      success: true,
      stats,
      signals: deduplicatedSignals,
      config_used: config,
      time_window: timeWindow,
      fallback_triggered: stats.signals >= config.fallbackSignalCount ? false : true,
      duplicates_detected: true,
      duplicates_removed: signals.length - deduplicatedSignals.length
    };
  }
  
  console.log(`✅ SIGNAL DETECTION COMPLETE: ${stats.processed} processed, ${stats.anomalies} anomalies, ${stats.signals} unique signals (${stats.signals >= config.fallbackSignalCount ? 'normal' : 'with fallbacks'})`);
  
  return {
    success: true,
    stats,
    signals,
    config_used: config,
    time_window: timeWindow,
    fallback_triggered: stats.signals >= config.fallbackSignalCount ? false : true,
    duplicates_detected: false
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log('🚀 STARTING ENHANCED SENTIMENT INGESTION PIPELINE...');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody = await req.json().catch(() => ({}));
    const { 
      health_check, 
      test_mode, 
      manual_override = false, 
      automated = false,
      cron_triggered = false,
      triggered_by_cron = false // Legacy cron job compatibility
    } = requestBody;

    // Handle health check requests
    if (health_check || test_mode) {
      console.log('✅ HEALTH CHECK: Service is running');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Ingestion service is healthy',
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🔐 Request context: manual_override=${manual_override}, automated=${automated}, cron_triggered=${cron_triggered}, triggered_by_cron=${triggered_by_cron}`);

    // Allow system processes, manual overrides, automated requests, or cron triggers
    if (!manual_override && !automated && !cron_triggered && !triggered_by_cron) {
      console.log('🚫 UNAUTHORIZED: Must be triggered via CRON, manual override, or automated flag');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized - system processes only' 
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ AUTHORIZATION: Request authorized for processing');

    // Step 1: Fetch fresh StockTwits data first
    console.log('📡 Step 1: Fetching fresh StockTwits data...');
    
    try {
      const { data: fetchResult, error: fetchError } = await supabase.functions.invoke(
        'fetch-stocktwits-data',
        {
          body: { 
            ticker_batch_size: test_mode ? 5 : 15,
            test_mode: test_mode || false
          }
        }
      );

      if (fetchError) {
        console.error('❌ StockTwits fetch failed:', fetchError);
        // Don't fail completely, continue with existing data
      } else {
        console.log(`✅ StockTwits fetch completed:`, fetchResult);
      }
    } catch (fetchError) {
      console.error('❌ StockTwits fetch error:', fetchError);
      // Continue with existing data
    }

    // Step 2: Process signal detection
    console.log('🎯 Step 2: Processing signal detection...');
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🆔 SESSION: ${sessionId}`);

    const result = await processSignalDetection(supabase, sessionId, test_mode);

    if (result.success) {
      console.log('✅ SIGNAL PROCESSING COMPLETE:', result.stats);
      
      // Step 3: Trigger price enrichment for generated signals
      if (result.signals && result.signals.length > 0) {
        console.log(`💰 Step 3: Triggering price enrichment for ${result.signals.length} signals...`);
        
        for (const signal of result.signals) {
          try {
            const { error: enrichError } = await supabase.functions.invoke(
              'enrich-signal-price-metadata',
              {
                body: {
                  signal_id: signal.id,
                  immediate_price_only: false
                }
              }
            );
            
            if (enrichError) {
              console.error(`❌ Enrichment failed for signal ${signal.id}:`, enrichError);
            } else {
              console.log(`✅ Enrichment triggered for signal ${signal.id}`);
            }
          } catch (enrichError) {
            console.error(`❌ Enrichment error for signal ${signal.id}:`, enrichError);
          }
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          session_id: sessionId,
          time_window: result.stats.time_window,
          processing_stats: result.stats,
          signals_generated: result.signals?.length || 0,
          message: 'Enhanced ingestion pipeline completed successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      console.error('❌ SIGNAL PROCESSING FAILED:', result.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
          session_id: sessionId
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('❌ PIPELINE ERROR:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Check function logs for more information'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
