
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Use Finnhub for historical price data instead of yfinance mock
    const FINNHUB_API_KEY = Deno.env.get('FINNHUB_API_KEY');
    const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

    const { 
      date_range, 
      tickers = [], 
      min_z_score = 2.0, 
      min_velocity = 0.5,
      run_name = null,
      notes = null
    } = await req.json()

    console.log(`🔄 REPLAY: Starting historical signal replay for ${tickers.length} tickers`)
    console.log(`📅 DATE RANGE: ${date_range.start} to ${date_range.end}`)
    console.log(`🎯 FILTERS: z_score >= ${min_z_score}, velocity >= ${min_velocity}`)

    // Create backtest run record
    const { data: backtestRun, error: runError } = await supabase
      .from('backtest_runs')
      .insert({
        run_name,
        date_range: `[${date_range.start},${date_range.end}]`,
        ticker_filter: tickers,
        min_z_score,
        min_velocity,
        notes,
        status: 'pending'
      })
      .select()
      .single()

    if (runError) {
      throw new Error(`Failed to create backtest run: ${runError.message}`)
    }

    const batch_id = backtestRun.id
    console.log(`📦 CREATED: Backtest run ${batch_id}`)

    try {
      // Fetch historical sentiment data within date range
      const { data: historicalMessages, error: messagesError } = await supabase
        .from('stocktwits_messages_live')
        .select('*')
        .gte('created_at_stocktwits', date_range.start)
        .lte('created_at_stocktwits', date_range.end)
        .in('ticker', tickers)
        .order('created_at_stocktwits', { ascending: true })

      if (messagesError) {
        throw new Error(`Failed to fetch historical messages: ${messagesError.message}`)
      }

      console.log(`📊 FOUND: ${historicalMessages?.length || 0} historical messages`)

      // Group messages by ticker and time windows for signal detection
      const tickerGroups = new Map()
      
      for (const message of historicalMessages || []) {
        const key = `${message.ticker}_${message.created_at_stocktwits}`
        if (!tickerGroups.has(key)) {
          tickerGroups.set(key, [])
        }
        tickerGroups.get(key).push(message)
      }

      // Fetch historical price data and simulate signal detection
      const replaySignals = []
      
      for (const [key, messages] of tickerGroups.entries()) {
        const [ticker, timestamp] = key.split('_')
        const signalTime = new Date(timestamp)
        
        // Calculate basic sentiment metrics for signal detection
        const totalMessages = messages.length
        const bullishCount = messages.filter(m => m.sentiment_label === 'Bullish').length
        const bearishCount = messages.filter(m => m.sentiment_label === 'Bearish').length
        
        // Simple z-score and velocity simulation
        const sentimentRatio = totalMessages > 0 ? bullishCount / totalMessages : 0
        const simulatedZScore = (sentimentRatio - 0.5) * Math.sqrt(totalMessages) * 2
        const simulatedVelocity = Math.max(0, (totalMessages - 5) / 10)
        
        // Apply filters
        if (Math.abs(simulatedZScore) < min_z_score || simulatedVelocity < min_velocity) {
          continue
        }

        console.log(`🎯 SIGNAL DETECTED: ${ticker} at ${signalTime.toISOString()}`)
        
        // Fetch historical price data from Finnhub instead of mock yfinance
        let priceData = null
        
        if (FINNHUB_API_KEY) {
          try {
            // Get historical candles from Finnhub for the signal date
            const startTimestamp = Math.floor(signalTime.getTime() / 1000)
            const endTimestamp = Math.floor((signalTime.getTime() + 24 * 60 * 60 * 1000) / 1000)
            
            const candleResponse = await fetch(
              `${FINNHUB_BASE_URL}/stock/candle?symbol=${ticker}&resolution=60&from=${startTimestamp}&to=${endTimestamp}&token=${FINNHUB_API_KEY}`
            )
            
            if (candleResponse.ok) {
              const candleData = await candleResponse.json()
              if (candleData.s === 'ok' && candleData.c && candleData.c.length > 0) {
                priceData = {
                  open: candleData.o[0],
                  high: Math.max(...candleData.h),
                  low: Math.min(...candleData.l),
                  close: candleData.c[candleData.c.length - 1],
                  volume: candleData.v.reduce((sum, v) => sum + v, 0)
                }
              }
            }
          } catch (error) {
            console.warn(`⚠️ FINNHUB PRICE FETCH FAILED for ${ticker}: ${error.message}`)
          }
        }

        // Use real Finnhub data if available, avoid random walks for historical replay
        const basePrice = priceData?.close || priceData?.open || null
        if (!basePrice) {
          console.warn(`⚠️ SKIPPING ${ticker}: No price data available`)
          continue // Skip signals without price data instead of using mock prices
        }
        
        const price1h = priceData?.high || basePrice // Use actual high for 1h price
        const price3h = priceData?.close || basePrice // Use actual close for 3h price  
        const priceEod = priceData?.close || basePrice // Use actual close for EOD

        replaySignals.push({
          ticker,
          signal_detected_at: signalTime.toISOString(),
          z_score: simulatedZScore,
          sentiment_velocity: simulatedVelocity,
          message_volume: totalMessages,
          sentiment_type: simulatedZScore > 0 ? 'bullish' : 'bearish',
          price_at_signal: basePrice,
          price_1h_later: price1h,
          price_3h_later: price3h,
          price_eod: priceEod,
          change_1h: ((price1h - basePrice) / basePrice) * 100,
          change_3h: ((price3h - basePrice) / basePrice) * 100,
          change_eod: ((priceEod - basePrice) / basePrice) * 100,
          success_1h: Math.abs((price1h - basePrice) / basePrice) >= 0.01,
          success_3h: Math.abs((price3h - basePrice) / basePrice) >= 0.01,
          success_eod: Math.abs((priceEod - basePrice) / basePrice) >= 0.01,
          source: 'replay',
          replay_batch_id: batch_id,
          is_simulated: true,
          price_metadata_status: 'simulated',
          evaluation_status: 'completed'
        })
      }

      console.log(`🎲 SIMULATED: ${replaySignals.length} replay signals (marked as simulated)`)

      // Insert replay signals into enriched_signals table
      if (replaySignals.length > 0) {
        const { error: insertError } = await supabase
          .from('enriched_signals')
          .insert(replaySignals)

        if (insertError) {
          throw new Error(`Failed to insert replay signals: ${insertError.message}`)
        }
      }

      // Update backtest run status to complete
      const { error: updateError } = await supabase
        .from('backtest_runs')
        .update({ status: 'complete', completed_at: new Date().toISOString() })
        .eq('id', batch_id)

      if (updateError) {
        console.warn(`⚠️ Failed to update run status: ${updateError.message}`)
      }

      console.log(`✅ REPLAY COMPLETE: ${replaySignals.length} SIMULATED signals inserted with batch_id ${batch_id}`)

      return new Response(
        JSON.stringify({
          success: true,
          batch_id,
          run_id: batch_id,
          signals_replayed: replaySignals.length,
          date_range,
          filters: { min_z_score, min_velocity },
          is_simulated: true,
          price_source: 'finnhub',
          message: `Successfully replayed ${replaySignals.length} historical signals using Finnhub data`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )

    } catch (signalError) {
      // Update backtest run status to failed
      await supabase
        .from('backtest_runs')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', batch_id)
      
      throw signalError
    }

  } catch (error) {
    console.error('❌ REPLAY ERROR:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
