import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvaluateRequest {
  signal_id?: string;
  batch_mode?: boolean;
  limit?: number;
  success_threshold?: number; // Custom threshold override
}

interface SignalEvaluationResult {
  signal_id: string;
  success_high: boolean | null;
  success_close: boolean | null;
  high_gain_percent: number | null;
  close_gain_percent: number | null;
  threshold_used: number;
}

Deno.serve(async (req) => {
  console.log('🎯 DAILY SUCCESS EVALUATION: Function started');
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
    
    let requestData: EvaluateRequest = {};
    
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

    console.log('📊 EVALUATION REQUEST:', requestData);

    let signalsToEvaluate;

    if (requestData.signal_id) {
      // Single signal evaluation
      console.log('🎯 SINGLE SIGNAL MODE:', requestData.signal_id);
      const { data, error } = await supabase
        .from('enriched_signals')
        .select('*')
        .eq('id', requestData.signal_id)
        .single();

      if (error) {
        console.error('❌ ERROR FETCHING SIGNAL:', error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Signal not found: ${error.message}`
          }),
          { 
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      signalsToEvaluate = [data];
    } else {
      // Batch evaluation mode
      console.log('📦 BATCH EVALUATION MODE');
      const limit = requestData.limit || 50;
      
      const { data, error } = await supabase
        .from('enriched_signals')
        .select('*')
        .eq('evaluation_status', 'unevaluated')
        .eq('price_metadata_status', 'complete')
        .not('price_open', 'is', null)
        .not('price_high', 'is', null)
        .not('price_close', 'is', null)
        .limit(limit)
        .order('signal_detected_at', { ascending: true });

      if (error) {
        console.error('❌ ERROR FETCHING SIGNALS FOR BATCH:', error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Batch fetch failed: ${error.message}`
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      signalsToEvaluate = data || [];
      console.log(`📊 FOUND ${signalsToEvaluate.length} SIGNALS TO EVALUATE`);
    }

    if (signalsToEvaluate.length === 0) {
      console.log('ℹ️ NO SIGNALS TO EVALUATE');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No signals ready for evaluation',
          evaluated_count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const evaluationResults: SignalEvaluationResult[] = [];
    const customThreshold = requestData.success_threshold;
    
    for (const signal of signalsToEvaluate) {
      console.log(`🔍 EVALUATING SIGNAL: ${signal.id} (${signal.ticker})`);
      
      const result = await evaluateDailySignal(signal, supabase, customThreshold);
      evaluationResults.push(result);
      
      console.log(`✅ EVALUATED: ${signal.ticker} - High: ${result.success_high}, Close: ${result.success_close}`);
    }

    const successCount = evaluationResults.length;
    
    // Auto-trigger learning data logging for the evaluated signals
    if (successCount > 0) {
      console.log('📚 TRIGGERING LEARNING DATA LOG');
      try {
        const evaluatedSignalIds = evaluationResults.map(r => r.signal_id);
        
        const { data: logResult, error: logError } = await supabase.functions.invoke(
          'log-signal-learning-data',
          {
            body: {
              enriched_signal_ids: evaluatedSignalIds,
              batch_mode: false
            }
          }
        );

        if (logError) {
          console.warn('⚠️ LEARNING LOG WARNING:', logError);
        } else {
          console.log('✅ LEARNING DATA LOGGED:', logResult?.logged_count || 0, 'entries');
        }
      } catch (logError) {
        console.warn('⚠️ LEARNING LOG FAILED:', logError);
        // Don't fail the main evaluation - learning log is supplementary
      }
    }
    
    console.log(`🎉 EVALUATION COMPLETE: ${successCount} signals processed`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        evaluated_count: successCount,
        results: evaluationResults,
        message: `Successfully evaluated ${successCount} signal${successCount !== 1 ? 's' : ''}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ FUNCTION LEVEL ERROR:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Signal evaluation failed',
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function evaluateDailySignal(signal: any, supabase: any, customThreshold?: number): Promise<SignalEvaluationResult> {
  // Use custom threshold, signal's threshold, or configured default (10%)
  const DEFAULT_THRESHOLD = Number(Deno.env.get('SUCCESS_THRESHOLD') ?? 0.10);
  const successThreshold = customThreshold || signal.success_threshold || DEFAULT_THRESHOLD;
  
  console.log(`📊 DAILY PRICES: ${signal.ticker} - Open: $${signal.price_open}, High: $${signal.price_high}, Close: $${signal.price_close}`);
  
  // Calculate percentage gains from open price
  const high_gain_percent = signal.price_open > 0 ? 
    ((signal.price_high - signal.price_open) / signal.price_open) : null;
  
  const close_gain_percent = signal.price_open > 0 ? 
    ((signal.price_close - signal.price_open) / signal.price_open) : null;
  
  // Determine signal direction
  const isBullish = signal.sentiment_type?.toLowerCase().includes('bullish') || 
                   signal.sentiment_type?.toLowerCase().includes('positive') ||
                   (signal.sentiment_velocity && signal.sentiment_velocity > 0) ||
                   signal.z_score > 0;
  
  console.log(`📈 SIGNAL DIRECTION: ${signal.ticker} - ${isBullish ? 'BULLISH' : 'BEARISH'} (sentiment: ${signal.sentiment_type})`);
  console.log(`💹 GAINS: High: ${(high_gain_percent * 100).toFixed(2)}%, Close: ${(close_gain_percent * 100).toFixed(2)}%`);
  
  // Evaluate success based on direction and threshold
  let success_high: boolean | null = null;
  let success_close: boolean | null = null;
  
  if (high_gain_percent !== null) {
    if (isBullish) {
      success_high = high_gain_percent >= successThreshold;
    } else {
      // For bearish signals, check if price dropped from open to high (unlikely) or stayed flat
      success_high = high_gain_percent <= successThreshold;
    }
  }
  
  if (close_gain_percent !== null) {
    if (isBullish) {
      success_close = close_gain_percent >= successThreshold;
    } else {
      // For bearish signals, success if price closed down by threshold or more
      success_close = close_gain_percent <= -successThreshold;
    }
  }
  
  console.log(`✅ SUCCESS EVALUATION: High=${success_high}, Close=${success_close} (threshold: ${(successThreshold * 100).toFixed(1)}%)`);
  
  // Update the enriched_signals record with new success fields
  const { error: updateError } = await supabase
    .from('enriched_signals')
    .update({
      success_high,
      success_close,
      success_threshold: successThreshold,
      evaluation_status: 'complete',
      evaluation_timestamp: new Date().toISOString()
    })
    .eq('id', signal.id);

  if (updateError) {
    console.error('❌ ERROR UPDATING SIGNAL:', updateError);
    throw new Error(`Failed to update signal ${signal.id}: ${updateError.message}`);
  }

  // Create audit log entry with daily data
  const { error: auditError } = await supabase
    .from('signal_success_audit_log')
    .insert({
      signal_id: signal.id,
      ticker: signal.ticker,
      signal_detected_at: signal.signal_detected_at,
      sentiment_type: signal.sentiment_type,
      z_score: signal.z_score,
      // Keep old fields null for compatibility but don't rely on them
      change_1h: null,
      change_3h: null,
      change_eod: null,
      success_1h: null,
      success_3h: null,
      success_eod: null
    });

  if (auditError) {
    console.error('⚠️ WARNING: Failed to create audit log entry:', auditError);
    // Don't throw error - audit log failure shouldn't break the evaluation
  }

  return {
    signal_id: signal.id,
    success_high,
    success_close,
    high_gain_percent,
    close_gain_percent,
    threshold_used: successThreshold
  };
}
