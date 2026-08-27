
import { useRef, useCallback } from 'react';
import { AlertConfig } from '@/types/sentiment';
import { useSignalLogging } from './useSignalLogging';

export const useRealtimeSubscriptions = () => {
  const { setupRealtimeSubscriptions } = useSignalLogging();
  const subscriptionsActive = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const setupSubscriptions = useCallback((
    alertConfig: AlertConfig,
    refreshData: () => void,
    toastHandler: { toast: (title: string, description: string) => void }
  ) => {
    if (subscriptionsActive.current) return;
    
    cleanupRef.current = setupRealtimeSubscriptions(
      alertConfig, 
      refreshData, 
      toastHandler
    );
    subscriptionsActive.current = true;
    console.log('✅ REAL-TIME: Subscriptions established');
  }, [setupRealtimeSubscriptions]);

  const cleanup = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    subscriptionsActive.current = false;
    console.log('🧹 SUBSCRIPTIONS: Cleaned up');
  }, []);

  return {
    setupSubscriptions,
    cleanup,
    isActive: () => subscriptionsActive.current
  };
};
