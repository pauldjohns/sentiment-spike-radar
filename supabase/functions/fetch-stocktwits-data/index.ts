
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DateTime } from "https://esm.sh/luxon@3.4.4"
import { enforceStockTwitsRateLimit } from '../stocktwits-rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Industry focus tickers - loaded dynamically from database
let INDUSTRY_FOCUS_TICKERS: string[] = [];

// Ticker rotation state for enhanced coverage
interface TickerRotationState {
  currentGroup: number;
  lastRotation: number;
  tickerGroups: string[][];
  activeTickerPriority: Map<string, number>;
}

let rotationState: TickerRotationState = {
  currentGroup: 0,
  lastRotation: 0,
  tickerGroups: [],
  activeTickerPriority: new Map()
};

// Initialize tickers from database with rotation setup
async function initializeIndustryTickers(supabase: any): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('industry_tickers')
      .select('symbol')
      .order('symbol');
    
    if (error) {
      console.error('❌ Failed to load industry tickers from database:', error);
      // Emergency fallback - this should never happen in production
      INDUSTRY_FOCUS_TICKERS = ['LMT', 'RTX', 'BA', 'NOC', 'GD'];
      setupTickerRotation();
      return;
    }
    
    INDUSTRY_FOCUS_TICKERS = data.map(t => t.symbol);
    console.log(`✅ Loaded ${INDUSTRY_FOCUS_TICKERS.length} industry tickers from database`);
    
    // Initialize ticker priority based on historical activity
    await loadTickerPriority(supabase);
    setupTickerRotation();
    
  } catch (error) {
    console.error('❌ Error initializing industry tickers:', error);
    INDUSTRY_FOCUS_TICKERS = ['LMT', 'RTX', 'BA', 'NOC', 'GD']; // Emergency fallback
    setupTickerRotation();
  }
}

