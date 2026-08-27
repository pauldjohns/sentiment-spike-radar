
import { supabase } from '@/integrations/supabase/client';
import { INDUSTRY_FOCUS_TICKERS } from '@/data/industry_tickers';

interface BaselineData {
  avgMessageCount: number;
  stdDevMessageCount: number;
  avgBullishRatio: number;
  stdDevBullishRatio: number;
}

export class RealAnomalyScoringService {
  private static baselineCache = new Map<string, { data: BaselineData; timestamp: number }>();
  private static readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  private static validateIndustryScope(ticker: string): boolean {
    const isValid = INDUSTRY_FOCUS_TICKERS.includes(ticker.toUpperCase() as any);
    
    if (!isValid) {
      console.warn(`🚨 SCOPE VIOLATION: ${ticker} not in industry focus list - analysis blocked`);
    }
    
    return isValid;
  }

  static async calculateVolumeZScore(ticker: string, currentVolume: number, timeWindow: number = 60): Promise<number> {
    if (!this.validateIndustryScope(ticker)) {
      return 0;
    }

    try {
      const baseline = await this.getBaselineData(ticker);
      
      if (!baseline || baseline.stdDevMessageCount === 0) {
        console.warn(`No baseline data available for ${ticker}, using fallback calculation`);
        // Fallback: Use industry average baseline
        return this.calculateFallbackZScore(currentVolume);
      }

      const zScore = (currentVolume - baseline.avgMessageCount) / baseline.stdDevMessageCount;
      
      console.log(`📊 Volume Z-Score for ${ticker}: ${zScore.toFixed(2)} (current: ${currentVolume}, avg: ${baseline.avgMessageCount.toFixed(1)}, std: ${baseline.stdDevMessageCount.toFixed(1)})`);
      
      return zScore;

    } catch (error) {
      console.error(`Error calculating volume Z-score for ${ticker}:`, error);
      return this.calculateFallbackZScore(currentVolume);
    }
  }

  static async calculateSentimentShift(ticker: string, currentBullishPercent: number): Promise<number> {
    if (!this.validateIndustryScope(ticker)) {
      return 0;
    }

    try {
      const baseline = await this.getBaselineData(ticker);
      
      if (!baseline) {
        console.warn(`No baseline sentiment data for ${ticker}, using industry average`);
        const industryAverage = 45; // Industry baseline
        return currentBullishPercent - industryAverage;
      }

      const historicalBullishPercent = baseline.avgBullishRatio * 100;
      const shift = currentBullishPercent - historicalBullishPercent;
      
      console.log(`📈 Sentiment Shift for ${ticker}: ${shift.toFixed(1)}% (current: ${currentBullishPercent.toFixed(1)}%, historical: ${historicalBullishPercent.toFixed(1)}%)`);
      
      return shift;

    } catch (error) {
      console.error(`Error calculating sentiment shift for ${ticker}:`, error);
      return currentBullishPercent - 45; // Fallback to industry average
    }
  }

