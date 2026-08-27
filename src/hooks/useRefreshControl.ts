
import { useRef, useCallback } from 'react';

interface RefreshControlConfig {
  minRefreshInterval: number;
  autoRefreshInterval: number;
}

export const useRefreshControl = (config: RefreshControlConfig) => {
  const refreshInProgress = useRef(false);
  const lastRefreshTime = useRef(0);

  const canRefresh = useCallback((isManual = false) => {
    const now = Date.now();
    const minInterval = isManual ? config.minRefreshInterval : config.autoRefreshInterval;
    
    if (refreshInProgress.current) {
      console.log('🚫 REFRESH BLOCKED: Already in progress');
      return false;
    }

    if (now - lastRefreshTime.current < minInterval) {
      const remaining = Math.ceil((minInterval - (now - lastRefreshTime.current)) / 1000);
      console.log(`🚫 RATE LIMITED: Wait ${remaining}s (${isManual ? 'manual' : 'auto'})`);
      return false;
    }

    return true;
  }, [config.minRefreshInterval, config.autoRefreshInterval]);

  const startRefresh = useCallback(() => {
    refreshInProgress.current = true;
    lastRefreshTime.current = Date.now();
  }, []);

  const endRefresh = useCallback(() => {
    refreshInProgress.current = false;
  }, []);

  return {
    canRefresh,
    startRefresh,
    endRefresh,
    isRefreshing: () => refreshInProgress.current
  };
};
