
import { supabase } from '@/integrations/supabase/client';
import { EnrichedSignal, SignalSuccessMetrics } from './types';

export class SignalEnrichmentClient {
  /**
   * Get enriched signals with success evaluation data and proper simulation filtering
   */
  static async getEnrichedSignals(filters?: {
    ticker?: string;
    status?: string;
    evaluation_status?: string;
    limit?: number;
    include_simulated?: boolean;
  }): Promise<EnrichedSignal[]> {
    try {
      let query = supabase
        .from('enriched_signals')
        .select('*')
        .order('signal_detected_at', { ascending: false });

      // Apply simulation filter (default to excluding simulated data)
      if (!filters?.include_simulated) {
        query = query.or('is_simulated.is.null,is_simulated.eq.false');
      }

      if (filters?.ticker) {
        query = query.eq('ticker', filters.ticker);
      }

      if (filters?.status) {
        query = query.eq('price_metadata_status', filters.status);
      }

      if (filters?.evaluation_status) {
        query = query.eq('evaluation_status', filters.evaluation_status);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ ERROR fetching enriched signals:', error);
        return [];
      }

      const dataType = filters?.include_simulated ? 'all signals' : 'live signals only';
      console.log(`✅ ENRICHED SIGNALS: Retrieved ${data?.length || 0} ${dataType}`);
      
      return data || [];
    } catch (error) {
      console.error('❌ GET ENRICHED SIGNALS ERROR:', error);
      return [];
    }
  }

  /**
   * Get signal success metrics and analytics for live data only
   */
  static async getSignalSuccessMetrics(): Promise<SignalSuccessMetrics> {
    try {
      const { data, error } = await supabase
        .from('enriched_signals')
        .select('success_1h, success_3h, success_eod, sentiment_type, evaluation_status')
        .eq('evaluation_status', 'complete')
        .or('is_simulated.is.null,is_simulated.eq.false'); // Exclude simulated data

      if (error) {
        console.error('❌ ERROR fetching success metrics:', error);
        return {
          total_signals: 0,
          evaluated_signals: 0,
          success_rate_1h: 0,
          success_rate_3h: 0,
          success_rate_eod: 0,
          bullish_success_rate: 0,
          bearish_success_rate: 0
        };
      }

      const evaluatedSignals = data || [];
      const total_signals = evaluatedSignals.length;

      if (total_signals === 0) {
        return {
          total_signals: 0,
          evaluated_signals: 0,
          success_rate_1h: 0,
          success_rate_3h: 0,
          success_rate_eod: 0,
          bullish_success_rate: 0,
          bearish_success_rate: 0
        };
      }

      // Calculate success rates by time window
      const success_1h_count = evaluatedSignals.filter(s => s.success_1h === true).length;
      const success_3h_count = evaluatedSignals.filter(s => s.success_3h === true).length;
      const success_eod_count = evaluatedSignals.filter(s => s.success_eod === true).length;

      const valid_1h = evaluatedSignals.filter(s => s.success_1h !== null).length;
      const valid_3h = evaluatedSignals.filter(s => s.success_3h !== null).length;
      const valid_eod = evaluatedSignals.filter(s => s.success_eod !== null).length;

      // Calculate success rates by sentiment type
      const bullishSignals = evaluatedSignals.filter(s => 
        s.sentiment_type?.toLowerCase().includes('bullish') || 
        s.sentiment_type?.toLowerCase().includes('positive')
      );
      const bearishSignals = evaluatedSignals.filter(s => 
        s.sentiment_type?.toLowerCase().includes('bearish') || 
        s.sentiment_type?.toLowerCase().includes('negative')
      );

      const bullishSuccesses = bullishSignals.filter(s => 
        s.success_1h === true || s.success_3h === true || s.success_eod === true
      ).length;
      const bearishSuccesses = bearishSignals.filter(s => 
        s.success_1h === true || s.success_3h === true || s.success_eod === true
      ).length;

      console.log(`✅ SUCCESS METRICS: ${total_signals} live signals analyzed`);

      return {
        total_signals,
        evaluated_signals: total_signals,
        success_rate_1h: valid_1h > 0 ? (success_1h_count / valid_1h) * 100 : 0,
        success_rate_3h: valid_3h > 0 ? (success_3h_count / valid_3h) * 100 : 0,
        success_rate_eod: valid_eod > 0 ? (success_eod_count / valid_eod) * 100 : 0,
        bullish_success_rate: bullishSignals.length > 0 ? (bullishSuccesses / bullishSignals.length) * 100 : 0,
        bearish_success_rate: bearishSignals.length > 0 ? (bearishSuccesses / bearishSignals.length) * 100 : 0
      };
    } catch (error) {
      console.error('❌ SIGNAL SUCCESS METRICS ERROR:', error);
      return {
        total_signals: 0,
        evaluated_signals: 0,
        success_rate_1h: 0,
        success_rate_3h: 0,
        success_rate_eod: 0,
        bullish_success_rate: 0,
        bearish_success_rate: 0
      };
    }
  }

  /**
   * Get performance statistics for enriched signals (live data only)
   */
  static async getEnrichmentStats(): Promise<{
    total_signals: number;
    completed_enrichments: number;
    pending_enrichments: number;
    failed_enrichments: number;
    completion_rate: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('enriched_signals')
        .select('price_metadata_status')
        .or('is_simulated.is.null,is_simulated.eq.false'); // Exclude simulated data

      if (error) {
        console.error('❌ ERROR fetching enrichment stats:', error);
        return {
          total_signals: 0,
          completed_enrichments: 0,
          pending_enrichments: 0,
          failed_enrichments: 0,
          completion_rate: 0
        };
      }

      const total_signals = data.length;
      const completed_enrichments = data.filter(s => s.price_metadata_status === 'complete').length;
      const pending_enrichments = data.filter(s => 
        s.price_metadata_status === 'pending' || s.price_metadata_status === 'tracking'
      ).length;
      const failed_enrichments = data.filter(s => s.price_metadata_status === 'failed').length;
      const completion_rate = total_signals > 0 ? (completed_enrichments / total_signals) * 100 : 0;

      console.log(`✅ ENRICHMENT STATS: ${total_signals} live signals tracked`);

      return {
        total_signals,
        completed_enrichments,
        pending_enrichments,
        failed_enrichments,
        completion_rate
      };
    } catch (error) {
      console.error('❌ ENRICHMENT STATS ERROR:', error);
      return {
        total_signals: 0,
        completed_enrichments: 0,
        pending_enrichments: 0,
        failed_enrichments: 0,
        completion_rate: 0
      };
    }
  }
}
