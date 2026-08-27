import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Determine market window for scheduling optimization
function determineMarketWindow(): string {
  const now = new Date();
  const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const day = etNow.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = etNow.getHours();
  const minute = etNow.getMinutes();
  const currentTime = hour * 60 + minute;
  
  // Weekend handling
  if (day === 0 || day === 6) {
    return 'weekend';
  }
  
  const preMarketStart = 4 * 60; // 4:00 AM ET
  const preMarketEnd = 9 * 60 + 30; // 9:30 AM ET
  const marketClose = 16 * 60; // 4:00 PM ET
  const afterHoursEnd = 20 * 60; // 8:00 PM ET
  
  if (currentTime >= preMarketStart && currentTime < preMarketEnd) {
    return 'pre_market';
  } else if (currentTime >= preMarketEnd && currentTime < marketClose) {
    return 'market_hours';
  } else if (currentTime >= marketClose && currentTime < afterHoursEnd) {
    return 'after_hours';
  } else {
    return 'overnight';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 ENHANCED STOCKTWITS SCHEDULER: Starting optimized data collection...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const marketWindow = determineMarketWindow();
    console.log(`📊 Current market window: ${marketWindow}`);
    
    // Skip processing on weekends
    if (marketWindow === 'weekend') {
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
    
    // Enhanced scheduling parameters based on market window
    let batchSize = 30;
    let frequency = 'every_15_minutes'; // 4x increase from hourly
    
    switch (marketWindow) {
      case 'pre_market':
        batchSize = 40; // Focus on earnings/news sensitive tickers
        frequency = 'every_15_minutes';
        break;
      case 'market_hours':
        batchSize = 50; // Maximum coverage during trading
        frequency = 'every_15_minutes';
        break;
      case 'after_hours':
        batchSize = 35; // Tech/biotech focus
        frequency = 'every_15_minutes';
        break;
      case 'overnight':
        batchSize = 20; // Minimal processing
        frequency = 'every_30_minutes';
        break;
    }
    
    console.log(`🎯 Scheduling: ${batchSize} tickers per batch, ${frequency}`);
    
    // Call enhanced StockTwits fetcher
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
    console.log(`📈 Enhanced fetch completed: ${fetchResult.messages_fetched} messages from ${fetchResult.tickers_processed} tickers`);
    
    // Monitor ingestion health and trigger emergency mode if needed
    const ingestionRate = fetchResult.ingestion_rate || 0;
    const emergencyModeNeeded = ingestionRate < 0.5 && marketWindow === 'market_hours';
    
    if (emergencyModeNeeded) {
      console.log('🚨 LOW INGESTION DETECTED - Triggering emergency mode');
      
      // Emergency fetch with relaxed criteria
      const emergencyResponse = await fetch(`${supabaseUrl}/functions/v1/fetch-stocktwits-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ticker_batch_size: 50,
          market_window: marketWindow,
          emergency_mode: true
        })
      });
      
      const emergencyResult = await emergencyResponse.json();
      console.log(`🚨 Emergency fetch: ${emergencyResult.messages_fetched} additional messages`);
    }
    
    // Calculate expected throughput improvement
    const expectedDailyMessages = (fetchResult.messages_fetched || 0) * (marketWindow === 'overnight' ? 48 : 96); // 15min intervals
    const coverageImprovement = batchSize / 15; // vs previous 15 ticker batches
    
    console.log(`📊 Performance projections:`);
    console.log(`   🎯 Expected daily messages: ${expectedDailyMessages}`);
    console.log(`   📈 Coverage improvement: ${coverageImprovement.toFixed(1)}x`);
    console.log(`   ⏱️ Full ticker coverage cycle: ~4 hours`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Enhanced StockTwits scheduling completed',
        market_window: marketWindow,
        batch_size: batchSize,
        frequency: frequency,
        emergency_mode_triggered: emergencyModeNeeded,
        performance_metrics: {
          messages_fetched: fetchResult.messages_fetched || 0,
          ingestion_rate: ingestionRate,
          coverage_improvement: coverageImprovement,
          expected_daily_messages: expectedDailyMessages,
          rotation_status: fetchResult.rotation_status
        },
        fetch_result: fetchResult,
        health_status: ingestionRate >= 0.5 ? 'healthy' : 'degraded'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('❌ Error in enhanced StockTwits scheduler:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        scheduler: 'enhanced_stocktwits'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});