  private static async getBaselineData(ticker: string): Promise<BaselineData | null> {
    // Check cache first
    const cacheKey = ticker.toUpperCase();
    const cached = this.baselineCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      console.log(`🔍 Fetching baseline data for ${ticker} from database...`);
      
      const { data, error } = await supabase.rpc('get_sentiment_baseline', {
        p_ticker: ticker.toUpperCase(),
        p_days: 7
      });

      if (error) {
        console.error('Error fetching baseline data:', error);
        return null;
      }

      if (!data || data.length === 0) {
        console.warn(`No historical data found for ${ticker}`);
        return null;
      }

      const baseline = data[0];
      
      // Validate the data
      if (!baseline.avg_message_count || !baseline.std_dev_message_count) {
        console.warn(`Insufficient baseline data for ${ticker}`);
        return null;
      }

      // Fix: Convert the database values to numbers properly
      const baselineData: BaselineData = {
        avgMessageCount: Number(baseline.avg_message_count) || 0,
        stdDevMessageCount: Number(baseline.std_dev_message_count) || 1,
        avgBullishRatio: Number(baseline.avg_bullish_ratio) || 0.45,
        stdDevBullishRatio: Number(baseline.std_dev_bullish_ratio) || 0.1
      };

      // Cache the result
      this.baselineCache.set(cacheKey, {
        data: baselineData,
        timestamp: Date.now()
      });

      console.log(`✅ Loaded baseline for ${ticker}:`, baselineData);
      return baselineData;

    } catch (error) {
      console.error(`Error in getBaselineData for ${ticker}:`, error);
      return null;
    }
  }

  private static calculateFallbackZScore(currentVolume: number): number {
    // Industry-wide fallback calculation based on typical message volumes
    const industryAverageVolume = 25; // messages per hour
    const industryStdDev = 15;
    
    return (currentVolume - industryAverageVolume) / industryStdDev;
  }

  static getTimeOfDayWeight(): number {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = easternTime.getHours();
    const minute = easternTime.getMinutes();
    const timeInMinutes = hour * 60 + minute;

    const preMarket = 4 * 60; // 4:00 AM
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const morningHigh = 11 * 60; // 11:00 AM
    const afternoonHigh = 14 * 60 + 30; // 2:30 PM
    const afternoonEnd = 15 * 60 + 30; // 3:30 PM
    const marketClose = 16 * 60; // 4:00 PM

    if (timeInMinutes >= preMarket && timeInMinutes < marketOpen) {
      return 2.5; // Very high weight for pre-market sentiment
    } else if (timeInMinutes >= marketOpen && timeInMinutes <= marketOpen + 60) {
      return 2.0; // High weight for opening sentiment
    } else if (timeInMinutes >= marketOpen && timeInMinutes <= morningHigh) {
      return 1.5; // Elevated weight
    } else if (timeInMinutes >= afternoonHigh && timeInMinutes <= afternoonEnd) {
      return 1.5; // Elevated weight
    } else if (timeInMinutes >= marketClose - 15) {
      return 0.3; // Very low weight near close
    }
    
    return 1.0; // Normal weight
  }

  static async calculateConfidenceBand(
    ticker: string,
    volumeZScore: number,
    sentimentShift: number,
    timeWeight: number,
    pumpRisk: number
  ): Promise<'high' | 'medium' | 'low'> {
    if (!this.validateIndustryScope(ticker)) {
      return 'low';
    }

    let confidenceScore = 0;

    // Volume confidence based on Z-score magnitude
    if (Math.abs(volumeZScore) > 2.0) confidenceScore += 4;
    else if (Math.abs(volumeZScore) > 1.5) confidenceScore += 3;
    else if (Math.abs(volumeZScore) > 1.0) confidenceScore += 2;
    else confidenceScore += 1;

    // Sentiment shift confidence
    if (Math.abs(sentimentShift) > 25) confidenceScore += 4;
    else if (Math.abs(sentimentShift) > 15) confidenceScore += 3;
    else if (Math.abs(sentimentShift) > 10) confidenceScore += 2;
    else confidenceScore += 1;

    // Time weighting bonus
    if (timeWeight > 2.0) confidenceScore += 2;
    else if (timeWeight > 1.5) confidenceScore += 1;

    // Pump risk penalty
    if (pumpRisk > 70) confidenceScore *= 0.5;
    else if (pumpRisk > 50) confidenceScore *= 0.7;
    else if (pumpRisk > 30) confidenceScore *= 0.9;

    // Historical volatility check (if we have baseline data)
    try {
      const baseline = await this.getBaselineData(ticker);
      if (baseline && baseline.stdDevBullishRatio > 0.2) {
        // High historical volatility reduces confidence
        confidenceScore *= 0.8;
      }
    } catch (error) {
      console.error('Error checking historical volatility:', error);
    }

    console.log(`🎯 Confidence calculation for ${ticker}: score=${confidenceScore.toFixed(1)}, volume_z=${volumeZScore.toFixed(1)}, sentiment_shift=${sentimentShift.toFixed(1)}, time_weight=${timeWeight.toFixed(1)}, pump_risk=${pumpRisk.toFixed(1)}`);

    if (confidenceScore >= 7) return 'high';
    if (confidenceScore >= 4) return 'medium';
    return 'low';
  }

  static clearCache(): void {
    this.baselineCache.clear();
    console.log('🧹 Cleared anomaly scoring cache');
  }

  static async warmUpCache(tickers: string[]): Promise<void> {
    console.log(`🔥 Warming up baseline cache for ${tickers.length} tickers...`);
    
    const promises = tickers
      .filter(ticker => this.validateIndustryScope(ticker))
      .map(ticker => this.getBaselineData(ticker).catch(error => {
        console.error(`Failed to warm up cache for ${ticker}:`, error);
        return null;
      }));
    
    await Promise.allSettled(promises);
    console.log(`✅ Cache warm-up complete. Cached ${this.baselineCache.size} ticker baselines.`);
  }
}
