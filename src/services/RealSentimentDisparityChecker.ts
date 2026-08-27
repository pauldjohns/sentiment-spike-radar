
import { supabase } from '@/integrations/supabase/client';
import { INDUSTRY_FOCUS_TICKERS } from '@/data/industry_tickers';

interface StockTwitsMessage {
  id: string;
  ticker: string;
  body: string;
  timestamp: Date;
  userId?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
}

interface DisparityAnalysis {
  pumpRiskScore: number;
  userDiversity: number;
  concentrationRisk: boolean;
  polarityShiftDetected: boolean;
  disparityConfidence: 'high' | 'medium' | 'low';
}

export class RealSentimentDisparityChecker {
  private static disparityCache = new Map<string, { analysis: DisparityAnalysis; timestamp: number }>();
  private static readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  private static validateIndustryScope(ticker: string): boolean {
    const isValid = INDUSTRY_FOCUS_TICKERS.includes(ticker.toUpperCase() as any);
    
    if (!isValid) {
      console.warn(`🚨 SCOPE VIOLATION: ${ticker} not in industry focus list - analysis blocked`);
    }
    
    return isValid;
  }

  static async analyzeDisparity(ticker: string, messages: StockTwitsMessage[]): Promise<DisparityAnalysis> {
    if (!this.validateIndustryScope(ticker)) {
      return {
        pumpRiskScore: 0,
        userDiversity: 0,
        concentrationRisk: false,
        polarityShiftDetected: false,
        disparityConfidence: 'low'
      };
    }

    // Check cache first
    const cacheKey = `${ticker}-${messages.length}-${messages[0]?.timestamp.getTime() || 0}`;
    const cached = this.disparityCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.analysis;
    }

