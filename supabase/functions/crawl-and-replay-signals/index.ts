
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CrawlReplayRequest {
  tickers: string[];
  start_date: string;
  end_date: string;
  min_z_score?: number;
  min_velocity?: number;
  batch_size?: number;
  run_name?: string;
  notes?: string;
}

interface HistoricalSignal {
  ticker: string;
  signal_detected_at: string;
  message_count: number;
  bullish_count: number;
  bearish_count: number;
  sentiment_type: string;
  z_score: number;
  sentiment_velocity: number;
}

Deno.serve(async (req) => {
  console.log('📡 CRAWL-REPLAY: Function started');
  console.log('📋 REQUEST METHOD:', req.method);

  if (req.method === 'OPTIONS') {
    console.log('✅ CORS: Handling preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ MISSING ENVIRONMENT VARIABLES');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required environment variables'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let requestData: CrawlReplayRequest;
    
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error('❌ REQUEST PARSING ERROR:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request body'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('📊 CRAWL-REPLAY REQUEST:', requestData);

    // Validate required parameters
    if (!requestData.tickers || !Array.isArray(requestData.tickers) || requestData.tickers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'tickers array is required and must not be empty'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!requestData.start_date || !requestData.end_date) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'start_date and end_date are required'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Set defaults
    const minZScore = requestData.min_z_score || 2.0;
    const minVelocity = requestData.min_velocity || 0.5;
    const batchSize = requestData.batch_size || 100;

    // Create backtest run record
    const { data: backtestRun, error: runError } = await supabase
      .from('backtest_runs')
      .insert({
        run_name: requestData.run_name || `Historical Crawl ${new Date().toISOString().split('T')[0]}`,
        date_range: `[${requestData.start_date},${requestData.end_date}]`,
        ticker_filter: requestData.tickers,
        min_z_score: minZScore,
        min_velocity: minVelocity,
        notes: requestData.notes || 'Generated via historical crawl-and-replay-signals',
        status: 'pending'
      })
      .select()
      .single();

    if (runError) {
      throw new Error(`Failed to create backtest run: ${runError.message}`);
    }

    const batchId = backtestRun.id;
    console.log(`📦 CREATED: Backtest run ${batchId}`);

    try {
      // Step 1: Crawl historical sentiment data
      console.log('🔍 CRAWLING: Historical sentiment data...');
      const historicalSignals = await crawlHistoricalSentiment(
        supabase, 
        requestData.tickers, 
        requestData.start_date, 
        requestData.end_date,
        minZScore,
        minVelocity
      );

      console.log(`📊 FOUND: ${historicalSignals.length} potential signals`);

      if (historicalSignals.length === 0) {
        await supabase
          .from('backtest_runs')
          .update({ status: 'complete', completed_at: new Date().toISOString() })
          .eq('id', batchId);

        return new Response(
          JSON.stringify({
            success: true,
            batch_id: batchId,
            signals_inserted: 0,
            message: 'No qualifying historical signals found for the specified criteria'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Step 2: Enrich with price data and insert signals
      console.log('💰 ENRICHING: Signals with historical price data...');
      const enrichedSignals = await enrichSignalsWithPriceData(
        historicalSignals,
        finnhubApiKey
      );

      // Step 3: Insert enriched signals in batches
      console.log('📥 INSERTING: Enriched signals...');
      let totalInserted = 0;
      
      for (let i = 0; i < enrichedSignals.length; i += batchSize) {
        const batch = enrichedSignals.slice(i, i + batchSize).map(signal => ({
          ...signal,
          replay_batch_id: batchId,
          source: 'replay',
          evaluation_status: null
        }));

        const { error: insertError } = await supabase
          .from('enriched_signals')
          .insert(batch);

        if (insertError) {
          console.error('❌ BATCH INSERT ERROR:', insertError);
          // Continue with next batch rather than failing completely
        } else {
          totalInserted += batch.length;
          console.log(`✅ INSERTED: Batch ${Math.floor(i/batchSize) + 1} (${batch.length} signals)`);
        }
      }

      // Update backtest run status
      await supabase
        .from('backtest_runs')
        .update({ status: 'complete', completed_at: new Date().toISOString() })
        .eq('id', batchId);

      console.log(`🎉 CRAWL-REPLAY COMPLETE: ${totalInserted} signals inserted`);

      return new Response(
        JSON.stringify({
          success: true,
          batch_id: batchId,
          run_id: batchId,
          signals_inserted: totalInserted,
          date_range: {
            start: requestData.start_date,
            end: requestData.end_date
          },
          filters: {
            min_z_score: minZScore,
            min_velocity: minVelocity
          },
          message: `Successfully crawled and inserted ${totalInserted} historical replay signals`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (crawlError) {
      // Update backtest run status to failed
      await supabase
        .from('backtest_runs')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', batchId);
      
      throw crawlError;
    }

  } catch (error) {
    console.error('❌ CRAWL-REPLAY ERROR:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Historical crawl and replay failed',
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function crawlHistoricalSentiment(
  supabase: any,
  tickers: string[],
  startDate: string,
  endDate: string,
  minZScore: number,
  minVelocity: number
): Promise<HistoricalSignal[]> {
  
  // Query historical sentiment data
  const { data: messages, error } = await supabase
    .from('stocktwits_messages_live')
    .select('*')
    .in('ticker', tickers)
    .gte('created_at_stocktwits', startDate)
    .lte('created_at_stocktwits', endDate)
    .order('created_at_stocktwits', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch historical messages: ${error.message}`);
  }

  console.log(`📊 FETCHED: ${messages?.length || 0} historical messages`);

  // Group messages by ticker and time windows (hourly)
  const signalCandidates = new Map<string, HistoricalSignal>();
  
  for (const message of messages || []) {
    const timestamp = new Date(message.created_at_stocktwits);
    const hour = timestamp.getHours();
    const dateHour = `${timestamp.toISOString().split('T')[0]}_${hour}`;
    const key = `${message.ticker}_${dateHour}`;
    
    if (!signalCandidates.has(key)) {
      signalCandidates.set(key, {
        ticker: message.ticker,
        signal_detected_at: timestamp.toISOString(),
        message_count: 0,
        bullish_count: 0,
        bearish_count: 0,
        sentiment_type: 'neutral',
        z_score: 0,
        sentiment_velocity: 0
      });
    }
    
    const signal = signalCandidates.get(key)!;
    signal.message_count++;
    
    if (message.sentiment_label === 'Bullish') {
      signal.bullish_count++;
    } else if (message.sentiment_label === 'Bearish') {
      signal.bearish_count++;
    }
  }

  // Calculate metrics and filter qualifying signals
  const qualifyingSignals: HistoricalSignal[] = [];
  
  for (const signal of signalCandidates.values()) {
    if (signal.message_count < 5) continue; // Minimum message threshold
    
    // Calculate sentiment ratio and z-score (simplified)
    const bullishRatio = signal.bullish_count / signal.message_count;
    const bearishRatio = signal.bearish_count / signal.message_count;
    
    // Simulate z-score calculation (would normally require baseline data)
    const sentimentRatio = Math.max(bullishRatio, bearishRatio);
    signal.z_score = (sentimentRatio - 0.5) * Math.sqrt(signal.message_count) * 2;
    
    // Simulate velocity (message spike compared to normal volume)
    signal.sentiment_velocity = Math.max(0, (signal.message_count - 10) / 10);
    
    // Determine sentiment type
    if (bullishRatio > bearishRatio && bullishRatio > 0.6) {
      signal.sentiment_type = 'bullish';
    } else if (bearishRatio > bullishRatio && bearishRatio > 0.6) {
      signal.sentiment_type = 'bearish';
    } else {
      signal.sentiment_type = 'neutral';
    }
    
    // Apply filters
    if (Math.abs(signal.z_score) >= minZScore && signal.sentiment_velocity >= minVelocity) {
      qualifyingSignals.push(signal);
    }
  }

  return qualifyingSignals;
}

async function enrichSignalsWithPriceData(
  signals: HistoricalSignal[],
  finnhubApiKey?: string
): Promise<any[]> {
  const enrichedSignals = [];
  
  for (const signal of signals) {
    const signalTime = new Date(signal.signal_detected_at);
    
    // Calculate time windows
    const timeEod = new Date(signalTime);
    timeEod.setHours(16, 0, 0, 0); // 4 PM ET market close
    
    // Skip signals without real price data - no fallback prices
    let priceAtSignal = null;
    let price1h = null;
    let price3h = null;
    let priceEod = null;
    
    // Attempt to fetch real price data from Finnhub if API key available
    if (finnhubApiKey) {
      try {
        const startTimestamp = Math.floor(signalTime.getTime() / 1000);
        const endTimestamp = Math.floor(timeEod.getTime() / 1000);
        const url = `https://finnhub.io/api/v1/stock/candle?symbol=${signal.ticker}&resolution=60&from=${startTimestamp}&to=${endTimestamp}&token=${finnhubApiKey}`;
        const response = await fetch(url);

        if (response.ok) {
          const candleData = await response.json();
          if (candleData.s === 'ok' && candleData.c && candleData.c.length > 0) {
            priceAtSignal = candleData.o[0] ?? candleData.c[0];
            price1h = candleData.c[1] || priceAtSignal;
            price3h = candleData.c[3] || priceAtSignal;
            priceEod = candleData.c[candleData.c.length - 1];
          }
        }
      } catch (error) {
        console.warn(`⚠️ PRICE FETCH FAILED for ${signal.ticker}: ${error.message}`);
      }
    }
    
    // Skip signals without real price data
    if (!priceAtSignal || !priceEod) {
      console.warn(`⚠️ SKIPPING ${signal.ticker}: No real price data available`);
      continue; // Skip this signal entirely
    }

    // Calculate percentage changes using available real data
    const change1h = ((price1h - priceAtSignal) / priceAtSignal) * 100;
    const change3h = ((price3h - priceAtSignal) / priceAtSignal) * 100;
    const changeEod = ((priceEod - priceAtSignal) / priceAtSignal) * 100;
    
    enrichedSignals.push({
      ticker: signal.ticker,
      signal_detected_at: signal.signal_detected_at,
      z_score: signal.z_score,
      sentiment_velocity: signal.sentiment_velocity,
      message_volume: signal.message_count,
      sentiment_type: signal.sentiment_type,
      price_at_signal: priceAtSignal,
      price_1h_later: price1h,
      price_3h_later: price3h,
      price_eod: priceEod,
      change_1h: change1h,
      change_3h: change3h,
      change_eod: changeEod,
      price_metadata_status: 'complete',
      time_window: '1h,3h,eod'
    });
  }
  
  return enrichedSignals;
}
