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
    console.log('🔄 RETRY FAILED ENRICHMENTS: Starting retry process...');
    
    // Handle daily batch processing with rate limiting
    const requestBody = await req.json().catch(() => ({}));
    const { daily_batch = false, max_signals = 10 } = requestBody;
    
    if (daily_batch) {
      console.log(`📦 DAILY BATCH MODE: Processing up to ${Math.min(max_signals, 50)} signals with rate limiting`);
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find signals with failed or pending enrichment status that can be retried
    const limit = daily_batch ? Math.min(max_signals, 50) : 10; // Cap at 50 for rate limiting
    
    const { data: failedSignals, error: queryError } = await supabase
      .from('enriched_signals')
      .select('id, ticker, signal_detected_at, price_metadata_status, failure_reason, retry_count, last_retry_at')
      .in('price_metadata_status', ['failed', 'pending'])
      .not('price_metadata_status', 'eq', 'permanently_failed')  // Skip permanently failed
      .or('retry_count.is.null,retry_count.lt.5')  // Only retry if under 5 attempts
      .order('created_at', { ascending: false })
      .limit(limit);

    if (queryError) {
      console.error('❌ Error querying failed signals:', queryError);
      return new Response(
        JSON.stringify({ success: false, error: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!failedSignals || failedSignals.length === 0) {
      console.log('✅ No failed enrichments found to retry');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No failed or pending enrichments found',
          retried_signals: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎯 Found ${failedSignals.length} failed/pending enrichments to retry`);

    let retriedCount = 0;
    let successCount = 0;

    for (const signal of failedSignals) {
      try {
        const retryCount = signal.retry_count || 0;
        const lastRetryAt = signal.last_retry_at ? new Date(signal.last_retry_at) : null;
        
        // Implement backoff timing - wait longer between retries
        if (lastRetryAt && retryCount > 1) {
          const minWaitTime = Math.pow(2, retryCount) * 60 * 1000; // Exponential backoff in minutes
          const timeSinceLastRetry = Date.now() - lastRetryAt.getTime();
          
          if (timeSinceLastRetry < minWaitTime) {
            console.log(`⏳ Skipping ${signal.ticker} - waiting for backoff period (${Math.round((minWaitTime - timeSinceLastRetry) / 60000)} minutes remaining)`);
            continue;
          }
        }
        
        console.log(`🔄 Retrying enrichment for signal ${signal.id} (${signal.ticker}) - Attempt ${retryCount + 1}/5`);
        if (signal.failure_reason) {
          console.log(`   Previous failure: ${signal.failure_reason}`);
        }
        
        // Reset status to pending with updated retry tracking
        await supabase
          .from('enriched_signals')
          .update({ 
            price_metadata_status: 'pending',
            last_retry_at: new Date().toISOString()
          })
          .eq('id', signal.id);

        // Trigger enrichment
        const { data: enrichmentResult, error: enrichmentError } = await supabase.functions.invoke(
          'enrich-signal-price-metadata',
          {
            body: { 
              signal_id: signal.id,
              immediate_price_only: false
            }
          }
        );

        if (enrichmentError) {
          console.error(`❌ Retry failed for ${signal.ticker}:`, enrichmentError);
          
          // Update with enhanced failure tracking
          const newRetryCount = retryCount + 1;
          const isMaxRetries = newRetryCount >= 5;
          
          await supabase
            .from('enriched_signals')
            .update({ 
              price_metadata_status: isMaxRetries ? 'permanently_failed' : 'failed',
              failure_reason: enrichmentError.message || 'Enrichment function error',
              retry_count: newRetryCount,
              last_retry_at: new Date().toISOString()
            })
            .eq('id', signal.id);
            
          if (isMaxRetries) {
            console.log(`🚫 ${signal.ticker} marked as permanently failed after ${newRetryCount} attempts`);
          }
        } else {
          console.log(`✅ Retry successful for ${signal.ticker} after ${retryCount + 1} attempts`);
          successCount++;
        }

        retriedCount++;
        
        // Rate limiting delay - longer for daily batch processing
        const delay = daily_batch ? 2000 : 1000; // 2 seconds for batch, 1 second for regular
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        console.error(`❌ Error retrying signal ${signal.id}:`, error);
        
        // Update with error information
        await supabase
          .from('enriched_signals')
          .update({
            failure_reason: `Retry process error: ${error.message}`,
            last_retry_at: new Date().toISOString()
          })
          .eq('id', signal.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Retry process completed',
        retried_signals: retriedCount,
        successful_retries: successCount,
        failed_retries: retriedCount - successCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ RETRY PROCESS ERROR:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Retry process failed',
        details: error.stack || 'No stack trace available'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});