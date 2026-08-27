
import { useCallback, useRef, useEffect } from 'react';
import { WatchlistStock, AlertConfig } from '@/types/sentiment';
import { useToast } from '@/hooks/use-toast';
import { useDataFreshness } from '@/contexts/DataFreshnessContext';
import { useCircuitBreaker } from './useCircuitBreaker';
import { useRefreshControl } from './useRefreshControl';
import { useRealtimeSubscriptions } from './useRealtimeSubscriptions';
import { useSentimentDataManager } from './useSentimentDataManager';
import { INDUSTRY_FOCUS_TICKERS } from '@/data/industry_tickers';

const MIN_REFRESH_INTERVAL = 10000; // 10 seconds for manual refresh
const AUTO_REFRESH_INTERVAL = 300000; // 5 minutes for automatic refresh

export const useSupabaseSentiment = (
  watchlist: WatchlistStock[],
  alertConfig: AlertConfig,
  isMarketOpen: boolean
) => {
  const { triggerDataRefresh } = useDataFreshness();
  const { toast } = useToast();
  
  const circuitBreaker = useCircuitBreaker();
  const refreshControl = useRefreshControl({
    minRefreshInterval: MIN_REFRESH_INTERVAL,
    autoRefreshInterval: AUTO_REFRESH_INTERVAL
  });
  const realtimeSubscriptions = useRealtimeSubscriptions();
  const dataManager = useSentimentDataManager();

  const isInitialized = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Extract enabled watchlist tickers
  const watchlistTickers = watchlist
    .filter(item => item.enabled && INDUSTRY_FOCUS_TICKERS.includes(item.ticker as any))
    .map(item => item.ticker);

  const handleToastNotification = useCallback((title: string, description: string) => {
    try {
      toast({ title, description, duration: 8000 });
    } catch (error) {
      console.error('❌ Toast failed:', error);
    }
  }, [toast]);

  const refreshData = useCallback(async (isManual = false) => {
    if (circuitBreaker.isOpen()) {
      console.log('🚫 CIRCUIT BREAKER: API calls blocked due to failures');
      return;
    }

    if (!refreshControl.canRefresh(isManual)) {
      return;
    }

    refreshControl.startRefresh();

    try {
      console.log(`🔄 REFRESH START: ${isManual ? 'Manual' : 'Auto'} refresh for ${watchlistTickers.length} tickers`);
      
      await dataManager.updateData(
        isMarketOpen,
        watchlistTickers,
        () => circuitBreaker.recordSuccess(),
        () => circuitBreaker.recordFailure()
      );
    } finally {
      refreshControl.endRefresh();
    }
  }, [isMarketOpen, watchlistTickers.join(','), circuitBreaker, refreshControl, dataManager]);

  // Initialize subscriptions and intervals
  useEffect(() => {
    if (isInitialized.current) return;
    
    const initialize = async () => {
      try {
        isInitialized.current = true;
        
        if (isMarketOpen && watchlistTickers.length > 0) {
          // Setup real-time subscriptions
          realtimeSubscriptions.setupSubscriptions(
            alertConfig, 
            () => refreshData(false), 
            { toast: handleToastNotification }
          );
          
          // Initial data fetch
          setTimeout(() => refreshData(false), 1000);

          // Setup 5-minute interval
          if (!intervalRef.current) {
            intervalRef.current = setInterval(() => {
              console.log('⏰ AUTO REFRESH: 5-minute interval trigger');
              refreshData(false);
            }, AUTO_REFRESH_INTERVAL);
            console.log('✅ SCHEDULER: 5-minute auto-refresh active');
          }
        }
      } catch (error) {
        console.error('❌ INITIALIZATION FAILED:', error);
        isInitialized.current = false;
      }
    };

    initialize();

    return () => {
      try {
        realtimeSubscriptions.cleanup();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        isInitialized.current = false;
        console.log('🧹 CLEANUP: System reset');
      } catch (error) {
        console.error('❌ CLEANUP FAILED:', error);
      }
    };
  }, [isMarketOpen, watchlistTickers.join(','), alertConfig.enableNotifications, refreshData, realtimeSubscriptions, handleToastNotification]);

  const manualRefresh = useCallback(() => {
    console.log('🔄 MANUAL REFRESH: User-initiated refresh');
    refreshData(true);
  }, [refreshData]);

  // External trigger handler
  useEffect(() => {
    const handleExternalTrigger = () => {
      if (isMarketOpen && watchlistTickers.length > 0 && !refreshControl.isRefreshing()) {
        console.log('🔄 EXTERNAL TRIGGER: Context-driven refresh');
        setTimeout(() => refreshData(false), 2000);
      }
    };

    handleExternalTrigger();
  }, [triggerDataRefresh, refreshData, isMarketOpen, watchlistTickers.join(','), refreshControl]);

  return {
    sentimentData: dataManager.sentimentData || {},
    isAnalyzing: Boolean(dataManager.isAnalyzing),
    refreshData: manualRefresh,
    signalLogs: Array.isArray(dataManager.signalLogs) ? dataManager.signalLogs : [],
    activeTickers: Array.isArray(dataManager.activeTickers) ? dataManager.activeTickers : []
  };
};
