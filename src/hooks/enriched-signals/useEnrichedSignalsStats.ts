
import { useState, useEffect, useCallback } from 'react';
import { SignalEnrichmentClient } from '@/services/SignalEnrichmentService';

export interface EnrichmentStats {
  total_signals: number;
  completed_enrichments: number;
  pending_enrichments: number;
  failed_enrichments: number;
  completion_rate: number;
}

export const useEnrichedSignalsStats = () => {
  const [stats, setStats] = useState<EnrichmentStats | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const enrichmentStats = await SignalEnrichmentClient.getEnrichmentStats();
      setStats(enrichmentStats);
      console.log('✅ HOOK: Fetched live enrichment stats');
    } catch (err) {
      console.error('Error fetching enrichment stats:', err);
    }
  }, []);

  // Auto-refresh stats periodically
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [fetchStats]);

  return {
    stats,
    fetchStats
  };
};
