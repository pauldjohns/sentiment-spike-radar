import { useState, useEffect, useCallback } from 'react';
import { SentimentData, Alert, WatchlistStock, AlertConfig } from '@/types/sentiment';
import { RealSentimentAnalysisService } from '@/services/RealSentimentAnalysisService';
import { RealStockTwitsService } from '@/services/RealStockTwitsService';
import { RealAnomalyScoringService } from '@/services/RealAnomalyScoringService';
import { RealSentimentDisparityChecker } from '@/services/RealSentimentDisparityChecker';
import { useToast } from '@/hooks/use-toast';

export const useSentimentAnalysis = (
  watchlist: WatchlistStock[],
  alertConfig: AlertConfig,
  isMarketOpen: boolean
) => {
  const [sentimentData, setSentimentData] = useState<Record<string, SentimentData>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const safelyProcessMessages = useCallback(async (ticker: string, messages: any[]) => {
    try {
      if (!Array.isArray(messages) || messages.length === 0) {
        console.warn(`⚠️ No valid messages for ${ticker}`);
        return null;
      }

      // Safely map messages with defensive timestamp handling
      const analyzedMessages = await Promise.all(
        messages.map(async (message) => {
          try {
            if (!message || typeof message !== 'object') {
              console.warn(`⚠️ Invalid message object for ${ticker}:`, message);
              return null;
            }

            // Get message ID for audit logging
            const messageId = message.id || message.message_id || `${ticker}-${Date.now()}-${Math.random()}`;
            
            const sentimentResult = await RealSentimentAnalysisService.analyzeSentiment(
              message.body || message.message || '',
              ticker, // Pass ticker for audit logging
              messageId // Pass message ID for audit logging
            );
            
            // Defensive timestamp handling - ensure we always have a valid timestamp
            let timestamp: Date;
            if (message.created_at) {
              timestamp = new Date(message.created_at);
            } else if (message.created_at_stocktwits) {
              timestamp = new Date(message.created_at_stocktwits);
            } else if (message.timestamp) {
              timestamp = new Date(message.timestamp);
            } else {
              timestamp = new Date(); // Fallback to current time
            }

            // Validate timestamp
            if (isNaN(timestamp.getTime())) {
              console.warn(`⚠️ Invalid timestamp for message in ${ticker}, using current time`);
              timestamp = new Date();
            }

            return {
              ...message,
              timestamp, // Ensure timestamp field exists
              sentiment: sentimentResult?.label || 'neutral',
              confidence: Math.max(0, Math.min(1, sentimentResult?.confidence || 0))
            };
          } catch (msgError) {
            console.error(`❌ Error processing individual message for ${ticker}:`, msgError);
            return null;
          }
        })
      );

      // Filter out null results from failed message processing
      return analyzedMessages.filter(msg => msg !== null);
    } catch (error) {
      console.error(`❌ Error in safelyProcessMessages for ${ticker}:`, error);
      return null;
    }
  }, []);

  const analyzeMessages = useCallback(async () => {
    if (!isMarketOpen) return;
    
    setIsAnalyzing(true);
    
    try {
      const enabledTickers = Array.isArray(watchlist) 
        ? watchlist.filter(stock => stock?.enabled && stock?.ticker).map(stock => stock.ticker)
        : [];
      
      if (enabledTickers.length === 0) {
        console.warn('⚠️ No enabled tickers found in watchlist');
        setIsAnalyzing(false);
        return;
      }

      console.log(`🔬 Starting REAL sentiment analysis with FinALBERT for ${enabledTickers.length} tickers...`);
      
      for (const ticker of enabledTickers) {
        try {
          console.log(`📡 Analyzing real data for ${ticker} using FinALBERT...`);
          
          // Get real messages from StockTwits API with error handling
          let messages;
          try {
            messages = await RealStockTwitsService.fetchMessages(ticker, 30);
          } catch (fetchError) {
            console.error(`❌ Failed to fetch messages for ${ticker}:`, fetchError);
            continue; // Skip this ticker
          }
          
          if (!Array.isArray(messages) || messages.length === 0) {
            console.warn(`⚠️ No real messages found for ${ticker}`);
            continue;
          }

          console.log(`✅ Retrieved ${messages.length} real messages for ${ticker}, analyzing with FinALBERT...`);
          
          // Safely process messages with error boundaries
          const analyzedMessages = await safelyProcessMessages(ticker, messages);
          
          if (!analyzedMessages || analyzedMessages.length === 0) {
            console.warn(`⚠️ No analyzable messages for ${ticker} after FinALBERT processing`);
            continue;
          }
          
          // Calculate real sentiment metrics with safe defaults
          const bullish = analyzedMessages.filter(m => m.sentiment === 'bullish').length;
          const bearish = analyzedMessages.filter(m => m.sentiment === 'bearish').length;
          const neutral = analyzedMessages.filter(m => m.sentiment === 'neutral').length;
          const totalValidMessages = bullish + bearish + neutral;
          
          if (totalValidMessages === 0) {
            console.warn(`⚠️ No valid FinALBERT sentiment classifications for ${ticker}`);
            continue;
          }
          
          const bullishPercent = (bullish / totalValidMessages) * 100;
          
          // Real anomaly scoring with error handling
          let volumeZScore = 0;
          let sentimentShift = 0;
          let timeOfDayWeight = 1;
          let disparityAnalysis = { 
            pumpRiskScore: 0, 
            userDiversity: 0, 
            disparityConfidence: 'low', 
            polarityShiftDetected: false 
          };
          let confidenceBand: 'high' | 'medium' | 'low' = 'medium';

          try {
            volumeZScore = await RealAnomalyScoringService.calculateVolumeZScore(ticker, totalValidMessages);
            sentimentShift = await RealAnomalyScoringService.calculateSentimentShift(ticker, bullishPercent);
            timeOfDayWeight = RealAnomalyScoringService.getTimeOfDayWeight();
            
            // Real disparity analysis with error handling
            try {
              disparityAnalysis = await RealSentimentDisparityChecker.analyzeDisparity(ticker, analyzedMessages);
            } catch (disparityError) {
              console.error(`❌ Disparity analysis failed for ${ticker}:`, disparityError);
            }
            
            // Calculate confidence band with error handling
            try {
              confidenceBand = await RealAnomalyScoringService.calculateConfidenceBand(
                ticker, volumeZScore, sentimentShift, timeOfDayWeight, disparityAnalysis.pumpRiskScore
              );
            } catch (confidenceError) {
              console.error(`❌ Confidence calculation failed for ${ticker}:`, confidenceError);
            }
          } catch (scoringError) {
            console.error(`❌ Anomaly scoring failed for ${ticker}:`, scoringError);
          }
          
          // Calculate volume multiplier with safe math
          const volumeMultiplier = Math.max(1, Math.abs(volumeZScore || 0) + 1);
          
          // Update daily message volume in database with error handling
          try {
            await RealStockTwitsService.updateMessageVolume(ticker, totalValidMessages, { bullish, bearish, neutral });
          } catch (updateError) {
            console.error(`❌ Failed to update message volume for ${ticker}:`, updateError);
          }
          
          // Detect real alerts based on actual data
          const tickerAlerts: string[] = [];
          const newAlerts: Alert[] = [];
          
          // Safe alert generation with proper validation
          try {
            // 1. Real volume spike alert
            if (Math.abs(volumeZScore) >= (alertConfig.volumeZScoreThreshold || 2)) {
              const alertMessage = `📈 REAL Volume Spike: ${volumeZScore.toFixed(1)} Z-score (${volumeMultiplier.toFixed(1)}x historical average)`;
              tickerAlerts.push(alertMessage);
              newAlerts.push({
                id: `${ticker}-volume-${Date.now()}`,
                ticker,
                type: 'volume_spike',
                message: alertMessage,
                timestamp: new Date(),
                active: true,
                confidence: confidenceBand,
                zScore: volumeZScore
              });
            }
            
            // 2. Real sentiment shift alert
            if (Math.abs(sentimentShift) >= (alertConfig.sentimentShiftThreshold || 25) && 
                bullishPercent >= (alertConfig.sentimentThreshold || 65)) {
              const direction = sentimentShift > 0 ? 'Bullish' : 'Bearish';
              const alertMessage = `📊 REAL ${direction} Shift: ${Math.abs(sentimentShift).toFixed(1)}% vs historical baseline (now ${bullishPercent.toFixed(1)}%)`;
              tickerAlerts.push(alertMessage);
              newAlerts.push({
                id: `${ticker}-shift-${Date.now()}`,
                ticker,
                type: 'sentiment_spike',
                message: alertMessage,
                timestamp: new Date(),
                active: true,
                confidence: confidenceBand
              });
            }
            
            // 3. Real pump risk alert
            if (disparityAnalysis.pumpRiskScore >= (alertConfig.pumpRiskThreshold || 60)) {
              const alertMessage = `⚠️ REAL Pump Risk: ${disparityAnalysis.pumpRiskScore.toFixed(0)}% risk (${disparityAnalysis.userDiversity} unique users, confidence: ${disparityAnalysis.disparityConfidence})`;
              tickerAlerts.push(alertMessage);
              newAlerts.push({
                id: `${ticker}-pump-${Date.now()}`,
                ticker,
                type: 'anomaly',
                message: alertMessage,
                timestamp: new Date(),
                active: true,
                confidence: 'high'
              });
            }
            
            // 4. Real polarity shift detection
            if (disparityAnalysis.polarityShiftDetected && alertConfig.enablePolarityDetection) {
              const alertMessage = `🔄 REAL Polarity Shift: Historical bearish/neutral → current bullish trend detected`;
              tickerAlerts.push(alertMessage);
              newAlerts.push({
                id: `${ticker}-polarity-${Date.now()}`,
                ticker,
                type: 'sentiment_spike',
                message: alertMessage,
                timestamp: new Date(),
                active: true,
                confidence: confidenceBand
              });
            }
          } catch (alertError) {
            console.error(`❌ Alert generation failed for ${ticker}:`, alertError);
          }
          
          // Update sentiment data with FinALBERT results (defensive updates)
          setSentimentData(prev => {
            try {
              return {
                ...prev,
                [ticker]: {
                  ticker,
                  bullish: bullish || 0,
                  bearish: bearish || 0,
                  neutral: neutral || 0,
                  totalMessages: totalValidMessages || 0,
                  volumeMultiplier: volumeMultiplier || 1,
                  lastUpdate: new Date(),
                  lastChecked: new Date(),
                  alerts: tickerAlerts || [],
                  volumeZScore: volumeZScore || 0,
                  sentimentShift: sentimentShift || 0,
                  pumpRiskScore: disparityAnalysis.pumpRiskScore || 0,
                  timeOfDayWeight: timeOfDayWeight || 1,
                  polarityShiftDetected: disparityAnalysis.polarityShiftDetected || false,
                  userDiversity: disparityAnalysis.userDiversity || 0,
                  confidenceBand: confidenceBand || 'medium',
                  modelVersion: 'FinALBERT' // Track which model was used
                }
              };
            } catch (stateError) {
              console.error(`❌ Failed to update state for ${ticker}:`, stateError);
              return prev; // Return previous state if update fails
            }
          });
          
          // Add new alerts safely
          if (newAlerts.length > 0) {
            try {
              setAlerts(prev => {
                const filteredPrev = Array.isArray(prev) ? prev.filter(a => a.ticker !== ticker || !a.active) : [];
                return [...filteredPrev, ...newAlerts];
              });
              
              // Show real-time notifications for high-confidence alerts
              const highConfidenceAlerts = newAlerts.filter(alert => alert.confidence === 'high');
              if (highConfidenceAlerts.length > 0 && alertConfig.enableNotifications) {
                const alert = highConfidenceAlerts[0];
                
                try {
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(`${ticker} REAL-TIME Alert`, {
                      body: `${alert.message} (${alert.confidence} confidence)`,
                      icon: '/favicon.ico'
                    });
                  }
                  
                  toast({
                    title: `${ticker} REAL-TIME Signal`,
                    description: `${alert.message} (${alert.confidence} confidence, ${timeOfDayWeight}x time weight)`,
                    duration: 8000,
                  });
                } catch (notificationError) {
                  console.error(`❌ Notification failed for ${ticker}:`, notificationError);
                }
              }
            } catch (alertError) {
              console.error(`❌ Failed to set alerts for ${ticker}:`, alertError);
            }
          }

          console.log(`✅ Completed FinALBERT analysis for ${ticker}: ${bullish}B/${bearish}B/${neutral}N, Volume Z-Score: ${volumeZScore.toFixed(2)}, Sentiment Shift: ${sentimentShift.toFixed(1)}%, Pump Risk: ${disparityAnalysis.pumpRiskScore.toFixed(0)}%`);
        } catch (tickerError) {
          console.error(`❌ Failed to process ticker ${ticker} with FinALBERT:`, tickerError);
          // Continue to next ticker instead of breaking the entire loop
        }
      }
    } catch (error) {
      console.error('❌ Error in FinALBERT real-time sentiment analysis:', error);
      toast({
        title: "FinALBERT Analysis Error",
        description: "Failed to fetch real-time data. Check network connection.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [watchlist, alertConfig, isMarketOpen, toast, safelyProcessMessages]);

  useEffect(() => {
    if (!isMarketOpen) return;
    
    console.log('🚀 Initializing REAL-TIME sentiment analysis with FinALBERT...');
    
    // Initial analysis with error boundary
    try {
      analyzeMessages();
    } catch (initError) {
      console.error('❌ Failed to initialize sentiment analysis:', initError);
      setIsAnalyzing(false);
    }
    
    // Set up periodic analysis (every 3 minutes for real API rate limiting)
    const interval = setInterval(() => {
      try {
        analyzeMessages();
      } catch (intervalError) {
        console.error('❌ Interval analysis failed:', intervalError);
      }
    }, 180000);
    
    return () => clearInterval(interval);
  }, [analyzeMessages, isMarketOpen]);

  // Clean up old alerts with error handling
  useEffect(() => {
    const cleanup = setInterval(() => {
      try {
        setAlerts(prev => {
          if (!Array.isArray(prev)) return [];
          return prev.filter(alert => {
            try {
              const age = Date.now() - (alert.timestamp ? new Date(alert.timestamp).getTime() : 0);
              return age < 15 * 60 * 1000; // Keep alerts for 15 minutes
            } catch (filterError) {
              console.error('❌ Error filtering alert:', filterError);
              return false; // Remove problematic alerts
            }
          });
        });
      } catch (cleanupError) {
        console.error('❌ Alert cleanup failed:', cleanupError);
      }
    }, 60000);
    
    return () => clearInterval(cleanup);
  }, []);

  return {
    sentimentData: sentimentData || {},
    alerts: Array.isArray(alerts) ? alerts : [],
    isAnalyzing
  };
};
