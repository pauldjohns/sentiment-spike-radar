import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Market hours logic
function determineTimeWindow(): string {
  const now = new Date();
  const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const day = etNow.getDay();
  const hour = etNow.getHours();
  const minute = etNow.getMinutes();
  const currentTime = hour * 60 + minute;
  
  if (day === 0 || day === 6) return 'weekend';
  if (currentTime >= 4 * 60 && currentTime < 9 * 60 + 30) return 'pre_market';
  if (currentTime >= 9 * 60 + 30 && currentTime < 10 * 60) return 'market_open';
  if (currentTime >= 10 * 60 && currentTime < 10 * 60 + 30) return 'plus_30_min';
  if (currentTime >= 10 * 60 + 30 && currentTime < 11 * 60) return 'plus_1_hr';
  if (currentTime >= 11 * 60 && currentTime < 16 * 60) return 'market_hours';
  if (currentTime >= 16 * 60 && currentTime < 20 * 60) return 'after_hours';
  return 'overnight';
}

// Diversity scoring implementation
async function applyDiversityScoring(
  candidates: SignalResult[],
  supabase: any,
  targetCount: number
): Promise<DiversitySelectionResult> {
  console.log(`🎯 Starting diversity scoring for ${candidates.length} candidates`);

  // Get last selection dates for recency penalty
  const tickers = candidates.map(c => c.ticker);
  const { data: recentSignals } = await supabase
    .from('enriched_signals')
    .select('ticker, signal_detected_at')
    .in('ticker', tickers)
    .gte('signal_detected_at', new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()) // Last 5 days
    .order('signal_detected_at', { ascending: false });

  // Get sector mapping
  const { data: sectorData } = await supabase
    .from('industry_tickers')
    .select('symbol, sector')
    .in('symbol', tickers);

  const lastSelectionDates: Record<string, string> = {};
  recentSignals?.forEach((signal: any) => {
    if (!lastSelectionDates[signal.ticker]) {
      lastSelectionDates[signal.ticker] = signal.signal_detected_at;
    }
  });

  const sectorMapping: Record<string, string> = {};
  sectorData?.forEach((ticker: any) => {
    if (ticker.sector) {
      sectorMapping[ticker.symbol] = ticker.sector;
    }
  });

  // Calculate composite scores with diversity factors
  const scoredCandidates = candidates.map(candidate => {
    // Calculate composite signal score
    const sentiment_spike_score = Math.abs(candidate.sentimentScore);
    const volume_ratio = candidate.volumeMultiplier;
    const user_growth = candidate.userGrowth || 0;
    const anomaly_score = candidate.anomalyScore;

    const signal_score = (
      0.4 * Math.min(sentiment_spike_score, 100) +
      0.3 * Math.min(volume_ratio * 25, 100) +
      0.2 * Math.min(user_growth * 10, 100) +
      0.1 * Math.min(anomaly_score, 100)
    );

    // Calculate recency penalty
    const lastSelected = lastSelectionDates[candidate.ticker];
    let recency_penalty = 0;
    if (lastSelected) {
      const daysSince = Math.floor((Date.now() - new Date(lastSelected).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince < 5) {
        recency_penalty = (5 - daysSince) * 0.1;
      }
    }

    return {
      ...candidate,
      signal_score,
      recency_penalty,
      adjusted_score: signal_score - recency_penalty,
      sector: sectorMapping[candidate.ticker],
      last_selected_date: lastSelected
    };
  });

  // Sort by adjusted score
  scoredCandidates.sort((a, b) => b.adjusted_score - a.adjusted_score);

  const selectedSignals: SignalResult[] = [];
  const rejectedDueToRecency: string[] = [];
  const sectorCounts: Record<string, number> = {};

  // Selection with sector diversity
  for (const candidate of scoredCandidates) {
    // Check recency rejection
    if (candidate.recency_penalty > 0.3) {
      rejectedDueToRecency.push(candidate.ticker);
      continue;
    }

    // Check sector cap (max 3 per sector)
    if (candidate.sector) {
      const currentSectorCount = sectorCounts[candidate.sector] || 0;
      if (currentSectorCount >= 3) {
        continue; // Skip if sector is full
      }
      sectorCounts[candidate.sector] = currentSectorCount + 1;
    }

    selectedSignals.push(candidate);

    if (selectedSignals.length >= targetCount) break;
  }

  // Fallback if not enough selected
  let fallbackUsed = false;
  if (selectedSignals.length < targetCount) {
    fallbackUsed = true;
    const remaining = scoredCandidates
      .filter(c => !selectedSignals.includes(c) && c.recency_penalty === 0)
      .filter(c => c.messageVolume >= 3);

    const fillCount = targetCount - selectedSignals.length;
    const randomExtras = remaining
      .sort(() => Math.random() - 0.5)
      .slice(0, fillCount);
    
    selectedSignals.push(...randomExtras);
  }

  const scores = scoredCandidates.map(c => c.signal_score);
  const selectedScores = selectedSignals.map(c => c.adjusted_score);

  return {
    selectedSignals,
    totalCandidates: candidates.length,
    maxSignalScore: Math.max(...scores),
    minSelectedScore: Math.min(...selectedScores),
    rejectedDueToRecency,
    fallbackUsed,
    finalTickers: selectedSignals.map(s => s.ticker)
  };
}

interface SignalResult {
  ticker: string;
  messageVolume: number;
  sentimentScore: number;
  volumeMultiplier: number;
  zScore: number;
  anomalyScore: number;
  signalType: string;
  confidence: string;
  userGrowth?: number;
  sector?: string;
}

interface DiversitySelectionResult {
  selectedSignals: SignalResult[];
  totalCandidates: number;
  maxSignalScore: number;
  minSelectedScore: number;
  rejectedDueToRecency: string[];
  fallbackUsed: boolean;
  finalTickers: string[];
}

async function processManualSignalSelection(supabase: any): Promise<{
  runId: string;
  timeWindow: string;
  selectedSignals: SignalResult[];
  totalEligible: number;
  timestamp: string;
}> {
  const timestamp = new Date().toISOString();
  const runId = `manual-${Date.now()}`;
  const timeWindow = determineTimeWindow();
  
  console.log(`🧪 MANUAL SIGNAL SELECTION: Starting run ${runId}`);
  console.log(`📊 Time window: ${timeWindow}`);

  // Load industry tickers from database
  const { data: tickerData, error: tickerError } = await supabase
    .from('industry_tickers')
    .select('symbol')
    .order('symbol');
  
  if (tickerError) {
    console.error('❌ Failed to load industry tickers:', tickerError);
    throw new Error('Could not load industry tickers from database');
  }
  
  if (!tickerData || tickerData.length === 0) {
    throw new Error('No industry tickers available');
  }
  
  const INDUSTRY_FOCUS_TICKERS = tickerData.map(t => t.symbol);
  console.log(`✅ Processing ${INDUSTRY_FOCUS_TICKERS.length} industry tickers`);

  // Signal detection configuration
  const config = {
    minMessageVolume: 3,
    volumeMultiplier: 1.5,
    sentimentBiasThreshold: 15,
    highEngagementThreshold: 8,
    targetSignalCount: 10
  };

  const allTickerData: SignalResult[] = [];

  // Process each ticker for signal detection
  for (const ticker of INDUSTRY_FOCUS_TICKERS) {
    try {
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

      if (!recentMessages || recentMessages.length < config.minMessageVolume) {
        continue;
      }

      // Calculate sentiment metrics
      const bullishCount = recentMessages.filter(m => m.sentiment_label === 'Bullish').length;
      const bearishCount = recentMessages.filter(m => m.sentiment_label === 'Bearish').length;
      const totalMessages = recentMessages.length;
      
      const sentimentRatio = bullishCount / totalMessages;
      const sentimentScore = (sentimentRatio - 0.5) * 100;
      const messageVolume = totalMessages;
      
      // Get historical baseline
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
      const zScore = Math.abs(sentimentScore) / 10;
      
      // Calculate user growth for diversity scoring
      const uniqueUsers = new Set(recentMessages.map(m => m.username)).size;
      const userGrowth = Math.min(uniqueUsers / messageVolume, 1.0); // Ratio of unique users to messages
      
      // Anomaly detection
      const isVolumeAnomaly = volumeMultiplier > config.volumeMultiplier;
      const isSentimentAnomaly = Math.abs(sentimentScore) > config.sentimentBiasThreshold;
      const hasHighEngagement = messageVolume > config.highEngagementThreshold;
      
      if ((isVolumeAnomaly || isSentimentAnomaly || hasHighEngagement) && messageVolume >= config.minMessageVolume) {
        const signalType = sentimentScore > 0 ? 'bullish_surge' : 'bearish_surge';
        const anomalyScore = Math.max(Math.abs(sentimentScore), volumeMultiplier * 10);
        const confidence = anomalyScore > 50 ? 'high' : anomalyScore > 25 ? 'medium' : 'low';
        
        allTickerData.push({
          ticker,
          messageVolume,
          sentimentScore,
          volumeMultiplier,
          zScore,
          anomalyScore,
          signalType,
          confidence,
          userGrowth
        });
      }
    } catch (error) {
      console.warn(`⚠️ Error processing ticker ${ticker}:`, error);
    }
  }

  // Apply diversity scoring algorithm
  const diversityResult = await applyDiversityScoring(allTickerData, supabase, config.targetSignalCount);
  let selectedSignals = diversityResult.selectedSignals;

  // ✅ ENFORCE UNIQUE TICKER SELECTION USING SHARED DEDUPLICATION SERVICE
  // Create a shared deduplication module for consistency
  const filterUniqueSignalsForWindow = async (
    supabase: any,
    candidates: SignalResult[],
    timeWindow: string
  ) => {
    const seenInWindow = new Set<string>();
    const skippedDuplicatesInWindow: string[] = [];
    const skippedDuplicatesFromOtherWindows: string[] = [];
    const uniqueSignals: SignalResult[] = [];

    // Get start of today in ISO format
    const startOfTodayISO = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';

    // Check which tickers were already selected today
    const { data: alreadySelectedToday } = await supabase
      .from('enriched_signals')
      .select('ticker')
      .gte('signal_detected_at', startOfTodayISO);

    const selectedTodaySet = new Set(
      alreadySelectedToday?.map((signal: any) => signal.ticker) || []
    );

    console.log(`📊 Deduplication check: ${selectedTodaySet.size} tickers already selected today`);

    for (const signal of candidates) {
      // Check for duplicates within this window
      if (seenInWindow.has(signal.ticker)) {
        skippedDuplicatesInWindow.push(signal.ticker);
        console.warn(`⚠️ Skipping ${signal.ticker} - duplicate in window ${timeWindow}`);
        continue;
      }

      // Check for duplicates from other windows today
      if (selectedTodaySet.has(signal.ticker)) {
        skippedDuplicatesFromOtherWindows.push(signal.ticker);
        console.warn(`⚠️ Skipping ${signal.ticker} - already selected earlier today`);
        continue;
      }

      // Signal is unique for today and this window
      seenInWindow.add(signal.ticker);
      uniqueSignals.push(signal);
    }

    return {
      uniqueSignals,
      skippedDuplicatesInWindow,
      skippedDuplicatesFromOtherWindows
    };
  };

  const deduplicationResult = await filterUniqueSignalsForWindow(supabase, selectedSignals, timeWindow);
  selectedSignals = deduplicationResult.uniqueSignals;

  console.log(`🎯 Selected ${selectedSignals.length} signals from ${allTickerData.length} candidates`);
  console.log('🎯 Diversity Selection Results:', {
    total_candidates_considered: diversityResult.totalCandidates,
    max_signal_score: diversityResult.maxSignalScore,
    min_selected_score: diversityResult.minSelectedScore,
    rejected_due_to_recency: diversityResult.rejectedDueToRecency,
    fallback_used: diversityResult.fallbackUsed,
    final_tickers: diversityResult.finalTickers,
    skipped_duplicates_in_window: deduplicationResult.skippedDuplicatesInWindow,
    skipped_duplicates_from_other_windows: deduplicationResult.skippedDuplicatesFromOtherWindows
  });

  // Store signals in enriched_signals table with manual tagging
  for (const signal of selectedSignals) {
    try {
      const { error: insertError } = await supabase
        .from('enriched_signals')
        .insert({
          ticker: signal.ticker,
          signal_detected_at: timestamp,
          time_window: `${timeWindow}_manual`,
          sentiment_type: signal.signalType,
          z_score: signal.zScore,
          sentiment_velocity: signal.sentimentScore,
          message_volume: signal.messageVolume,
          price_metadata_status: 'pending',
          evaluation_status: 'unevaluated',
          source: 'manual',
          confidence_score: signal.anomalyScore / 100
        });
      
      if (insertError) {
        console.error(`❌ Failed to store signal for ${signal.ticker}:`, insertError);
      }
    } catch (error) {
      console.error(`❌ Error storing signal for ${signal.ticker}:`, error);
    }
  }

  // Also log to signal_logs for tracking
  for (const signal of selectedSignals) {
    await supabase
      .from('signal_logs')
      .insert({
        ticker: signal.ticker,
        signal_type: signal.signalType,
        anomaly_score: signal.anomalyScore,
        message_volume: signal.messageVolume,
        sentiment_shift_percent: signal.sentimentScore,
        signal_confidence: signal.confidence,
        time_window: `${timeWindow}_manual`,
        trigger_details: {
          trigger_type: 'manual',
          run_id: runId,
          volume_multiplier: signal.volumeMultiplier,
          z_score: signal.zScore,
          timestamp: timestamp
        }
      });
  }

  return {
    runId,
    timeWindow,
    selectedSignals,
    totalEligible: INDUSTRY_FOCUS_TICKERS.length,
    timestamp
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 MANUAL SIGNAL TRIGGER: Starting manual signal selection...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const result = await processManualSignalSelection(supabaseClient);

    console.log(`✅ MANUAL TRIGGER COMPLETE: ${result.selectedSignals.length} signals selected`);

    return new Response(
      JSON.stringify({
        success: true,
        result: {
          ...result,
          summary: {
            trigger_type: 'manual',
            total_eligible_tickers: result.totalEligible,
            signals_detected: result.selectedSignals.length,
            unique_tickers: result.selectedSignals.length,
            timestamp: result.timestamp
          }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ MANUAL TRIGGER ERROR:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});