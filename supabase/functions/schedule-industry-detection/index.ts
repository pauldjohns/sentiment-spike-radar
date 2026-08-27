
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Market hours logic - embedded to avoid import issues
function isMarketOpen(): boolean {
  const now = new Date();
  const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const day = etNow.getDay();
  const hour = etNow.getHours();
  const minute = etNow.getMinutes();
  const currentTime = hour * 60 + minute;
  
  // Weekend check
  if (day === 0 || day === 6) return false;
  
  // Market hours: 9:00 AM - 4:00 PM ET (extended for processing)
  const marketStart = 9 * 60; // 9:00 AM
  const marketEnd = 16 * 60; // 4:00 PM
  
  return currentTime >= marketStart && currentTime < marketEnd;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('⏰ UNIFIED INDUSTRY DETECTION SCHEDULER: Starting pipeline...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if market is open
    const marketOpen = isMarketOpen();
    console.log(`📊 Market Status: ${marketOpen ? 'OPEN' : 'CLOSED'}`);

    if (!marketOpen) {
      console.log('🕐 Market is closed - skipping processing');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Market is closed - no processing needed',
          market_status: 'closed',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🚀 Market is open - starting enhanced pipeline...');

    // Step 1: Trigger the enhanced ingestion pipeline
    console.log('🎯 Step 1: Triggering enhanced sentiment ingestion...');
    
    const { data: ingestionResult, error: ingestionError } = await supabase.functions.invoke(
      'ingest-sentiment-data',
      {
        body: { 
          automated: true,
          manual_override: true,
          cron_triggered: true
        }
      }
    );

    if (ingestionError) {
      console.error('❌ Enhanced ingestion failed:', ingestionError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Enhanced ingestion pipeline failed',
          details: ingestionError.message,
          market_status: 'open'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Enhanced ingestion completed:', ingestionResult);

    // Step 2: Optionally trigger evaluation and learning processes if signals were generated
    if (ingestionResult?.signals_generated && ingestionResult.signals_generated > 0) {
      console.log(`🎯 Step 2: Triggering evaluation for ${ingestionResult.signals_generated} signals...`);
      
      try {
        // Trigger signal evaluation
        await supabase.functions.invoke('evaluate-signal-success', {
          body: { batch_mode: true, automated: true }
        });
        
        // Trigger learning data logging
        await supabase.functions.invoke('log-signal-learning-data', {
          body: { automated: true }
        });
        
        console.log('✅ Evaluation and learning processes triggered');
      } catch (evalError) {
        console.warn('⚠️ Evaluation processes failed:', evalError);
        // Don't fail the whole pipeline for evaluation errors
      }
    } else {
      console.log('📊 No signals generated - skipping evaluation step');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Enhanced scheduled processing completed successfully',
        market_status: 'open',
        pipeline_result: ingestionResult,
        signals_generated: ingestionResult?.signals_generated || 0,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Scheduler error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
