import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔬 COMPREHENSIVE PIPELINE TEST: Starting full system verification...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const results = [];

    // Test 1: Test Finnhub connection directly
    console.log('🧪 TEST 1: Direct Finnhub API test...');
    try {
      const { data: finnhubTest, error: finnhubError } = await supabase.functions.invoke(
        'enrich-signal-price-metadata',
        {
          body: { 
            test_mode: true,
            // Use industry ticker instead of consumer stock for health check
            ticker: 'LMT'
          }
        }
      );

      if (finnhubError || !finnhubTest?.success) {
        results.push({
          test: 'Finnhub API Direct Test',
          status: 'FAILED',
          error: finnhubError?.message || finnhubTest?.error || 'Unknown error',
          details: finnhubTest
        });
      } else {
        results.push({
          test: 'Finnhub API Direct Test',
          status: 'PASSED',
          price_received: finnhubTest.price_at_signal,
          details: finnhubTest
        });
      }
    } catch (error) {
      results.push({
        test: 'Finnhub API Direct Test',
        status: 'FAILED',
        error: error.message,
        details: 'Exception occurred during test'
      });
    }

    // Test 2: Test StockTwits data fetch
    console.log('🧪 TEST 2: StockTwits data fetch test...');
    try {
      const { data: stocktwitsTest, error: stocktwitsError } = await supabase.functions.invoke(
        'fetch-stocktwits-data',
        {
          body: { 
            health_check: true
          }
        }
      );

      if (stocktwitsError || !stocktwitsTest?.success) {
        results.push({
          test: 'StockTwits API Test',
          status: 'FAILED',
          error: stocktwitsError?.message || stocktwitsTest?.error || 'Unknown error'
        });
      } else {
        results.push({
          test: 'StockTwits API Test',
          status: 'PASSED',
          details: stocktwitsTest
        });
      }
    } catch (error) {
      results.push({
        test: 'StockTwits API Test',
        status: 'FAILED',
        error: error.message
      });
    }

    // Test 3: Test full ingestion pipeline
    console.log('🧪 TEST 3: Full ingestion pipeline test...');
    try {
      const { data: ingestionTest, error: ingestionError } = await supabase.functions.invoke(
        'ingest-sentiment-data',
        {
          body: { 
            manual_override: true,
            test_mode: true
          }
        }
      );

      if (ingestionError || !ingestionTest?.success) {
        results.push({
          test: 'Full Ingestion Pipeline',
          status: 'FAILED',
          error: ingestionError?.message || ingestionTest?.error || 'Unknown error'
        });
      } else {
        results.push({
          test: 'Full Ingestion Pipeline',
          status: 'PASSED',
          signals_generated: ingestionTest.signals_generated || 0,
          details: ingestionTest
        });
      }
    } catch (error) {
      results.push({
        test: 'Full Ingestion Pipeline',
        status: 'FAILED',
        error: error.message
      });
    }

    // Test 4: Check database state
    console.log('🧪 TEST 4: Database state verification...');
    try {
      const { data: recentSignals } = await supabase
        .from('enriched_signals')
        .select('ticker, price_metadata_status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: pendingEnrichments } = await supabase
        .from('enriched_signals')
        .select('count', { count: 'exact' })
        .eq('price_metadata_status', 'pending');

      const { data: failedEnrichments } = await supabase
        .from('enriched_signals')
        .select('count', { count: 'exact' })
        .eq('price_metadata_status', 'failed');

      results.push({
        test: 'Database State',
        status: 'INFO',
        recent_signals: recentSignals?.length || 0,
        pending_enrichments: pendingEnrichments?.length || 0,
        failed_enrichments: failedEnrichments?.length || 0,
        recent_signal_sample: recentSignals?.slice(0, 3)
      });
    } catch (error) {
      results.push({
        test: 'Database State',
        status: 'FAILED',
        error: error.message
      });
    }

    // Summary
    const passedTests = results.filter(r => r.status === 'PASSED').length;
    const failedTests = results.filter(r => r.status === 'FAILED').length;
    const totalTests = results.filter(r => r.status !== 'INFO').length;

    console.log(`🏁 PIPELINE TEST COMPLETE: ${passedTests}/${totalTests} tests passed`);

    return new Response(
      JSON.stringify({
        success: failedTests === 0,
        summary: {
          passed: passedTests,
          failed: failedTests,
          total: totalTests,
          success_rate: totalTests > 0 ? (passedTests / totalTests * 100) : 0
        },
        results,
        timestamp: new Date().toISOString(),
        recommendation: failedTests > 0 
          ? 'System requires attention - check failed tests'
          : 'All systems operational'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ PIPELINE TEST ERROR:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Pipeline test failed',
        details: error.stack || 'No stack trace available'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});