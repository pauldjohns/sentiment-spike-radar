
// No imports needed - using direct Supabase client calls

export interface SignalData {
  ticker: string;
  time_window: string;
  sentiment_type: string;
  z_score: number;
  sentiment_velocity: number;
  message_volume: number;
  anomaly_score: number;
  signal_confidence: string;
}

export async function createEnrichedSignalEntry(
  supabase: any,
  signalData: SignalData
): Promise<{ success: boolean; enriched_signal_id?: string }> {
  try {
    console.log(`🎯 CREATING ENRICHED SIGNAL: ${signalData.ticker}`);
    
    // Insert into enriched_signals table
    const { data: enrichedSignal, error: enrichedError } = await supabase
      .from('enriched_signals')
      .insert({
        ticker: signalData.ticker,
        time_window: signalData.time_window,
        signal_detected_at: new Date().toISOString(),
        sentiment_type: signalData.sentiment_type,
        z_score: signalData.z_score,
        sentiment_velocity: signalData.sentiment_velocity,
        message_volume: signalData.message_volume,
        price_metadata_status: 'pending'
      })
      .select()
      .single();

    if (enrichedError) {
      console.error('❌ ERROR creating enriched signal:', enrichedError);
      return { success: false };
    }

    const enriched_signal_id = enrichedSignal.id;
    console.log(`✅ ENRICHED SIGNAL CREATED: ${enriched_signal_id}`);

    // Trigger price metadata collection asynchronously using Supabase client
    try {
      console.log(`🚀 TRIGGERING ENRICHMENT for signal: ${enriched_signal_id}, ticker: ${signalData.ticker}`);
      
      const { data: enrichmentResult, error: enrichmentError } = await supabase.functions.invoke(
        'enrich-signal-price-metadata',
        {
          body: { 
            signal_id: enriched_signal_id,
            immediate_price_only: false
          }
        }
      );

      if (enrichmentError) {
        console.error('⚠️ ENRICHMENT TRIGGER FAILED:', enrichmentError);
        // Update signal status to indicate enrichment failure but don't fail signal creation
        await supabase
          .from('enriched_signals')
          .update({ price_metadata_status: 'failed' })
          .eq('id', enriched_signal_id);
      } else {
        console.log('✅ PRICE ENRICHMENT TRIGGERED SUCCESSFULLY:', enrichmentResult);
      }
    } catch (enrichmentError) {
      console.error('❌ ENRICHMENT TRIGGER ERROR:', enrichmentError);
      // Update signal status to failed but don't fail the main operation
      await supabase
        .from('enriched_signals')
        .update({ price_metadata_status: 'failed' })
        .eq('id', enriched_signal_id);
    }

    return { success: true, enriched_signal_id };

  } catch (error) {
    console.error('❌ CREATE ENRICHED SIGNAL ERROR:', error);
    return { success: false };
  }
}