    try {
      console.log(`🔍 Analyzing sentiment disparity for ${ticker} with ${messages.length} messages...`);

      const analysis = await this.performDisparityAnalysis(ticker, messages);
      
      // Cache the result
      this.disparityCache.set(cacheKey, {
        analysis,
        timestamp: Date.now()
      });

      return analysis;

    } catch (error) {
      console.error(`Error analyzing disparity for ${ticker}:`, error);
      return {
        pumpRiskScore: 0,
        userDiversity: messages.length > 0 ? new Set(messages.map(m => m.userId || 'anon')).size : 0,
        concentrationRisk: false,
        polarityShiftDetected: false,
        disparityConfidence: 'low'
      };
    }
  }

  private static async performDisparityAnalysis(ticker: string, messages: StockTwitsMessage[]): Promise<DisparityAnalysis> {
    if (messages.length === 0) {
      return {
        pumpRiskScore: 0,
        userDiversity: 0,
        concentrationRisk: false,
        polarityShiftDetected: false,
        disparityConfidence: 'low'
      };
    }

    // Calculate user diversity and concentration
    const uniqueUsers = new Set(messages.map(m => m.userId || `anon-${m.id}`));
    const userDiversity = uniqueUsers.size;
    const userConcentration = userDiversity / messages.length;

    // Analyze sentiment distribution
    const bullishMessages = messages.filter(m => m.sentiment === 'bullish');
    const bearishMessages = messages.filter(m => m.sentiment === 'bearish');
    const neutralMessages = messages.filter(m => m.sentiment === 'neutral');

    const bullishPercent = (bullishMessages.length / messages.length) * 100;
    const bearishPercent = (bearishMessages.length / messages.length) * 100;

    // Check for user message concentration (pump indicators)
    const userMessageCounts = new Map<string, number>();
    messages.forEach(msg => {
      const userId = msg.userId || `anon-${msg.id}`;
      userMessageCounts.set(userId, (userMessageCounts.get(userId) || 0) + 1);
    });

    const maxMessagesPerUser = Math.max(...userMessageCounts.values());
    const concentrationRisk = maxMessagesPerUser > messages.length * 0.3; // One user > 30% of messages

    // Calculate pump risk score
    let pumpRiskScore = 0;

    // Factor 1: User concentration
    if (userConcentration < 0.3) pumpRiskScore += 30;
    else if (userConcentration < 0.5) pumpRiskScore += 20;
    else if (userConcentration < 0.7) pumpRiskScore += 10;

    // Factor 2: Extreme bullish sentiment
    if (bullishPercent > 85) pumpRiskScore += 40;
    else if (bullishPercent > 75) pumpRiskScore += 25;
    else if (bullishPercent > 65) pumpRiskScore += 15;

    // Factor 3: Low user diversity with high message volume
    if (messages.length > 50 && userDiversity < 10) pumpRiskScore += 20;
    else if (messages.length > 30 && userDiversity < 5) pumpRiskScore += 30;

    // Factor 4: Single user dominance
    if (concentrationRisk) pumpRiskScore += 25;

    // Check for polarity shift by comparing with historical data
    const polarityShiftDetected = await this.detectPolarityShift(ticker, bullishPercent);

    // Calculate confidence based on data quality
    let disparityConfidence: 'high' | 'medium' | 'low' = 'low';
    
    if (messages.length >= 20 && userDiversity >= 5) {
      disparityConfidence = 'high';
    } else if (messages.length >= 10 && userDiversity >= 3) {
      disparityConfidence = 'medium';
    }

    const analysis: DisparityAnalysis = {
      pumpRiskScore: Math.min(100, pumpRiskScore),
      userDiversity,
      concentrationRisk,
      polarityShiftDetected,
      disparityConfidence
    };

    console.log(`📊 Disparity analysis for ${ticker}:`, {
      messages: messages.length,
      users: userDiversity,
      bullish: bullishPercent.toFixed(1) + '%',
      pumpRisk: analysis.pumpRiskScore,
      concentration: concentrationRisk,
      polarityShift: polarityShiftDetected,
      confidence: disparityConfidence
    });

    return analysis;
  }

  private static async detectPolarityShift(ticker: string, currentBullishPercent: number): Promise<boolean> {
    try {
      // Get historical sentiment data from the last 7 days
      const { data, error } = await supabase
        .from('message_volume_history')
        .select('bullish_ratio')
        .eq('ticker', ticker.toUpperCase())
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(7);

      if (error || !data || data.length < 3) {
        console.warn(`Insufficient historical data for polarity shift detection on ${ticker}`);
        return false;
      }

      // Calculate average historical bullish percentage
      const avgHistoricalBullish = data.reduce((sum, record) => sum + (record.bullish_ratio * 100), 0) / data.length;
      
      // Detect significant positive shift
      const shiftThreshold = 25; // 25 percentage point increase
      const significantShift = currentBullishPercent - avgHistoricalBullish > shiftThreshold;

      // Also check if historical sentiment was predominantly bearish/neutral
      const wasNeutralOrBearish = avgHistoricalBullish < 55;

      const polarityShift = significantShift && wasNeutralOrBearish;

      if (polarityShift) {
        console.log(`🔄 Polarity shift detected for ${ticker}: ${avgHistoricalBullish.toFixed(1)}% → ${currentBullishPercent.toFixed(1)}%`);
      }

      return polarityShift;

    } catch (error) {
      console.error(`Error detecting polarity shift for ${ticker}:`, error);
      return false;
    }
  }

  static async calculateMoveIntProbability(
    ticker: string,
    volumeZScore: number,
    sentimentShift: number,
    timeWeight: number,
    pumpRisk: number,
    userDiversity: number,
    bullishPercent: number
  ): Promise<number> {
    if (!this.validateIndustryScope(ticker)) {
      return 0;
    }

    try {
      let score = 0;

      // Volume component (0-35 points) - enhanced weighting
      if (Math.abs(volumeZScore) > 3.0) score += 35;
      else if (Math.abs(volumeZScore) > 2.5) score += 30;
      else if (Math.abs(volumeZScore) > 2.0) score += 25;
      else if (Math.abs(volumeZScore) > 1.5) score += 15;
      else if (Math.abs(volumeZScore) > 1.0) score += 10;
      else score += 2;

      // Sentiment shift component (0-30 points)
      if (Math.abs(sentimentShift) > 30) score += 30;
      else if (Math.abs(sentimentShift) > 25) score += 25;
      else if (Math.abs(sentimentShift) > 20) score += 20;
      else if (Math.abs(sentimentShift) > 15) score += 15;
      else if (Math.abs(sentimentShift) > 10) score += 10;
      else score += 2;

      // Bullish consensus component (0-20 points)
      if (bullishPercent > 80) score += 20;
      else if (bullishPercent > 70) score += 16;
      else if (bullishPercent > 60) score += 12;
      else if (bullishPercent > 50) score += 8;
      else score += 0;

      // Time of day multiplier
      score *= timeWeight;

      // User diversity bonus/penalty (0-15 points bonus, up to -20 points penalty)
      if (userDiversity >= 15) score += 15;
      else if (userDiversity >= 10) score += 10;
      else if (userDiversity >= 5) score += 5;
      else if (userDiversity < 3) score -= 20; // Heavy penalty for very low diversity

      // Pump risk penalty (more severe)
      if (pumpRisk > 80) score *= 0.4; // Severe penalty
      else if (pumpRisk > 60) score *= 0.6;
      else if (pumpRisk > 40) score *= 0.8;
      else if (pumpRisk > 20) score *= 0.9;

      // Historical volatility adjustment
      const historicalVolatility = await this.getHistoricalVolatility(ticker);
      if (historicalVolatility > 0.3) {
        score *= 1.2; // Boost for historically volatile stocks
      }

      const finalScore = Math.min(100, Math.max(0, score));

      console.log(`💯 Move probability for ${ticker}: ${finalScore.toFixed(1)}% (volume_z=${volumeZScore.toFixed(1)}, sentiment_shift=${sentimentShift.toFixed(1)}, bullish=${bullishPercent.toFixed(1)}%, users=${userDiversity}, pump_risk=${pumpRisk.toFixed(1)}, time_weight=${timeWeight.toFixed(1)})`);

      return finalScore;

    } catch (error) {
      console.error(`Error calculating move probability for ${ticker}:`, error);
      return 0;
    }
  }

  private static async getHistoricalVolatility(ticker: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('message_volume_history')
        .select('bullish_ratio')
        .eq('ticker', ticker.toUpperCase())
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error || !data || data.length < 5) {
        return 0.1; // Default low volatility
      }

      // Calculate standard deviation of bullish ratios
      const ratios = data.map(d => d.bullish_ratio);
      const mean = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
      const variance = ratios.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratios.length;
      const stdDev = Math.sqrt(variance);

      return Math.min(1.0, stdDev); // Cap at 1.0

    } catch (error) {
      console.error(`Error calculating historical volatility for ${ticker}:`, error);
      return 0.1;
    }
  }

  static clearCache(): void {
    this.disparityCache.clear();
    console.log('🧹 Cleared sentiment disparity cache');
  }
}
