
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvaluateReplayRequest {
  replay_batch_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
  batch_size?: number;
  success_threshold?: number; // Configurable success threshold
}

interface ReplayEvaluationResult {
  signal_id: string;
  success_1h: boolean | null;
  success_3h: boolean | null;
  success_eod: boolean | null;
  evaluated_windows: string[];
  pct_change_1h?: number;
  pct_change_3h?: number;
  pct_change_eod?: number;
}

Deno.serve(async (req) => {
  console.log('📈 REPLAY EVALUATION PIPELINE: Function started');
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
    
    let requestData: EvaluateReplayRequest = {};
    
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

    console.log('📊 REPLAY EVALUATION REQUEST:', requestData);

    // Default success threshold is 1.5%
    const SUCCESS_THRESHOLD = requestData.success_threshold || 1.5;
    console.log(`🎯 SUCCESS THRESHOLD: ${SUCCESS_THRESHOLD}%`);

    // Build query for replay signals to evaluate
    let query = supabase
      .from('enriched_signals')
      .select('*')
      .eq('source', 'replay')
      .eq('price_metadata_status', 'simulated')
      .in('evaluation_status', ['pending', null])
      .order('signal_detected_at', { ascending: true });

    // Apply filters
    if (requestData.replay_batch_id) {
      console.log('🎯 FILTERING BY BATCH ID:', requestData.replay_batch_id);
      query = query.eq('replay_batch_id', requestData.replay_batch_id);
    }

    if (requestData.date_range) {
      console.log('📅 FILTERING BY DATE RANGE:', requestData.date_range);
      query = query
        .gte('signal_detected_at', requestData.date_range.start)
        .lte('signal_detected_at', requestData.date_range.end);
    }

    // Apply batch size limit
    const batchSize = requestData.batch_size || 100;
    query = query.limit(batchSize);

    const { data: replaySignals, error } = await query;

    if (error) {
      console.error('❌ ERROR FETCHING REPLAY SIGNALS:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch replay signals: ${error.message}`
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!replaySignals || replaySignals.length === 0) {
      console.log('ℹ️ NO REPLAY SIGNALS TO EVALUATE');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No replay signals ready for evaluation',
          evaluated_count: 0,
          batch_summary: {
            total_processed: 0,
            success_rate_1h: 0,
            success_rate_3h: 0,
            success_rate_eod: 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 FOUND ${replaySignals.length} REPLAY SIGNALS TO EVALUATE`);

    const evaluationResults: ReplayEvaluationResult[] = [];
    let processedCount = 0;
    let failedCount = 0;
    
    for (const signal of replaySignals) {
      console.log(`🔍 EVALUATING REPLAY SIGNAL: ${signal.id} (${signal.ticker})`);
      
      try {
        const result = await evaluateReplaySignal(signal, supabase, SUCCESS_THRESHOLD);
        evaluationResults.push(result);
        processedCount++;
        
        console.log(`✅ EVALUATED: ${signal.ticker} - Windows: ${result.evaluated_windows.join(', ')}`);
      } catch (evalError) {
        console.error(`❌ FAILED TO EVALUATE SIGNAL ${signal.id}:`, evalError);
        failedCount++;
        
        // Mark as failed evaluation
        await supabase
          .from('enriched_signals')
          .update({
            evaluation_status: 'failed',
            evaluation_timestamp: new Date().toISOString()
          })
          .eq('id', signal.id);
      }
    }

    // Calculate batch summary statistics
    const batchSummary = calculateBatchSummary(evaluationResults);
    
    console.log(`🎉 REPLAY EVALUATION COMPLETE: ${processedCount} processed, ${failedCount} failed`);
    console.log(`📊 BATCH SUMMARY:`, batchSummary);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        evaluated_count: processedCount,
        failed_count: failedCount,
        results: evaluationResults,
        batch_summary: batchSummary,
        replay_batch_id: requestData.replay_batch_id,
        success_threshold: SUCCESS_THRESHOLD,
        message: `Successfully evaluated ${processedCount} replay signal${processedCount !== 1 ? 's' : ''}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ FUNCTION LEVEL ERROR:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Replay evaluation failed',
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function evaluateReplaySignal(signal: any, supabase: any, successThreshold: number): Promise<ReplayEvaluationResult> {
  // Determine if signal is bullish or bearish
  const isBullish = signal.sentiment_type?.toLowerCase().includes('bullish') || 
                   signal.sentiment_type?.toLowerCase().includes('positive') ||
                   signal.z_score > 0;
  
  console.log(`📈 REPLAY SIGNAL DIRECTION: ${signal.ticker} - ${isBullish ? 'BULLISH' : 'BEARISH'} (sentiment: ${signal.sentiment_type}, z_score: ${signal.z_score})`);
  
  // Evaluate each time window using configurable threshold
  const success_1h = evaluateTimeWindow(signal.change_1h, isBullish, successThreshold);
  const success_3h = evaluateTimeWindow(signal.change_3h, isBullish, successThreshold);
  const success_eod = evaluateTimeWindow(signal.change_eod, isBullish, successThreshold);
  
  const evaluatedWindows = [];
  if (success_1h !== null) evaluatedWindows.push('1h');
  if (success_3h !== null) evaluatedWindows.push('3h');
  if (success_eod !== null) evaluatedWindows.push('eod');
  
  console.log(`📊 REPLAY RESULTS: 1h=${success_1h}, 3h=${success_3h}, eod=${success_eod}`);
  
  // Update the enriched_signals record
  const { error: updateError } = await supabase
    .from('enriched_signals')
    .update({
      success_1h,
      success_3h,
      success_eod,
      evaluation_status: 'complete',
      evaluation_timestamp: new Date().toISOString()
    })
    .eq('id', signal.id);

  if (updateError) {
    console.error('❌ ERROR UPDATING REPLAY SIGNAL:', updateError);
    throw new Error(`Failed to update replay signal ${signal.id}: ${updateError.message}`);
  }

  // Create detailed audit log entry with replay context
  const { error: auditError } = await supabase
    .from('signal_success_audit_log')
    .insert({
      signal_id: signal.id,
      ticker: signal.ticker,
      signal_detected_at: signal.signal_detected_at,
      sentiment_type: signal.sentiment_type,
      z_score: signal.z_score,
      change_1h: signal.change_1h,
      change_3h: signal.change_3h,
      change_eod: signal.change_eod,
      success_1h,
      success_3h,
      success_eod
    });

  if (auditError) {
    console.error('⚠️ WARNING: Failed to create replay audit log entry:', auditError);
    // Don't throw error - audit log failure shouldn't break the evaluation
  }

  return {
    signal_id: signal.id,
    success_1h,
    success_3h,
    success_eod,
    evaluated_windows: evaluatedWindows,
    pct_change_1h: signal.change_1h,
    pct_change_3h: signal.change_3h,
    pct_change_eod: signal.change_eod
  };
}

function evaluateTimeWindow(priceChange: number | null, isBullish: boolean, threshold: number): boolean | null {
  if (priceChange === null || priceChange === undefined) {
    return null; // Can't evaluate if no price data
  }
  
  if (isBullish) {
    // For bullish signals, success if price increased by threshold or more
    return priceChange >= threshold;
  } else {
    // For bearish signals, success if price decreased by threshold or more
    return priceChange <= -threshold;
  }
}

function calculateBatchSummary(results: ReplayEvaluationResult[]) {
  if (results.length === 0) {
    return {
      total_processed: 0,
      success_rate_1h: 0,
      success_rate_3h: 0,
      success_rate_eod: 0,
      avg_change_1h: 0,
      avg_change_3h: 0,
      avg_change_eod: 0
    };
  }

  const valid_1h = results.filter(r => r.success_1h !== null);
  const valid_3h = results.filter(r => r.success_3h !== null);
  const valid_eod = results.filter(r => r.success_eod !== null);

  const success_1h_count = results.filter(r => r.success_1h === true).length;
  const success_3h_count = results.filter(r => r.success_3h === true).length;
  const success_eod_count = results.filter(r => r.success_eod === true).length;

  const avg_change_1h = results.reduce((sum, r) => sum + (r.pct_change_1h || 0), 0) / results.length;
  const avg_change_3h = results.reduce((sum, r) => sum + (r.pct_change_3h || 0), 0) / results.length;
  const avg_change_eod = results.reduce((sum, r) => sum + (r.pct_change_eod || 0), 0) / results.length;

  return {
    total_processed: results.length,
    success_rate_1h: valid_1h.length > 0 ? (success_1h_count / valid_1h.length) * 100 : 0,
    success_rate_3h: valid_3h.length > 0 ? (success_3h_count / valid_3h.length) * 100 : 0,
    success_rate_eod: valid_eod.length > 0 ? (success_eod_count / valid_eod.length) * 100 : 0,
    avg_change_1h,
    avg_change_3h,
    avg_change_eod
  };
}
