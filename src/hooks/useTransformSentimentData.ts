
import { SentimentData, Alert } from '@/types/sentiment';
import { INDUSTRY_FOCUS_TICKERS } from '@/data/industry_tickers';

export const useTransformSentimentData = () => {
  const validateIndustryTicker = (ticker: string): boolean => {
    const isValid = INDUSTRY_FOCUS_TICKERS.includes(ticker.toUpperCase() as any);
    if (!isValid) {
      console.warn(`🚨 TRANSFORM SCOPE: Skipping non-industry ticker ${ticker}`);
    }
    return isValid;
  };

  const transformTickerData = (tickerData: any[]): Record<string, SentimentData> => {
    const transformedData: Record<string, SentimentData> = {};
    
    // ✅ ADDITIONAL SAFETY: Filter out any non-industry tickers that might have slipped through
    const industryTickerData = tickerData.filter(ticker => validateIndustryTicker(ticker.ticker));
    
    if (industryTickerData.length !== tickerData.length) {
      console.warn(`🎯 TRANSFORM FILTER: Removed ${tickerData.length - industryTickerData.length} non-industry tickers`);
    }
    
    industryTickerData.forEach(ticker => {
      const confidenceBand = ticker.confidence_band === 'high' || 
                            ticker.confidence_band === 'medium' || 
                            ticker.confidence_band === 'low' 
                            ? ticker.confidence_band 
                            : 'medium';

      transformedData[ticker.ticker] = {
        ticker: ticker.ticker,
        bullish: ticker.bullish_count || 0,
        bearish: ticker.bearish_count || 0,
        neutral: ticker.neutral_count || 0,
        totalMessages: ticker.total_messages || 0,
        volumeMultiplier: ticker.volume_multiplier || 1,
        lastUpdate: new Date(ticker.last_updated),
        lastChecked: ticker.last_checked_at ? new Date(ticker.last_checked_at) : new Date(ticker.last_updated),
        alerts: [],
        volumeZScore: ticker.volume_z_score || 0,
        sentimentShift: ticker.sentiment_shift || 0,
        pumpRiskScore: ticker.pump_risk_score || 0,
        timeOfDayWeight: ticker.time_weight || 2.0,
        polarityShiftDetected: ticker.polarity_shift_detected || false,
        userDiversity: ticker.user_diversity || 0,
        confidenceBand: confidenceBand
      };
    });

    console.log(`✅ TRANSFORM SUCCESS: Processed ${Object.keys(transformedData).length} industry tickers`);
    return transformedData;
  };

  const transformAlerts = (alertsData: any[]): Alert[] => {
    // ✅ ADDITIONAL SAFETY: Filter out any non-industry alerts that might have slipped through
    const industryAlertsData = alertsData.filter(alert => validateIndustryTicker(alert.ticker));
    
    if (industryAlertsData.length !== alertsData.length) {
      console.warn(`🎯 ALERTS FILTER: Removed ${alertsData.length - industryAlertsData.length} non-industry alerts`);
    }
    
    const transformedAlerts = industryAlertsData.map(alert => {
      const confidence = alert.confidence === 'high' || 
                        alert.confidence === 'medium' || 
                        alert.confidence === 'low' 
                        ? alert.confidence 
                        : 'medium';

      return {
        id: alert.id,
        ticker: alert.ticker,
        type: alert.alert_type as Alert['type'],
        message: alert.message,
        timestamp: new Date(alert.created_at),
        active: alert.active,
        confidence: confidence,
        zScore: alert.z_score || undefined
      };
    });

    console.log(`✅ ALERTS TRANSFORM: Processed ${transformedAlerts.length} industry alerts`);
    return transformedAlerts;
  };

  return { transformTickerData, transformAlerts };
};
