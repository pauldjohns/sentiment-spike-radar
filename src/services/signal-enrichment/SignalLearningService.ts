
import { supabase } from '@/integrations/supabase/client';

export class SignalLearningService {
  /**
   * Log signal learning data for ML training purposes
   */
  static async logSignalLearningData(options?: {
    enriched_signal_ids?: string[];
    batch_mode?: boolean;
    limit?: number;
  }): Promise<{ success: boolean; logged_count?: number; error?: string }> {
    try {
      console.log('📚 FRONTEND: Triggering signal learning data logging');
      console.log('📊 FRONTEND: Options:', options);

      const requestBody = options || { batch_mode: true };

      const { data, error } = await supabase.functions.invoke(
        'log-signal-learning-data',
        {
          body: requestBody
        }
      );

      console.log('📥 FRONTEND: Learning log response');
      console.log('✅ FRONTEND: Data:', data);
      console.log('❌ FRONTEND: Error:', error);

      if (error) {
        console.error('❌ FRONTEND: Error calling log-signal-learning-data function:', error);
        return { success: false, error: error.message };
      }

      return data || { success: false, error: 'No response data' };

    } catch (error) {
      console.error('❌ FRONTEND: Signal learning log service error:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Export learning data as CSV or JSON
   */
  static async exportLearningData(options?: {
    format?: 'csv' | 'json';
    limit?: number;
    ticker?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('📤 FRONTEND: Exporting learning data');
      console.log('📊 FRONTEND: Options:', options);

      const params = new URLSearchParams();
      if (options?.format) params.append('format', options.format);
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.ticker) params.append('ticker', options.ticker);

      const { data, error } = await supabase.functions.invoke(
        'export-learning-data?' + params.toString(),
        {
          method: 'GET'
        }
      );

      console.log('📥 FRONTEND: Export response');
      console.log('✅ FRONTEND: Data:', data);
      console.log('❌ FRONTEND: Error:', error);

      if (error) {
        console.error('❌ FRONTEND: Error calling export-learning-data function:', error);
        return { success: false, error: error.message };
      }

      return data || { success: false, error: 'No response data' };

    } catch (error) {
      console.error('❌ FRONTEND: Learning data export service error:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }
}
