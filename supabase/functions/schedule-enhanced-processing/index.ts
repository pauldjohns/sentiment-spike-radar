
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🕐 Scheduled enhanced processing triggered...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Check market hours before processing using proper ET conversion
    const now = new Date();
    const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const currentDay = etNow.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = etNow.getHours();
    const minute = etNow.getMinutes();
    const currentTime = hour * 60 + minute;
    
    // Skip processing on weekends
    if (currentDay === 0 || currentDay === 6) {
      console.log('⏸️ Skipping weekend processing');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Skipped weekend processing',
          skipped: true,
          reason: 'weekend'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Enhanced processing with increased frequency and market-aware scheduling
    let processingIntensity = 'normal';
    let batchSize = 30;
    let marketWindow = 'overnight';
    
    const preMarketStart = 4 * 60; // 4:00 AM ET
    const marketOpen = 9 * 60 + 30; // 9:30 AM ET
    const marketClose = 16 * 60; // 4:00 PM ET
    const afterHoursEnd = 20 * 60; // 8:00 PM ET
    
    if (currentTime >= preMarketStart && currentTime < marketOpen) {
      processingIntensity = 'high'; 
      batchSize = 40; // Pre-market: larger batches for earnings/news tickers
      marketWindow = 'pre_market';
    } else if (currentTime >= marketOpen && currentTime < marketClose) {
      processingIntensity = 'high'; 
      batchSize = 50; // Market hours: maximum coverage
      marketWindow = 'market_hours';
    } else if (currentTime >= marketClose && currentTime < afterHoursEnd) {
      processingIntensity = 'medium'; 
      batchSize = 35; // After-hours: focus on tech/biotech
      marketWindow = 'after_hours';
    } else {
      processingIntensity = 'low'; 
      batchSize = 20; // Overnight: minimal processing
      marketWindow = 'overnight';
    }
    
    // First, call enhanced StockTwits data fetcher with market-aware parameters
    const fetchResponse = await fetch(`${supabaseUrl}/functions/v1/fetch-stocktwits-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        ticker_batch_size: batchSize,
        market_window: marketWindow,
        emergency_mode: false
      })
    });
    
    const fetchResult = await fetchResponse.json();
    console.log(`📊 StockTwits fetch result: ${fetchResult.messages_fetched} messages from ${fetchResult.tickers_processed} tickers`);
    
    // Check if emergency mode needed (insufficient data)
    const emergencyModeNeeded = fetchResult.messages_fetched < 50 && marketWindow === 'market_hours';
    
    // Then call the main signal processing function
    const response = await fetch(`${supabaseUrl}/functions/v1/ingest-sentiment-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        scheduled: true,
        optimizeFor10PercentMoves: true,
        processingIntensity,
        emergencyMode: emergencyModeNeeded,
        sessionId: `scheduled_${Date.now()}`
      })
    });
    
    const result = await response.json();
    
    console.log('📊 Scheduled enhanced processing result:', result);
    
    // Log processing statistics
    if (result.success) {
      console.log(`✅ Processed ${result.processed_tickers}/${result.total_tickers} tickers`);
      console.log(`📈 Found ${result.high_probability_candidates || 0} high-probability 10% move candidates`);
      console.log(`⏱️ Processing completed in ${result.processing_time_seconds}s`);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Enhanced data ingestion pipeline completed',
        processing_intensity: processingIntensity,
        market_window: marketWindow,
        batch_size: batchSize,
        emergency_mode_triggered: emergencyModeNeeded,
        market_status: currentTime >= marketOpen && currentTime < marketClose ? 'open' : 'closed',
        data_fetch_result: fetchResult,
        signal_processing_result: result 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('❌ Error in scheduled enhanced processing:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        scheduled: true
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
