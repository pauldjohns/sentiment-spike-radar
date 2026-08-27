
import { supabase } from '@/integrations/supabase/client';

export class SignalAnalysisService {
  /**
   * Evaluate signal success for a specific signal or batch
   */
  static async evaluateSignalSuccess(options?: {
    signal_id?: string;
    batch_mode?: boolean;
    limit?: number;
  }): Promise<{ success: boolean; evaluated_count?: number; error?: string; results?: any[] }> {
    try {
      console.log('🧠 FRONTEND: Triggering signal success evaluation');
      console.log('📊 FRONTEND: Options:', options);

      const requestBody = options || { batch_mode: true };

      const { data, error } = await supabase.functions.invoke(
        'evaluate-signal-success',
        {
          body: requestBody
        }
      );

      console.log('📥 FRONTEND: Evaluation response');
      console.log('✅ FRONTEND: Data:', data);
      console.log('❌ FRONTEND: Error:', error);

      if (error) {
        console.error('❌ FRONTEND: Error calling evaluate-signal-success function:', error);
        return { success: false, error: error.message };
      }

      return data || { success: false, error: 'No response data' };

    } catch (error) {
      console.error('❌ FRONTEND: Signal evaluation service error:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Trigger pattern analysis to identify successful signal combinations
   */
  static async analyzeSignalPatterns(options?: {
    force_refresh?: boolean;
    ticker_filter?: string;
  }): Promise<{ success: boolean; patterns_processed?: number; error?: string }> {
    try {
      console.log('🔍 FRONTEND: Triggering signal pattern analysis');
      console.log('📊 FRONTEND: Options:', options);

      const requestBody = options || {};

      const { data, error } = await supabase.functions.invoke(
        'analyze-signal-patterns',
        {
          body: requestBody
        }
      );

      console.log('📥 FRONTEND: Pattern analysis response');
      console.log('✅ FRONTEND: Data:', data);
      console.log('❌ FRONTEND: Error:', error);

      if (error) {
        console.error('❌ FRONTEND: Error calling analyze-signal-patterns function:', error);
        return { success: false, error: error.message };
      }

      return data || { success: false, error: 'No response data' };

    } catch (error) {
      console.error('❌ FRONTEND: Pattern analysis service error:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }
}
