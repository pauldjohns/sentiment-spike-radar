
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📤 EXPORT: Starting learning data export');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'json';
    const limit = parseInt(url.searchParams.get('limit') || '1000');
    const ticker = url.searchParams.get('ticker');
    const includeSimulated = url.searchParams.get('include_simulated') === 'true';

    // Build query with simulation filtering
    let query = supabase
      .from('signal_learning_log')
      .select(`
        *,
        enriched_signals!inner(is_simulated, source)
      `)
      .order('evaluated_at', { ascending: false })
      .limit(limit);

    // Apply simulation filter (default to excluding simulated data)
    if (!includeSimulated) {
      query = query.or('enriched_signals.is_simulated.is.null,enriched_signals.is_simulated.eq.false');
    }

    if (ticker) {
      query = query.eq('ticker', ticker.toUpperCase());
    }

    const { data: learningData, error } = await query;

    if (error) {
      console.error('❌ EXPORT ERROR:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!learningData || learningData.length === 0) {
      const dataType = includeSimulated ? 'learning data' : 'live learning data';
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `No ${dataType} found`,
          data: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dataType = includeSimulated ? 'all learning records' : 'live learning records only';
    console.log(`📊 EXPORT: Found ${learningData.length} ${dataType}`);

    if (format === 'csv') {
      // Convert to CSV
      const headers = [
        'ticker', 'z_score', 'sentiment_velocity', 'message_volume',
        'success_eod', 'success_1h', 'success_3h', 'confidence_score',
        'time_window', 'evaluated_at', 'is_simulated'
      ];

      const csvRows = [
        headers.join(','),
        ...learningData.map(row => [
          row.ticker,
          row.z_score || '',
          row.sentiment_velocity || '',
          row.message_volume || '',
          row.success_eod !== null ? row.success_eod : '',
          row.success_1h !== null ? row.success_1h : '',
          row.success_3h !== null ? row.success_3h : '',
          row.confidence_score || '',
          row.time_window || '',
          row.evaluated_at || '',
          row.enriched_signals?.is_simulated || false
        ].join(','))
      ];

      const csvContent = csvRows.join('\n');
      const filename = `signal_learning_data_${includeSimulated ? 'all' : 'live'}_${new Date().toISOString().split('T')[0]}.csv`;

      return new Response(csvContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    // Return JSON format
    return new Response(
      JSON.stringify({
        success: true,
        data: learningData,
        count: learningData.length,
        format: 'json',
        includes_simulated: includeSimulated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ EXPORT ERROR:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown export error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
