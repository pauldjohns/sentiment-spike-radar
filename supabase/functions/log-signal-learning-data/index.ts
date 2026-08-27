
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LogLearningDataOptions {
  enriched_signal_ids?: string[];
  batch_mode?: boolean;
  limit?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📚 LEARNING LOG: Starting signal learning data logging');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody = await req.json() as LogLearningDataOptions;
    console.log('📊 LEARNING LOG: Options:', requestBody);

    const { enriched_signal_ids, batch_mode = true, limit = 100 } = requestBody;

    // Build query for signals to log
    let query = supabase
      .from('enriched_signals')
      .select('*')
      .eq('evaluation_status', 'complete')
      .not('success_eod', 'is', null); // Only log signals with complete evaluation

    if (enriched_signal_ids && enriched_signal_ids.length > 0) {
      query = query.in('id', enriched_signal_ids);
    } else if (batch_mode) {
      // Get signals that haven't been logged yet
      const { data: alreadyLogged } = await supabase
        .from('signal_learning_log')
        .select('enriched_signal_id');
      
      const loggedIds = alreadyLogged?.map(l => l.enriched_signal_id) || [];
      
      if (loggedIds.length > 0) {
        query = query.not('id', 'in', `(${loggedIds.map(id => `'${id}'`).join(',')})`);
      }
      
      query = query
        .order('signal_detected_at', { ascending: false })
        .limit(limit);
    }

    const { data: signalsToLog, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ FETCH ERROR:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!signalsToLog || signalsToLog.length === 0) {
      console.log('✅ NO NEW SIGNALS TO LOG');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No new signals to log',
          logged_count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔄 PROCESSING: ${signalsToLog.length} signals for learning log`);

    // Prepare learning log entries
    const learningLogEntries = signalsToLog.map(signal => ({
      enriched_signal_id: signal.id,
      ticker: signal.ticker,
      time_window: signal.time_window,
      z_score: signal.z_score,
      sentiment_velocity: signal.sentiment_velocity,
      message_volume: signal.message_volume,
      success_eod: signal.success_eod,
      success_1h: signal.success_1h,
      success_3h: signal.success_3h,
      confidence_score: signal.confidence_score,
      evaluated_at: signal.evaluation_timestamp || signal.created_at
    }));

    // Insert learning log entries
    const { data: insertedEntries, error: insertError } = await supabase
      .from('signal_learning_log')
      .insert(learningLogEntries)
      .select('id');

    if (insertError) {
      console.error('❌ INSERT ERROR:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const loggedCount = insertedEntries?.length || 0;
    console.log(`🎉 LEARNING LOG COMPLETE: ${loggedCount} entries logged`);

    // Update ticker priorities based on logged signal success
    const now = new Date().toISOString();
    const tickerStats: Record<string, { success: number; total: number }> = {};

    for (const signal of signalsToLog) {
      if (!tickerStats[signal.ticker]) {
        tickerStats[signal.ticker] = { success: 0, total: 0 };
      }
      tickerStats[signal.ticker].total += 1;
      if (signal.success_eod) {
        tickerStats[signal.ticker].success += 1;
      }
    }

    for (const [ticker, stats] of Object.entries(tickerStats)) {
      const successRate = stats.success / stats.total;
      await supabase
        .from('active_ticker_queue')
        .update({ priority_score: successRate, last_activity: now })
        .eq('ticker', ticker);
    }

    const response = {
      success: true,
      logged_count: loggedCount,
      total_processed: signalsToLog.length,
      message: `Successfully logged ${loggedCount} signal learning entries`
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ LEARNING LOG ERROR:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown learning log error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
