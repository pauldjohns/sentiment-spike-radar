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

  console.log('🌱 STARTING BASELINE SEEDING JOB...');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check authorization - only allow cron jobs or service role
    const requestBody = await req.json().catch(() => ({}));
    const { 
      cron_triggered = false, 
      triggered_by_cron = false,
      manual_override = false 
    } = requestBody;

    if (!cron_triggered && !triggered_by_cron && !manual_override) {
      console.log('🚫 UNAUTHORIZED: Must be triggered via CRON or manual override');
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

    console.log('✅ AUTHORIZATION: Baseline seeding authorized');

    // Step 1: Calculate daily volumes from last 24 hours
    console.log('📊 Step 1: Calculating daily message volumes...');
    
    const { data: dailyVolumes, error: volumeError } = await supabase
      .from('stocktwits_messages_live')
      .select('ticker')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (volumeError) {
      console.error('❌ Error fetching message volumes:', volumeError);
      throw volumeError;
    }

    // Group by ticker and count messages
    const tickerCounts = dailyVolumes?.reduce((acc: Record<string, number>, msg) => {
      acc[msg.ticker] = (acc[msg.ticker] || 0) + 1;
      return acc;
    }, {}) || {};

    console.log(`📈 Found message data for ${Object.keys(tickerCounts).length} tickers`);
    
    // Step 2: Seed baseline data for tickers with activity
    const baselineInserts = [];
    const today = new Date().toISOString().split('T')[0];
    
    for (const [ticker, messageCount] of Object.entries(tickerCounts)) {
      // Only seed if we have meaningful activity (at least 1 message)
      if (messageCount >= 1) {
        baselineInserts.push({
          ticker,
          date: today,
          message_count: messageCount,
          total_messages_analyzed: messageCount,
          bullish_ratio: 0.33, // Default neutral baseline
          bearish_ratio: 0.33,
          neutral_ratio: 0.34
        });
      }
    }

    console.log(`🌱 Seeding baselines for ${baselineInserts.length} active tickers...`);

    if (baselineInserts.length > 0) {
      // Insert with conflict handling (don't overwrite existing baselines)
      const { data: insertResult, error: insertError } = await supabase
        .from('message_volume_history')
        .upsert(baselineInserts, { 
          onConflict: 'ticker,date',
          ignoreDuplicates: true 
        });

      if (insertError) {
        console.error('❌ Error inserting baselines:', insertError);
        throw insertError;
      }

      console.log(`✅ Successfully seeded baselines for ${baselineInserts.length} tickers`);
    } else {
      console.log('ℹ️ No new baseline data to seed (no recent activity)');
    }

    // Step 3: Clean up old baseline data (older than 30 days)
    console.log('🧹 Step 3: Cleaning up old baseline data...');
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { error: cleanupError } = await supabase
      .from('message_volume_history')
      .delete()
      .lt('date', thirtyDaysAgo);

    if (cleanupError) {
      console.warn('⚠️ Error cleaning up old baselines:', cleanupError);
      // Don't fail the job for cleanup errors
    } else {
      console.log('✅ Cleaned up baselines older than 30 days');
    }

    // Step 4: Report status
    const { data: totalBaselines, error: countError } = await supabase
      .from('message_volume_history')
      .select('ticker', { count: 'exact' });

    const baselineCount = totalBaselines?.length || 0;
    
    console.log(`📊 BASELINE SEEDING COMPLETE: ${baselineCount} total baselines in system`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Baseline seeding completed successfully',
        baselines_seeded: baselineInserts.length,
        total_baselines: baselineCount,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ BASELINE SEEDING ERROR:', error);
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