
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportReplayRequest {
  replay_batch_id?: string;
  min_z_score?: number;
  sentiment_type?: string;
  time_window?: string;
  format?: 'csv' | 'json';
}

Deno.serve(async (req) => {
  console.log('📊 EXPORT REPLAY RESULTS: Function started');
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
    
    let requestData: ExportReplayRequest = {};
    
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

    console.log('📊 EXPORT REQUEST:', requestData);

    // Build query for replay signals
    let query = supabase
      .from('enriched_signals')
      .select(`
        id,
        ticker,
        signal_detected_at,
        time_window,
        sentiment_type,
        z_score,
        sentiment_velocity,
        message_volume,
        price_at_signal,
        price_1h_later,
        price_3h_later,
        price_eod,
        change_1h,
        change_3h,
        change_eod,
        success_1h,
        success_3h,
        success_eod,
        evaluation_status,
        evaluation_timestamp,
        replay_batch_id,
        confidence_score
      `)
      .eq('source', 'replay')
      .eq('evaluation_status', 'complete')
      .order('signal_detected_at', { ascending: false });

    // Apply filters
    if (requestData.replay_batch_id) {
      console.log('🎯 FILTERING BY BATCH ID:', requestData.replay_batch_id);
      query = query.eq('replay_batch_id', requestData.replay_batch_id);
    }

    if (requestData.min_z_score) {
      console.log('🎯 FILTERING BY MIN Z-SCORE:', requestData.min_z_score);
      query = query.gte('z_score', requestData.min_z_score);
    }

    if (requestData.sentiment_type) {
      console.log('🎯 FILTERING BY SENTIMENT TYPE:', requestData.sentiment_type);
      query = query.eq('sentiment_type', requestData.sentiment_type);
    }

    if (requestData.time_window) {
      console.log('🎯 FILTERING BY TIME WINDOW:', requestData.time_window);
      query = query.eq('time_window', requestData.time_window);
    }

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
      console.log('ℹ️ NO REPLAY SIGNALS FOUND');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No replay signals found matching criteria',
          data: [],
          count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 FOUND ${replaySignals.length} REPLAY SIGNALS FOR EXPORT`);

    // Format data based on requested format
    const format = requestData.format || 'json';
    
    if (format === 'csv') {
      const csvHeader = [
        'id', 'ticker', 'signal_detected_at', 'time_window', 'sentiment_type',
        'z_score', 'sentiment_velocity', 'message_volume', 'confidence_score',
        'price_at_signal', 'price_1h_later', 'price_3h_later', 'price_eod',
        'change_1h', 'change_3h', 'change_eod',
        'success_1h', 'success_3h', 'success_eod',
        'evaluation_timestamp', 'replay_batch_id'
      ].join(',');

      const csvRows = replaySignals.map(signal => [
        signal.id,
        signal.ticker,
        signal.signal_detected_at,
        signal.time_window || '',
        signal.sentiment_type || '',
        signal.z_score || '',
        signal.sentiment_velocity || '',
        signal.message_volume || '',
        signal.confidence_score || '',
        signal.price_at_signal || '',
        signal.price_1h_later || '',
        signal.price_3h_later || '',
        signal.price_eod || '',
        signal.change_1h || '',
        signal.change_3h || '',
        signal.change_eod || '',
        signal.success_1h || '',
        signal.success_3h || '',
        signal.success_eod || '',
        signal.evaluation_timestamp || '',
        signal.replay_batch_id || ''
      ].join(','));

      const csvContent = [csvHeader, ...csvRows].join('\n');

      console.log(`✅ EXPORT COMPLETE: Generated CSV with ${replaySignals.length} records`);
      
      return new Response(csvContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="replay-signals-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else {
      // JSON format
      console.log(`✅ EXPORT COMPLETE: Generated JSON with ${replaySignals.length} records`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: replaySignals,
          count: replaySignals.length,
          filters: requestData,
          exported_at: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ FUNCTION LEVEL ERROR:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Export failed',
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
