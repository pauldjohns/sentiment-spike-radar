
// Simple service for enriched signal operations within edge functions
export class SignalEnrichmentService {
  static async createEnrichedSignal(
    supabase: any,
    signalData: {
      ticker: string;
      time_window?: string;
      sentiment_type?: string;
      z_score?: number;
      sentiment_velocity?: number;
      message_volume?: number;
    }
  ): Promise<{ success: boolean; signal_id?: string }> {
    try {
      const { data: enrichedSignal, error } = await supabase
        .from('enriched_signals')
        .insert({
          ticker: signalData.ticker,
          time_window: signalData.time_window || null,
          signal_detected_at: new Date().toISOString(),
          sentiment_type: signalData.sentiment_type || null,
          z_score: signalData.z_score || null,
          sentiment_velocity: signalData.sentiment_velocity || null,
          message_volume: signalData.message_volume || null,
          price_metadata_status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ ERROR creating enriched signal:', error);
        return { success: false };
      }

      return { success: true, signal_id: enrichedSignal.id };
    } catch (error) {
      console.error('❌ ENRICHED SIGNAL SERVICE ERROR:', error);
      return { success: false };
    }
  }
}
