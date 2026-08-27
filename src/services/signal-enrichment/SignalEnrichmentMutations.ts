
import { supabase } from '@/integrations/supabase/client';

export class SignalEnrichmentMutations {
  /**
   * Create an enriched signal entry and trigger price metadata collection
   */
  static async createEnrichedSignal(signalData: {
    ticker: string;
    time_window?: string;
    signal_detected_at: Date;
    sentiment_type?: string;
    z_score?: number;
    sentiment_velocity?: number;
    message_volume?: number;
  }): Promise<{ success: boolean; signal_id?: string; error?: string; warning?: string; is_simulated?: boolean }> {
    try {
      console.log('🎯 FRONTEND: Creating enriched signal via Edge Function for:', signalData.ticker);
      console.log('📊 FRONTEND: Signal data:', signalData);

      const requestBody = {
        ticker: signalData.ticker,
        time_window: signalData.time_window || null,
        signal_detected_at: signalData.signal_detected_at.toISOString(),
        sentiment_type: signalData.sentiment_type || null,
        z_score: signalData.z_score || null,
        sentiment_velocity: signalData.sentiment_velocity || null,
        message_volume: signalData.message_volume || null,
      };

      console.log('📤 FRONTEND: Sending request to create-enriched-signal function');
      console.log('📋 FRONTEND: Request body:', requestBody);

      // Call the create-enriched-signal edge function
      const { data, error } = await supabase.functions.invoke(
        'create-enriched-signal',
        {
          body: requestBody
        }
      );

      console.log('📥 FRONTEND: Response from edge function');
      console.log('✅ FRONTEND: Data:', data);
      console.log('❌ FRONTEND: Error:', error);

      if (error) {
        console.error('❌ FRONTEND: Error calling create-enriched-signal function:', error);
        return { success: false, error: error.message };
      }

      if (!data || !data.success) {
        console.error('❌ FRONTEND: Function returned error:', data);
        return { 
          success: false, 
          error: data?.error || 'Signal creation failed' 
        };
      }

      console.log(`✅ FRONTEND: Enriched signal created successfully: ${data.signal_id}${data.is_simulated ? ' (SIMULATED)' : ''}`);
      
      return { 
        success: true, 
        signal_id: data.signal_id,
        is_simulated: data.is_simulated,
        warning: data.warning // Include any warnings from enrichment
      };

    } catch (error) {
      console.error('❌ FRONTEND: Signal enrichment service error:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Update confidence scores for signals based on historical pattern performance
   */
  static async updateSignalConfidence(options?: {
    signal_id?: string;
    batch_mode?: boolean;
    limit?: number;
  }): Promise<{ success: boolean; updated_count?: number; error?: string }> {
    try {
      console.log('🎯 FRONTEND: Triggering signal confidence update');
      console.log('📊 FRONTEND: Options:', options);

      const requestBody = options || { batch_mode: true };

      const { data, error } = await supabase.functions.invoke(
        'update-signal-confidence',
        {
          body: requestBody
        }
      );

      console.log('📥 FRONTEND: Confidence update response');
      console.log('✅ FRONTEND: Data:', data);
      console.log('❌ FRONTEND: Error:', error);

      if (error) {
        console.error('❌ FRONTEND: Error calling update-signal-confidence function:', error);
        return { success: false, error: error.message };
      }

      return data || { success: false, error: 'No response data' };

    } catch (error) {
      console.error('❌ FRONTEND: Signal confidence update service error:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }
}