// Load ticker priority based on recent message volume
async function loadTickerPriority(supabase: any): Promise<void> {
  try {
    const { data } = await supabase
      .from('stocktwits_messages_live')
      .select('ticker, COUNT(*) as message_count')
      .gte('created_at_stocktwits', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .groupBy('ticker')
      .order('message_count', { ascending: false });
    
    if (data) {
      data.forEach((item: any) => {
        rotationState.activeTickerPriority.set(item.ticker, item.message_count || 1);
      });
      console.log(`📊 Loaded priority data for ${data.length} active tickers`);
    }
  } catch (error) {
    console.log('⚠️ Could not load ticker priority data, using equal weighting');
  }
}

// Setup ticker rotation groups for 4-hour full coverage
function setupTickerRotation(): void {
  const tickersPerGroup = Math.ceil(INDUSTRY_FOCUS_TICKERS.length / 4);
  rotationState.tickerGroups = [];
  
  // Sort tickers by priority (high activity first)
  const sortedTickers = [...INDUSTRY_FOCUS_TICKERS].sort((a, b) => {
    const priorityA = rotationState.activeTickerPriority.get(a) || 1;
    const priorityB = rotationState.activeTickerPriority.get(b) || 1;
    return priorityB - priorityA;
  });
  
  // Create balanced groups with mix of high and low priority tickers
  for (let i = 0; i < 4; i++) {
    rotationState.tickerGroups[i] = [];
  }
  
  sortedTickers.forEach((ticker, index) => {
    const groupIndex = index % 4;
    rotationState.tickerGroups[groupIndex].push(ticker);
  });
  
  console.log(`🔄 Setup ticker rotation: 4 groups with ${rotationState.tickerGroups.map(g => g.length).join(', ')} tickers each`);
}

// Get current ticker batch based on rotation and market window with 24/7 smart throttling
function getCurrentTickerBatch(marketWindow: string, batchSize: number): string[] {
  // Detect current time in US Eastern Time
  const nowET = DateTime.now().setZone('America/New_York');
  const currentHourET = nowET.hour;
  const minuteIndex = nowET.minute;
  
  console.log(`🕐 Current ET time: ${nowET.toFormat('HH:mm')} (Hour: ${currentHourET})`);
  
  let tickersToFetch: string[];
  let actualBatchSize = batchSize;
  
  if (currentHourET >= 9 && currentHourET < 17) {
    // Market hours: rotate full industry_tickers set with enhanced coverage
    console.log(`📈 MARKET HOURS: Using full ticker rotation strategy`);
    
    const now = Date.now();
    const hoursSinceRotation = (now - rotationState.lastRotation) / (1000 * 60 * 60);
    
    // Rotate groups every hour for 4-hour full coverage
    if (hoursSinceRotation >= 1) {
      rotationState.currentGroup = (rotationState.currentGroup + 1) % 4;
      rotationState.lastRotation = now;
      console.log(`🔄 Rotating to ticker group ${rotationState.currentGroup + 1}/4`);
    }
    
    const currentGroupTickers = rotationState.tickerGroups[rotationState.currentGroup] || [];
    
    // Market-specific prioritization
    let prioritizedTickers = [...currentGroupTickers];
    if (marketWindow === 'pre_market') {
      // Prioritize earnings/news sensitive tickers
      prioritizedTickers = currentGroupTickers.sort((a, b) => {
        const priorityA = rotationState.activeTickerPriority.get(a) || 1;
        const priorityB = rotationState.activeTickerPriority.get(b) || 1;
        return priorityB - priorityA;
      });
    }
    
    tickersToFetch = prioritizedTickers.slice(0, actualBatchSize);
  } else {
    // After hours: pull from priority list with reduced rate
    console.log(`🌙 AFTER HOURS: Using priority ticker strategy with reduced rate`);
    actualBatchSize = Math.min(1, batchSize); // Reduce to 1 ticker per run
    
    // Get top priority tickers (recently active or high volume)
    const priorityTickers = Array.from(rotationState.activeTickerPriority.entries())
      .sort(([,a], [,b]) => b - a) // Sort by priority score descending
      .slice(0, 50) // Top 50 priority tickers
      .map(([ticker]) => ticker);
    
    // If no priority tickers, fall back to first 50 from industry list
    const fallbackTickers = priorityTickers.length > 0 ? priorityTickers : INDUSTRY_FOCUS_TICKERS.slice(0, 50);
    
    // Use deterministic rotation based on minute to avoid overlaps
    // Rotate every 10 minutes through the priority list
    const rotationOffset = Math.floor(minuteIndex / 10) % fallbackTickers.length;
    tickersToFetch = [fallbackTickers[rotationOffset]];
    
    console.log(`🎯 After-hours selection: ${tickersToFetch[0]} (offset: ${rotationOffset})`);
  }
  
  console.log(`📊 Selected ${tickersToFetch.length} tickers for processing: ${tickersToFetch.join(', ')}`);
  return tickersToFetch;
}

// Get priority tickers from recently signaled or high-volume tickers
async function getPriorityTickers(supabase: any): Promise<string[]> {
  try {
    // Get recently signaled tickers from last 7 days
    const { data: recentSignals } = await supabase
      .from('enriched_signals')
      .select('ticker')
      .gte('signal_detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('signal_detected_at', { ascending: false })
      .limit(25);
    
    // Get high-volume tickers from last 24 hours
    const { data: activeTickersData } = await supabase
      .from('stocktwits_messages_live')
      .select('ticker')
      .gte('created_at_stocktwits', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(25);
    
    const signalTickers = recentSignals?.map(s => s.ticker) || [];
    const activeTickers = activeTickersData?.map(a => a.ticker) || [];
    
    // Combine and deduplicate
    const prioritySet = new Set([...signalTickers, ...activeTickers]);
    const priorityList = Array.from(prioritySet);
    
    console.log(`🏆 Generated priority list: ${priorityList.length} tickers`);
    return priorityList.length > 0 ? priorityList : INDUSTRY_FOCUS_TICKERS.slice(0, 50);
    
  } catch (error) {
    console.warn('⚠️ Could not fetch priority tickers, using fallback:', error);
    return INDUSTRY_FOCUS_TICKERS.slice(0, 50);
  }
}

// Rate limiting for StockTwits API
async function fetchStockTwitsMessages(
  supabase: any,
  apiKey: string,
  ticker: string
): Promise<any[]> {
  try {
    await enforceStockTwitsRateLimit(supabase, apiKey);

    const url = `https://api.stocktwits.com/api/2/streams/symbol/${ticker}.json?limit=30`;
    console.log(`📡 Fetching StockTwits messages for ${ticker}...`);

    let attempt = 0;
    while (true) {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SentimentAnalyzer/1.0',
          'Accept': 'application/json'
        }
      });

      if (response.status === 429) {
        const backoff = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 1000);
        console.warn(`⚠️ Rate limit hit for ${ticker}, backing off ${backoff}ms (attempt ${attempt + 1})`);
        attempt++;
        await new Promise(res => setTimeout(res, backoff));
        continue;
      }

      if (!response.ok) {
        throw new Error(`StockTwits API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.messages || data.messages.length === 0) {
        console.log(`📭 No messages found for ${ticker}`);
        return [];
      }

      console.log(`✅ Fetched ${data.messages.length} messages for ${ticker}`);
      return data.messages;
    }
  } catch (error) {
    console.error(`❌ Error fetching messages for ${ticker}:`, error);
    return [];
  }
}

async function analyzeSentimentWithHuggingFace(message: string): Promise<{ label: string; confidence: number }> {
  try {
    const huggingfaceApiKey = Deno.env.get('HUGGINGFACE_API_KEY');
    if (!huggingfaceApiKey) {
      console.warn('⚠️ HUGGINGFACE_API_KEY not configured, using rule-based fallback');
      return ruleBasedSentiment(message);
    }

    console.log(`🧠 Analyzing sentiment for: "${message.slice(0, 50)}..."`);

    const response = await fetch(
      'https://api-inference.huggingface.co/models/Tonealabs/fin-albert-large-finetuned-financial-sentiment',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${huggingfaceApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: message.slice(0, 512), // Truncate to model limit
        }),
      }
    );

    if (!response.ok) {
      console.error(`⚠️ HuggingFace API failed: ${response.status}`);
      return ruleBasedSentiment(message);
    }

    const result = await response.json();
    console.log(`🎯 FinALBERT response:`, result);
    
    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
      const topResult = result[0][0]; // First result from first array
      
      // Map FinALBERT labels to our format (lowercase to match DB constraint)
      let label = 'neutral';
      if (topResult.label === 'positive' || topResult.label === 'bullish') label = 'bullish';
      else if (topResult.label === 'negative' || topResult.label === 'bearish') label = 'bearish';
      else label = 'neutral';
      
      console.log(`✅ Sentiment: ${label} (${topResult.score})`);
      return { label, confidence: topResult.score || 0.5 };
    }

    console.warn('⚠️ Unexpected FinALBERT response format, using fallback');
    return ruleBasedSentiment(message);
    
  } catch (error) {
    console.error('❌ Sentiment analysis error:', error);
    return ruleBasedSentiment(message);
  }
}

function ruleBasedSentiment(message: string): { label: string; confidence: number } {
  const lowerMessage = message.toLowerCase();
  
  const bullishWords = ['buy', 'bull', 'bullish', 'long', 'moon', 'rocket', 'up', 'calls', 'strong', 'breakout', 'support', 'bounce', 'rally', 'green', 'pump'];
  const bearishWords = ['sell', 'bear', 'bearish', 'short', 'crash', 'down', 'puts', 'weak', 'breakdown', 'resistance', 'dump', 'drop', 'red', 'fall'];

  let bullishScore = 0;
  let bearishScore = 0;
  
  bullishWords.forEach(word => {
    if (lowerMessage.includes(word)) bullishScore++;
  });
  
  bearishWords.forEach(word => {
    if (lowerMessage.includes(word)) bearishScore++;
  });

  const totalScore = bullishScore + bearishScore;
  let confidence = Math.min(0.8, totalScore * 0.15); // Cap at 80% confidence for rule-based

  if (bullishScore > bearishScore) {
    return { label: 'bullish', confidence: Math.max(0.51, confidence) };
  } else if (bearishScore > bullishScore) {
    return { label: 'bearish', confidence: Math.max(0.51, confidence) };
  }
  
  return { label: 'neutral', confidence: 0.5 };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 STOCKTWITS DATA FETCHER: Starting enhanced ingestion...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const apiKey = Deno.env.get('STOCKTWITS_API_TOKEN') ?? 'public';

    const requestBody = await req.json().catch(() => ({}));
    const { 
      ticker_batch_size = 30, // Increased from 15 to 30 for better coverage
      test_mode = false, 
      health_check = false,
      market_window = 'market_hours',
      emergency_mode = false 
    } = requestBody;

    // Handle health check
    if (health_check) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'StockTwits fetcher is healthy',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔐 Processing ${test_mode ? 'TEST' : 'LIVE'} mode with ${ticker_batch_size} tickers`);

    // Initialize tickers from database if not already loaded
    if (INDUSTRY_FOCUS_TICKERS.length === 0) {
      await initializeIndustryTickers(supabase);
    }
    
    // Validate that we have tickers
    if (INDUSTRY_FOCUS_TICKERS.length === 0) {
      throw new Error('No industry tickers available from database');
    }

    // Enhanced 24/7 ticker selection with smart throttling
    let tickersToProcess: string[];
    
    if (test_mode) {
      tickersToProcess = INDUSTRY_FOCUS_TICKERS.slice(0, 5);
    } else if (emergency_mode) {
      // Emergency mode: process any tickers with recent activity
      const { data: activeTickers } = await supabase
        .from('stocktwits_messages_live')
        .select('ticker, COUNT(*) as msg_count')
        .gte('created_at_stocktwits', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .groupBy('ticker')
        .order('msg_count', { ascending: false })
        .limit(Math.min(ticker_batch_size, 50));
      
      tickersToProcess = activeTickers ? activeTickers.map(t => t.ticker) : INDUSTRY_FOCUS_TICKERS.slice(0, ticker_batch_size);
      console.log(`🚨 EMERGENCY MODE: Processing ${tickersToProcess.length} most active tickers`);
    } else {
      // 24/7 mode: use smart time-based ticker selection
      await loadTickerPriority(supabase); // Refresh priority data
      tickersToProcess = getCurrentTickerBatch(market_window, ticker_batch_size);
    }

    console.log(`📊 Processing ${tickersToProcess.length} tickers...`);

    let totalMessages = 0;
    let totalProcessed = 0;
    let sentimentStats = { bullish: 0, bearish: 0, neutral: 0 };
    const errors: string[] = [];

    for (const ticker of tickersToProcess) {
      try {
        console.log(`\n🎯 Processing ${ticker}...`);
        
        // Fetch messages from StockTwits API
        const messages = await fetchStockTwitsMessages(supabase, apiKey, ticker);
        
        if (messages.length === 0) {
          console.log(`📭 No messages for ${ticker}`);
          continue;
        }

        totalMessages += messages.length;

        // Process and store messages with sentiment analysis
        for (const msg of messages) {
          try {
            // Clean and validate message body
            const messageBody = msg.body?.trim() || '';
            if (!messageBody || messageBody.length < 3) {
              console.log(`⚠️ Skipping empty/short message ${msg.id}`);
              continue;
            }

            // Analyze sentiment
            const sentiment = await analyzeSentimentWithHuggingFace(messageBody);
            console.log(`🎯 Message ${msg.id}: "${messageBody.slice(0, 30)}..." → ${sentiment.label} (${sentiment.confidence.toFixed(2)})`);
            
            // Track sentiment stats
            sentimentStats[sentiment.label as keyof typeof sentimentStats]++;
            
            // Prepare message data with proper field mapping
            const messageData = {
              message_id: msg.id.toString(),
              ticker: ticker.toUpperCase(),
              body: messageBody,
              created_at_stocktwits: new Date(msg.created_at).toISOString(),
              user_id_stocktwits: msg.user?.id?.toString() || null,
              username: msg.user?.username || null,
              sentiment_label: sentiment.label, // Must be 'bullish', 'bearish', or 'neutral'
              sentiment_confidence: Math.round(sentiment.confidence * 1000) / 1000, // Round to 3 decimal places
              processed_at: new Date().toISOString()
            };

            console.log(`💾 Storing message with sentiment: ${messageData.sentiment_label}`);

            // Insert into database with conflict handling (24/7 caching)
            const { error } = await supabase
              .from('stocktwits_messages_live')
              .upsert(messageData, { 
                onConflict: 'message_id',
                ignoreDuplicates: true 
              });

            if (error) {
              console.error(`❌ Failed to store message ${msg.id}:`, error);
              errors.push(`Failed to store message ${msg.id}: ${error.message}`);
            } else {
              totalProcessed++;
              console.log(`✅ Stored message ${msg.id} for ${ticker}`);
            }
            
          } catch (msgError) {
            console.error(`❌ Error processing message ${msg.id}:`, msgError);
            errors.push(`Message processing error: ${msgError.message}`);
          }
        }

        // Smart delay based on time of day for 24/7 operation
        const nowET = DateTime.now().setZone('America/New_York');
        const currentHourET = nowET.hour;
        const isMarketHours = currentHourET >= 9 && currentHourET < 17;
        
        // Market hours: 20s delay (3 req/min), After hours: 60s delay (1 req/min)
        const delay = isMarketHours ? 20000 : 60000;
        console.log(`⏱️  Waiting ${delay/1000}s before next ticker (${isMarketHours ? 'Market' : 'After'} hours mode)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (tickerError) {
        console.error(`❌ Error processing ticker ${ticker}:`, tickerError);
        errors.push(`Ticker ${ticker} error: ${tickerError.message}`);
      }
    }

    // Calculate sentiment labeling success rate
    const labelingSuccessRate = totalMessages > 0 ? (totalProcessed / totalMessages) * 100 : 0;
    const fallbackUsageCount = totalProcessed - (sentimentStats.bullish + sentimentStats.bearish + sentimentStats.neutral);
    
    // Enhanced logging with ingestion health metrics
    const ingestionRate = totalMessages / (tickersToProcess.length > 0 ? tickersToProcess.length : 1);
    const currentGroup = rotationState.currentGroup + 1;
    const estimatedFullCoverage = (4 * 60) / tickersToProcess.length; // Hours for full coverage
    
    console.log(`\n✅ ENHANCED STOCKTWITS FETCH COMPLETE:`);
    console.log(`   📊 ${totalMessages} messages fetched from ${tickersToProcess.length} tickers`);
    console.log(`   🔄 Rotation: Group ${currentGroup}/4, Est. full coverage: ${estimatedFullCoverage.toFixed(1)}h`);
    console.log(`   📈 Ingestion rate: ${ingestionRate.toFixed(1)} messages/ticker`);
    console.log(`   💾 ${totalProcessed} messages stored (${labelingSuccessRate.toFixed(1)}% labeling success)`);
    console.log(`   🎯 Sentiment breakdown: Bullish: ${sentimentStats.bullish}, Bearish: ${sentimentStats.bearish}, Neutral: ${sentimentStats.neutral}`);
    console.log(`   🧠 FinALBERT Model Performance: ${totalProcessed - fallbackUsageCount} ML predictions, ${fallbackUsageCount} fallbacks`);
    
    if (errors.length > 0) {
      console.log(`   ⚠️ ${errors.length} errors encountered`);
    }
    
    // Alert on low ingestion rates
    if (ingestionRate < 0.5) {
      console.warn(`🚨 LOW INGESTION RATE: Only ${ingestionRate.toFixed(2)} messages/ticker - consider emergency mode`);
    }
    
    // Log performance warning if labeling success is low
    if (labelingSuccessRate < 85) {
      console.warn(`⚠️ LOW SENTIMENT LABELING RATE: Only ${labelingSuccessRate.toFixed(1)}% of messages got sentiment labels`);
      console.warn(`   - This may indicate FinALBERT API issues, rate limiting, or HUGGINGFACE_API_KEY problems`);
      console.warn(`   - Check HuggingFace service status and API key configuration`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        tickers_processed: tickersToProcess.length,
        messages_fetched: totalMessages,
        messages_stored: totalProcessed,
        ingestion_rate: ingestionRate,
        rotation_status: {
          current_group: currentGroup,
          estimated_full_coverage_hours: estimatedFullCoverage,
          active_ticker_count: rotationState.activeTickerPriority.size
        },
        sentiment_breakdown: sentimentStats,
        labeling_success_rate: labelingSuccessRate,
        ml_predictions: totalProcessed - fallbackUsageCount,
        fallback_usage: fallbackUsageCount,
        model_performance: {
          endpoint_status: labelingSuccessRate >= 85 ? 'healthy' : 'degraded',
          finALBERT_usage_rate: totalProcessed > 0 ? ((totalProcessed - fallbackUsageCount) / totalProcessed) * 100 : 0
        },
        health_alerts: ingestionRate < 0.5 ? ['LOW_INGESTION_RATE'] : [],
        errors: errors.length > 0 ? errors.slice(0, 5) : [], // Limit error reporting
        message: 'Enhanced StockTwits data fetching completed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ STOCKTWITS FETCH ERROR:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack || 'No stack trace available'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
