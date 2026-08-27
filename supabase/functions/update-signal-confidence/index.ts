
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConfidenceUpdateOptions {
  signal_id?: string;
  batch_mode?: boolean;
  limit?: number;
  success_threshold?: number;
}

interface PatternStats {
  success_rate_eod: number;
  signal_count: number;
  success_threshold?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 UPDATE CONFIDENCE: Starting signal confidence update');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody = await req.json() as ConfidenceUpdateOptions;
    console.log('📊 UPDATE CONFIDENCE: Options:', requestBody);

    const { signal_id, batch_mode = true, limit = 50, success_threshold } = requestBody;
    const successThreshold = success_threshold ?? Number(Deno.env.get('SUCCESS_THRESHOLD') ?? 0.10);
    console.log(`🎯 USING SUCCESS THRESHOLD: ${(successThreshold * 100).toFixed(1)}%`);

    // Build query for signals to update
    let query = supabase
      .from('enriched_signals')
      .select('id, ticker, z_score, sentiment_velocity, confidence_score')
      .is('confidence_score', null); // Only update signals without confidence scores

    if (signal_id) {
      query = query.eq('id', signal_id);
    } else if (batch_mode) {
      query = query
        .order('signal_detected_at', { ascending: false })
        .limit(limit);
    }

    const { data: signalsToUpdate, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ FETCH ERROR:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!signalsToUpdate || signalsToUpdate.length === 0) {
      console.log('✅ NO SIGNALS TO UPDATE');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No signals need confidence updates',
          updated_count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔄 PROCESSING: ${signalsToUpdate.length} signals for confidence scoring`);

    let updatedCount = 0;
    const errors: string[] = [];

    // Process each signal
    for (const signal of signalsToUpdate) {
      try {
        // Round z_score and sentiment_velocity to match pattern buckets
        const roundedZScore = signal.z_score ? Math.round(signal.z_score * 2) / 2 : 0; // Round to nearest 0.5
        const roundedVelocity = signal.sentiment_velocity ? Math.round(signal.sentiment_velocity / 5) * 5 : 0; // Round to nearest 5

        console.log(`📊 SIGNAL ${signal.id}: Lookup pattern - ticker: ${signal.ticker}, z_score: ${roundedZScore}, velocity: ${roundedVelocity}`);

        // Look up pattern stats
        const { data: patternStats, error: lookupError } = await supabase
          .from('signal_pattern_stats')
          .select('success_rate_eod, signal_count, success_threshold')
          .eq('ticker', signal.ticker)
          .eq('rounded_z_score', roundedZScore)
          .eq('rounded_sentiment_velocity', roundedVelocity)
          .eq('success_threshold', successThreshold)
          .maybeSingle() as { data: PatternStats | null, error: any };

        if (lookupError) {
          console.error(`❌ LOOKUP ERROR for signal ${signal.id}:`, lookupError);
          errors.push(`Lookup failed for signal ${signal.id}: ${lookupError.message}`);
          continue;
        }

        // Calculate confidence score
        let confidenceScore: number;
        let confidenceSource: string;

        if (patternStats && patternStats.signal_count >= 3) {
          // Use pattern-based confidence if we have enough historical data
          confidenceScore = Math.min(patternStats.success_rate_eod / 100, 1.0);
          confidenceSource = `pattern_stats_v1_${patternStats.signal_count}_signals`;
          console.log(`✅ PATTERN MATCH: Signal ${signal.id} - confidence: ${confidenceScore} (${patternStats.signal_count} historical signals)`);
        } else {
          // Fallback confidence score
          confidenceScore = 0.50; // Default neutral confidence
          confidenceSource = 'default_fallback';
          console.log(`🔄 FALLBACK: Signal ${signal.id} - using default confidence: ${confidenceScore}`);
        }

        // Update the signal with confidence score
        const { error: updateError } = await supabase
          .from('enriched_signals')
          .update({
            confidence_score: confidenceScore,
            confidence_source: confidenceSource
          })
          .eq('id', signal.id);

        if (updateError) {
          console.error(`❌ UPDATE ERROR for signal ${signal.id}:`, updateError);
          errors.push(`Update failed for signal ${signal.id}: ${updateError.message}`);
        } else {
          updatedCount++;
          console.log(`✅ UPDATED: Signal ${signal.id} confidence score: ${confidenceScore}`);
        }

      } catch (signalError) {
        console.error(`❌ SIGNAL PROCESSING ERROR for ${signal.id}:`, signalError);
        errors.push(`Processing failed for signal ${signal.id}: ${signalError.message}`);
      }
    }

    console.log(`🎉 CONFIDENCE UPDATE COMPLETE: ${updatedCount} signals updated`);

    const response = {
      success: true,
      updated_count: updatedCount,
      total_processed: signalsToUpdate.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully updated confidence scores for ${updatedCount} out of ${signalsToUpdate.length} signals`
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ CONFIDENCE UPDATE ERROR:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown confidence update error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
