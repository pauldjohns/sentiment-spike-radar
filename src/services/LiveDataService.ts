
import { supabase } from '@/integrations/supabase/client';
import { EnrichedSignal } from './SignalEnrichmentService';

export class LiveDataService {
  /**
   * Get only live (non-simulated) enriched signals
   */
  static async getLiveEnrichedSignals(filters?: {
    ticker?: string;
    status?: string;
    evaluation_status?: string;
    limit?: number;
  }): Promise<EnrichedSignal[]> {
    try {
      let query = supabase
        .from('enriched_signals')
        .select('*')
        .or('is_simulated.is.null,is_simulated.eq.false')
        .neq('source', 'replay')
        .order('signal_detected_at', { ascending: false });

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
        console.error('❌ ERROR fetching live enriched signals:', error);
        return [];
      }

      console.log(`✅ LIVE DATA: Retrieved ${data?.length || 0} live-only signals`);
      return data || [];
    } catch (error) {
      console.error('❌ LIVE DATA SERVICE ERROR:', error);
      return [];
    }
  }

  /**
   * Get enrichment stats for live data only
   */
  static async getLiveEnrichmentStats(): Promise<{
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
        .or('is_simulated.is.null,is_simulated.eq.false')
        .neq('source', 'replay');

      if (error) {
        console.error('❌ ERROR fetching live enrichment stats:', error);
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
      // Fixed: Use proper comparison for division by zero check
      const completion_rate = total_signals > 0 ? (completed_enrichments / total_signals) * 100 : 0;

      console.log(`✅ LIVE STATS: ${total_signals} total, ${completed_enrichments} completed`);
      
      return {
        total_signals,
        completed_enrichments,
        pending_enrichments,
        failed_enrichments,
        completion_rate
      };
    } catch (error) {
      console.error('❌ LIVE ENRICHMENT STATS ERROR:', error);
      return {
        total_signals: 0,
        completed_enrichments: 0,
        pending_enrichments: 0,
        failed_enrichments: 0,
        completion_rate: 0
      };
    }
  }

  /**
   * Filter signals by data source type
   */
  static filterSignalsBySource(
    signals: EnrichedSignal[], 
    filterType: 'all' | 'live-only' | 'simulated-only'
  ): EnrichedSignal[] {
    switch (filterType) {
      case 'live-only':
        return signals.filter(s => !s.is_simulated && s.source !== 'replay');
      case 'simulated-only':
        return signals.filter(s => s.is_simulated || s.source === 'replay');
      case 'all':
      default:
        return signals;
    }
  }
}
