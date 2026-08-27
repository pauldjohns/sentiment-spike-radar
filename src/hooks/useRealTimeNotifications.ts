
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  enablePush: boolean;
  enableEmail: boolean;
  enableWebhook: boolean;
  highConfidenceOnly: boolean;
  batchingEnabled: boolean;
  batchingInterval: number; // minutes
  webhookUrl?: string;
}

interface SignalNotification {
  id: string;
  ticker: string;
  signalType: string;
  confidence: 'high' | 'medium' | 'low';
  anomalyScore: number;
  volumeRatio: number;
  sentimentChange: string;
  messageCount: number;
  userCount: number;
  timestamp: Date;
  rationale: string;
}

export const useRealTimeNotifications = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enablePush: true,
    enableEmail: false,
    enableWebhook: false,
    highConfidenceOnly: true,
    batchingEnabled: true,
    batchingInterval: 30
  });
  const [pendingNotifications, setPendingNotifications] = useState<SignalNotification[]>([]);
  const { toast } = useToast();

  // Request notification permissions
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Set up real-time signal subscription
  useEffect(() => {
    const signalChannel = supabase
      .channel('high-confidence-signals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signal_logs'
        },
        async (payload) => {
          if (payload.new) {
            await handleNewSignal(payload.new as any);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(signalChannel);
    };
  }, [preferences]);

  // Batch notification processing
  useEffect(() => {
    if (!preferences.batchingEnabled) return;

    const interval = setInterval(() => {
      if (pendingNotifications.length > 0) {
        processBatchedNotifications();
      }
    }, preferences.batchingInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [pendingNotifications, preferences]);

  const handleNewSignal = async (signal: any) => {
    try {
      // Filter by confidence if enabled
      if (preferences.highConfidenceOnly && signal.signal_confidence !== 'high') {
        return;
      }

      // Get additional signal details
      const signalDetails = await enrichSignalData(signal);
      
      const notification: SignalNotification = {
        id: signal.id,
        ticker: signal.ticker,
        signalType: signal.signal_type,
        confidence: signal.signal_confidence || 'medium',
        anomalyScore: signal.anomaly_score || 0,
        volumeRatio: calculateVolumeRatio(signal),
        sentimentChange: calculateSentimentChange(signal),
        messageCount: signal.user_diversity_score || 0,
        userCount: signal.user_diversity_score || 0,
        timestamp: new Date(signal.signal_timestamp),
        rationale: generateRationale(signal)
      };

      if (preferences.batchingEnabled) {
        setPendingNotifications(prev => [...prev, notification]);
      } else {
        await sendImmediateNotification(notification);
      }

    } catch (error) {
      console.error('Error handling new signal notification:', error);
    }
  };

  const enrichSignalData = async (signal: any) => {
    // Get recent sentiment data for this ticker
    const { data: sentimentData } = await supabase
      .from('ticker_sentiment')
      .select('*')
      .eq('ticker', signal.ticker)
      .order('last_updated', { ascending: false })
      .limit(1)
      .single();

    return { ...signal, sentimentData };
  };

  const calculateVolumeRatio = (signal: any): number => {
    return signal.volume_anomaly_score ? signal.volume_anomaly_score / 10 : 1.0;
  };

  const calculateSentimentChange = (signal: any): string => {
    const shift = signal.sentiment_shift_percent || 0;
    return shift > 0 ? `+${shift.toFixed(1)}%` : `${shift.toFixed(1)}%`;
  };

  const generateRationale = (signal: any): string => {
    const reasons = [];
    
    if (signal.volume_anomaly_score > 30) {
      reasons.push(`${(signal.volume_anomaly_score / 10).toFixed(1)}x volume spike`);
    }
    
    if (Math.abs(signal.sentiment_shift_percent) > 25) {
      reasons.push(`${Math.abs(signal.sentiment_shift_percent).toFixed(0)}% sentiment shift`);
    }
    
    if (signal.signal_confidence === 'high') {
      reasons.push('multiple signal convergence');
    }

    return reasons.join(', ') || 'anomaly detected';
  };

  const sendImmediateNotification = async (notification: SignalNotification) => {
    // Browser push notification
    if (preferences.enablePush && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`🎯 ${notification.ticker} ${notification.confidence.toUpperCase()} Signal`, {
        body: `${notification.signalType}: ${notification.volumeRatio.toFixed(1)}x volume, ${notification.sentimentChange} sentiment shift`,
        icon: '/favicon.ico',
        tag: notification.ticker,
        requireInteraction: notification.confidence === 'high'
      });
    }

    // Toast notification
    toast({
      title: `🎯 ${notification.ticker} ${notification.confidence.toUpperCase()} Confidence Signal`,
      description: `${notification.rationale} (Score: ${notification.anomalyScore.toFixed(0)})`,
      duration: notification.confidence === 'high' ? 10000 : 6000,
    });

    // Webhook notification
    if (preferences.enableWebhook && preferences.webhookUrl) {
      try {
        await fetch(preferences.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'signal_alert',
            data: notification
          })
        });
      } catch (error) {
        console.error('Webhook notification failed:', error);
      }
    }
  };

  const processBatchedNotifications = async () => {
    if (pendingNotifications.length === 0) return;

    // Sort by confidence and anomaly score
    const sortedSignals = [...pendingNotifications]
      .sort((a, b) => {
        const confidenceWeight = { high: 3, medium: 2, low: 1 };
        const scoreA = (confidenceWeight[a.confidence] * 100) + a.anomalyScore;
        const scoreB = (confidenceWeight[b.confidence] * 100) + b.anomalyScore;
        return scoreB - scoreA;
      });

    const top3Signals = sortedSignals.slice(0, 3);

    // Create batch notification
    const batchMessage = `Top ${top3Signals.length} signals: ${top3Signals.map(s => 
      `${s.ticker} (${s.confidence})`
    ).join(', ')}`;

    toast({
      title: `📊 Signal Batch Summary`,
      description: batchMessage,
      duration: 8000,
    });

    // Browser notification for batch
    if (preferences.enablePush && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('📊 Signal Intelligence Update', {
        body: batchMessage,
        icon: '/favicon.ico'
      });
    }

    // Clear processed notifications
    setPendingNotifications([]);
  };

  const updatePreferences = (newPreferences: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
  };

  return {
    preferences,
    updatePreferences,
    pendingNotifications,
    sendImmediateNotification
  };
};
