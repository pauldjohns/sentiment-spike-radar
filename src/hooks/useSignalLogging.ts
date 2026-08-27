
import { supabase } from '@/integrations/supabase/client';
import { AlertConfig } from '@/types/sentiment';
import { INDUSTRY_FOCUS_TICKERS } from '@/data/industry_tickers';

export const useSignalLogging = () => {
  const validateIndustryScope = (ticker: string): boolean => {
    const isValid = INDUSTRY_FOCUS_TICKERS.includes(ticker.toUpperCase() as any);
    
    if (!isValid) {
      console.warn(`🚨 SCOPE VIOLATION: ${ticker} not in industry focus list - filtering out`);
    }
    
    return isValid;
  };

  const setupRealtimeSubscriptions = (
    alertConfig: AlertConfig, 
    refreshData: () => void,
    toastHandler: { toast: (title: string, description: string) => void }
  ) => {
    console.log('🔄 Setting up INDUSTRY-SCOPED real-time subscriptions...');

    // Subscribe to ticker sentiment updates
    const tickerChannel = supabase
      .channel('industry-ticker-sentiment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticker_sentiment'
        },
        (payload) => {
          console.log('📊 Ticker sentiment update:', payload);
          if (payload.new && typeof payload.new === 'object' && 'ticker' in payload.new && 
              typeof payload.new.ticker === 'string') {
            if (validateIndustryScope(payload.new.ticker)) {
              refreshData();
            } else {
              console.warn(`🚨 IGNORED: Non-industry ticker update ${payload.new.ticker}`);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to new alerts
    const alertsChannel = supabase
      .channel('industry-alerts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sentiment_alerts'
        },
        (payload) => {
          console.log('🚨 New alert:', payload);
          
          if (payload.new && typeof payload.new === 'object' && 'ticker' in payload.new && 
              typeof payload.new.ticker === 'string') {
            if (validateIndustryScope(payload.new.ticker)) {
              if (alertConfig.enableNotifications) {
                const newAlert = payload.new as any;
                
                // Use the safe toast handler
                toastHandler.toast(
                  `🎯 ${newAlert.ticker} INDUSTRY Signal Alert`,
                  newAlert.message
                );

                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification(`${newAlert.ticker} Industry Alert`, {
                    body: newAlert.message,
                    icon: '/favicon.ico'
                  });
                }
              }
              refreshData();
            } else {
              console.warn(`🚨 IGNORED: Non-industry alert for ${payload.new.ticker}`);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to signal logs
    const signalLogsChannel = supabase
      .channel('industry-signal-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signal_logs'
        },
        (payload) => {
          console.log('📡 New signal generated:', payload);
          if (payload.new && typeof payload.new === 'object' && 'ticker' in payload.new && 
              typeof payload.new.ticker === 'string') {
            if (validateIndustryScope(payload.new.ticker)) {
              refreshData();
            } else {
              console.warn(`🚨 IGNORED: Non-industry signal for ${payload.new.ticker}`);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to active ticker queue
    const activeTickersChannel = supabase
      .channel('industry-active-tickers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_ticker_queue'
        },
        (payload) => {
          console.log('🎯 Active ticker queue update:', payload);
          if (payload.new && typeof payload.new === 'object' && 'ticker' in payload.new && 
              typeof payload.new.ticker === 'string') {
            if (validateIndustryScope(payload.new.ticker)) {
              refreshData();
            } else {
              console.warn(`🚨 IGNORED: Non-industry active ticker ${payload.new.ticker}`);
            }
          }
        }
      )
      .subscribe();

    // Return cleanup function
    return () => {
      console.log('🔄 Cleaning up industry-scoped subscriptions...');
      supabase.removeChannel(tickerChannel);
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(signalLogsChannel);
      supabase.removeChannel(activeTickersChannel);
    };
  };

  return { setupRealtimeSubscriptions };
};
