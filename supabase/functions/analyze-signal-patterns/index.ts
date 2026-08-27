
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PatternAnalysisRequest {
  force_refresh?: boolean;
  ticker_filter?: string;
  success_threshold?: number;
}

interface SignalPattern {
  ticker: string;
  rounded_z_score: number;
  rounded_sentiment_velocity: number;
  signal_count: number;
  success_count_1h: number;
  success_count_3h: number;
  success_count_eod: number;
  success_threshold: number;
}

Deno.serve(async (req) => {
  console.log('🔍 PATTERN ANALYSIS: Function started');
  console.log('📋 REQUEST METHOD:', req.method);

  if (req.method === 'OPTIONS') {
    console.log('✅ CORS: Handling preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
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
    
    let requestData: PatternAnalysisRequest = {};
    
    if (req.method === 'POST') {
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
    }

    console.log('🔍 PATTERN ANALYSIS REQUEST:', requestData);

    const successThreshold = requestData.success_threshold ?? Number(Deno.env.get('SUCCESS_THRESHOLD') ?? 0.10);

    // Fetch all enriched signals with completed evaluations at specified threshold
    let query = supabase
      .from('enriched_signals')
      .select('ticker, z_score, sentiment_velocity, success_high, success_close, success_threshold')
      .eq('evaluation_status', 'complete')
      .eq('success_threshold', successThreshold)
      .not('z_score', 'is', null)
      .not('sentiment_velocity', 'is', null);

    if (requestData.ticker_filter) {
      query = query.eq('ticker', requestData.ticker_filter);
    }

    const { data: signals, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ ERROR FETCHING SIGNALS:', fetchError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch signals: ${fetchError.message}`
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!signals || signals.length === 0) {
      console.log('ℹ️ NO EVALUATED SIGNALS FOUND');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No evaluated signals found for pattern analysis',
          patterns_processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 PROCESSING ${signals.length} EVALUATED SIGNALS (threshold: ${(successThreshold * 100).toFixed(1)}%)`);

    // Group signals by pattern (ticker + rounded z_score + rounded sentiment_velocity)
    const patternMap = new Map<string, SignalPattern>();

    for (const signal of signals) {
      // Round z_score to nearest 0.5 and sentiment_velocity to nearest 5
      const roundedZScore = Math.round(signal.z_score * 2) / 2;
      const roundedVelocity = Math.round(signal.sentiment_velocity / 5) * 5;
      
      const patternKey = `${signal.ticker}_${roundedZScore}_${roundedVelocity}`;
      
      if (!patternMap.has(patternKey)) {
        patternMap.set(patternKey, {
          ticker: signal.ticker,
          rounded_z_score: roundedZScore,
          rounded_sentiment_velocity: roundedVelocity,
          signal_count: 0,
          success_count_1h: 0,
          success_count_3h: 0,
          success_count_eod: 0,
          success_threshold: successThreshold
        });
      }

      const pattern = patternMap.get(patternKey)!;
      pattern.signal_count++;
      
      if (signal.success_high === true) pattern.success_count_1h++;
      if (signal.success_close === true) pattern.success_count_eod++;
    }

    console.log(`🎯 IDENTIFIED ${patternMap.size} UNIQUE PATTERNS`);

    // Insert or update pattern stats
    let processedCount = 0;
    const errors = [];

    for (const pattern of patternMap.values()) {
      try {
        const { error: upsertError } = await supabase
          .from('signal_pattern_stats')
          .upsert({
            ticker: pattern.ticker,
            rounded_z_score: pattern.rounded_z_score,
            rounded_sentiment_velocity: pattern.rounded_sentiment_velocity,
            signal_count: pattern.signal_count,
            success_count_1h: pattern.success_count_1h,
            success_count_3h: pattern.success_count_3h,
            success_count_eod: pattern.success_count_eod,
            success_threshold: pattern.success_threshold,
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'ticker,rounded_z_score,rounded_sentiment_velocity,success_threshold'
          });

        if (upsertError) {
          console.error('❌ ERROR UPSERTING PATTERN:', upsertError);
          errors.push(`${pattern.ticker}: ${upsertError.message}`);
        } else {
          processedCount++;
        }
      } catch (error) {
        console.error('❌ UNEXPECTED ERROR:', error);
        errors.push(`${pattern.ticker}: ${error.message}`);
      }
    }

    console.log(`✅ PATTERN ANALYSIS COMPLETE: ${processedCount} patterns processed`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        patterns_processed: processedCount,
        total_signals_analyzed: signals.length,
        unique_patterns_found: patternMap.size,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully analyzed ${signals.length} signals and processed ${processedCount} patterns`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ FUNCTION LEVEL ERROR:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Pattern analysis failed',
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
