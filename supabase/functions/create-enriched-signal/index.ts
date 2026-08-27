
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

    const {
      ticker,
      time_window,
      signal_detected_at,
      sentiment_type,
      z_score,
      sentiment_velocity,
      message_volume
    } = await req.json()

    console.log('🎯 CREATE SIGNAL: Starting enriched signal creation for:', ticker)

    // Check for duplicate ticker selection before creating signal
    const startOfTodayISO = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
    const { data: alreadySelectedToday } = await supabase
      .from('enriched_signals')
      .select('ticker')
      .eq('ticker', ticker?.toUpperCase())
      .gte('signal_detected_at', startOfTodayISO);

    if (alreadySelectedToday && alreadySelectedToday.length > 0) {
      console.warn(`⚠️ DUPLICATE SIGNAL: ${ticker} already selected today - skipping creation`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Ticker ${ticker} already has a signal today - preventing duplicate`,
          duplicate_detected: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Environment and data source validation
    const isDevelopment = Deno.env.get('DENO_ENV') === 'development'
    // Industry focus ticker list - validated against actual ticker list from src/data/industry_tickers.ts
    const INDUSTRY_FOCUS_TICKERS = [
      // Defense & Aerospace (sample)
      'LMT', 'RTX', 'BA', 'NOC', 'GD', 'LHX', 'HII', 'TDG', 'CW', 'TXT',
      'HON', 'UTX', 'LDOS', 'CACI', 'SAIC', 'KTOS', 'AVAV', 'MRCY', 'OSK', 'HXL',
      // Add more as needed - using subset for testing
    ]
    const validTickers = INDUSTRY_FOCUS_TICKERS
    const isTestTicker = validTickers.includes(ticker?.toUpperCase())
    
    // Determine if this is simulated data
    const isSimulated = isDevelopment && isTestTicker
    
    if (isSimulated) {
      console.warn(`🧪 SIMULATION: Creating test signal for ${ticker} (marked as simulated)`)
    }

    // Validation
    if (!ticker || !signal_detected_at) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: ticker and signal_detected_at' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the enriched signal record with proper simulation marking
    const signalData = {
      ticker: ticker.toUpperCase(),
      time_window,
      signal_detected_at,
      sentiment_type,
      z_score,
      sentiment_velocity,
      message_volume,
      price_metadata_status: 'pending',
      source: isSimulated ? 'test' : 'live',
      is_simulated: isSimulated,
      created_at: new Date().toISOString()
    }

    const { data: signal, error: signalError } = await supabase
      .from('enriched_signals')
      .insert([signalData])
      .select()
      .single()

    if (signalError) {
      console.error('❌ DATABASE ERROR:', signalError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Database error: ${signalError.message}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ SIGNAL CREATED: ID ${signal.id} for ${ticker}${isSimulated ? ' (SIMULATED)' : ''}`)

    // For live signals, trigger price metadata enrichment
    if (!isSimulated) {
      try {
        const { error: enrichError } = await supabase.functions.invoke(
          'enrich-signal-price-metadata',
          {
            body: { signal_id: signal.id }
          }
        )

        if (enrichError) {
          console.warn('⚠️ PRICE ENRICHMENT WARNING:', enrichError)
          return new Response(
            JSON.stringify({
              success: true,
              signal_id: signal.id,
              warning: 'Signal created but price enrichment failed to trigger'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('✅ PRICE ENRICHMENT: Triggered for signal', signal.id)
      } catch (enrichmentError) {
        console.warn('⚠️ ENRICHMENT TRIGGER ERROR:', enrichmentError)
      }
    } else {
      console.log('🧪 SKIPPING ENRICHMENT: Test signal does not require price metadata')
    }

    return new Response(
      JSON.stringify({
        success: true,
        signal_id: signal.id,
        is_simulated: isSimulated,
        message: isSimulated ? 'Test signal created successfully (simulated)' : 'Live signal created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ CREATE SIGNAL ERROR:', error)
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
