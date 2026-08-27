
import { SentimentData, Alert, AlertConfig, VolumeHistory, StockTwitsMessage } from '@/types/sentiment';
import { INDUSTRY_FOCUS_TICKERS } from '@/data/industry_tickers';

export class EnhancedSentimentService {
  private static volumeHistory: Map<string, VolumeHistory> = new Map();

  // ✅ SCOPE VALIDATION: Ensure ticker is in industry scope before processing
  private static validateIndustryScope(ticker: string): boolean {
    const isValid = INDUSTRY_FOCUS_TICKERS.includes(ticker.toUpperCase() as any);
    
    if (!isValid) {
      console.warn(`🚨 SCOPE VIOLATION: ${ticker} not in industry focus list - analysis blocked`);
    }
    
    return isValid;
  }

  static calculateVolumeZScore(ticker: string, currentVolume: number, timeWindow: number = 60): number {
    // ✅ SCOPE CHECK: Only process industry tickers
    if (!this.validateIndustryScope(ticker)) {
      return 0; // Block non-industry tickers
    }

    const history = this.volumeHistory.get(ticker);
    if (!history || history.messageCounts.length < 10) {
      return 0; // Not enough data
    }

    // Get last hour of data for baseline
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - timeWindow * 60 * 1000);
    
    const recentCounts = history.messageCounts.slice(-12); // Last 12 data points (assuming 5-min intervals)
    const mean = recentCounts.reduce((sum, count) => sum + count, 0) / recentCounts.length;
    const variance = recentCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / recentCounts.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? (currentVolume - mean) / stdDev : 0;
  }

  static calculateSentimentShift(ticker: string, currentBullishPercent: number): number {
    // ✅ SCOPE CHECK: Only process industry tickers
    if (!this.validateIndustryScope(ticker)) {
      return 0; // Block non-industry tickers
    }

    const history = this.volumeHistory.get(ticker);
    if (!history || history.sentimentHistory.length < 6) {
      return 0; // Need at least 30 minutes of data (6 * 5-min intervals)
    }

    // Calculate 30-minute trailing average bullish percentage
    const recent30Min = history.sentimentHistory.slice(-6);
    const avgBullishPercent = recent30Min.reduce((sum, sentiment) => {
      const total = sentiment.bullish + sentiment.bearish + sentiment.neutral;
      return sum + (total > 0 ? (sentiment.bullish / total) * 100 : 0);
    }, 0) / recent30Min.length;

    return currentBullishPercent - avgBullishPercent;
  }

  static calculatePumpRiskScore(messages: StockTwitsMessage[]): { score: number; userDiversity: number } {
    if (messages.length === 0) return { score: 0, userDiversity: 0 };

    const bullishMessages = messages.filter(m => m.sentiment === 'bullish');
    if (bullishMessages.length === 0) return { score: 0, userDiversity: 0 };

    // Count unique users
    const uniqueUsers = new Set(bullishMessages.map(m => m.userId || 'anonymous')).size;
    const userDiversity = uniqueUsers / bullishMessages.length;

    // Enhanced pump risk for 10% moves: lower thresholds for legitimate breakouts
    const bullishPercent = (bullishMessages.length / messages.length) * 100;
    const concentrationRisk = uniqueUsers < 3 && bullishPercent > 70 ? 1 : 0; // Lowered from 5 users and 80%
    const diversityRisk = userDiversity < 0.25 ? 1 : 0; // Lowered from 0.3

    return {
      score: (concentrationRisk + diversityRisk) * 40, // Reduced from 50 to allow more legitimate signals
      userDiversity: uniqueUsers
    };
  }

  static getTimeOfDayWeight(): number {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = easternTime.getHours();
    const minute = easternTime.getMinutes();
    const timeInMinutes = hour * 60 + minute;

    // Enhanced pre-market weighting for 10% move prediction
    const preMarket = 4 * 60; // 4:00 AM
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const morningHigh = 11 * 60; // 11:00 AM
    const afternoonHigh = 14 * 60 + 30; // 2:30 PM
    const afternoonEnd = 15 * 60 + 30; // 3:30 PM
    const marketClose = 16 * 60; // 4:00 PM

    // Pre-market activity (4-9:30 AM) gets highest weight for day predictions
    if (timeInMinutes >= preMarket && timeInMinutes < marketOpen) {
      return 2.5; // Very high weight for pre-market sentiment
    }
    // Opening hour gets high weight
    else if (timeInMinutes >= marketOpen && timeInMinutes <= marketOpen + 60) {
      return 2.0; // High weight for opening sentiment
    }
    // Morning session gets elevated weight
    else if (timeInMinutes >= marketOpen && timeInMinutes <= morningHigh) {
      return 1.5; // Elevated weight
    } 
    // Power hour gets elevated weight
    else if (timeInMinutes >= afternoonHigh && timeInMinutes <= afternoonEnd) {
      return 1.5; // Elevated weight
    } 
    // Last 15 minutes get reduced weight
    else if (timeInMinutes >= marketClose - 15) {
      return 0.3; // Very low weight near close
    }
    
    return 1.0; // Normal weight
  }

  static detectPolarityShift(ticker: string, messages: StockTwitsMessage[]): boolean {
    // ✅ SCOPE CHECK: Only process industry tickers
    if (!this.validateIndustryScope(ticker)) {
      return false; // Block non-industry tickers
    }

    const history = this.volumeHistory.get(ticker);
    if (!history || history.sentimentHistory.length < 3) {
      return false;
    }

    // Get recent sentiment history
    const recentHistory = history.sentimentHistory.slice(-3);
    const currentMessages = messages.slice(0, 10); // Reduced from 15 for faster detection

    // Check if previous period was neutral/bearish (lowered threshold for 10% moves)
    const previousNeutralBearish = recentHistory.every(sentiment => {
      const total = sentiment.bullish + sentiment.bearish + sentiment.neutral;
      const bullishPercent = total > 0 ? (sentiment.bullish / total) * 100 : 0;
      return bullishPercent < 45; // Lowered from 40 for earlier detection
    });

    // Check if current period shows bullish shift (lowered threshold)
    const currentBullish = currentMessages.filter(m => m.sentiment === 'bullish').length;
    const currentBullishPercent = currentMessages.length > 0 ? (currentBullish / currentMessages.length) * 100 : 0;

    return previousNeutralBearish && currentBullishPercent > 55; // Lowered from 60 for earlier signals
  }

  static updateVolumeHistory(ticker: string, messageCount: number, sentiment: { bullish: number; bearish: number; neutral: number }) {
    // ✅ SCOPE CHECK: Only track industry tickers
    if (!this.validateIndustryScope(ticker)) {
      console.warn(`🚨 SCOPE VIOLATION: Blocked volume history update for non-industry ticker ${ticker}`);
      return; // Block non-industry tickers
    }

    if (!this.volumeHistory.has(ticker)) {
      this.volumeHistory.set(ticker, {
        ticker,
        timestamps: [],
        messageCounts: [],
        sentimentHistory: []
      });
    }

    const history = this.volumeHistory.get(ticker)!;
    const now = new Date();

    // Keep only last 4 hours of data (48 * 5-minute intervals)
    const maxEntries = 48;
    
    history.timestamps.push(now);
    history.messageCounts.push(messageCount);
    history.sentimentHistory.push(sentiment);

    if (history.timestamps.length > maxEntries) {
      history.timestamps = history.timestamps.slice(-maxEntries);
      history.messageCounts = history.messageCounts.slice(-maxEntries);
      history.sentimentHistory = history.sentimentHistory.slice(-maxEntries);
    }
  }

  static calculateConfidenceBand(
    volumeZScore: number,
    sentimentShift: number,
    timeWeight: number,
    pumpRisk: number
  ): 'high' | 'medium' | 'low' {
    let confidenceScore = 0;

    // Volume confidence (adjusted for 10% moves)
    if (Math.abs(volumeZScore) > 1.5) confidenceScore += 3; // Lowered from 2.0
    else if (Math.abs(volumeZScore) > 1.0) confidenceScore += 2;
    else confidenceScore += 1;

    // Sentiment shift confidence (adjusted for 10% moves)
    if (Math.abs(sentimentShift) > 20) confidenceScore += 3; // Lowered from 30
    else if (Math.abs(sentimentShift) > 10) confidenceScore += 2; // Lowered from 15
    else confidenceScore += 1;

    // Time weighting (enhanced for pre-market)
    confidenceScore *= timeWeight;

    // Pump risk penalty (relaxed for legitimate breakouts)
    if (pumpRisk > 60) confidenceScore *= 0.6; // Less penalty than before
    else if (pumpRisk > 35) confidenceScore *= 0.9; // Less penalty than before

    // Adjusted thresholds for 10% move detection
    if (confidenceScore >= 6) return 'high'; // Lowered from 8
    if (confidenceScore >= 3.5) return 'medium'; // Lowered from 5
    return 'low';
  }

  // New method: Calculate 10% move probability score
  static calculate10PercentMoveProbability(
    volumeZScore: number,
    sentimentShift: number,
    timeWeight: number,
    pumpRisk: number,
    userDiversity: number,
    bullishPercent: number
  ): number {
    let score = 0;

    // Volume component (0-30 points)
    if (Math.abs(volumeZScore) > 2.0) score += 30;
    else if (Math.abs(volumeZScore) > 1.5) score += 25;
    else if (Math.abs(volumeZScore) > 1.0) score += 15;
    else score += 5;

    // Sentiment shift component (0-25 points)
    if (Math.abs(sentimentShift) > 25) score += 25;
    else if (Math.abs(sentimentShift) > 15) score += 20;
    else if (Math.abs(sentimentShift) > 10) score += 15;
    else score += 5;

    // Bullish consensus component (0-20 points)
    if (bullishPercent > 70) score += 20;
    else if (bullishPercent > 60) score += 15;
    else if (bullishPercent > 50) score += 10;
    else score += 0;

    // Time of day multiplier
    score *= timeWeight;

    // User diversity bonus (quality signal)
    if (userDiversity >= 5) score += 10;
    else if (userDiversity >= 3) score += 5;

    // Pump risk penalty
    if (pumpRisk > 50) score *= 0.7;
    else if (pumpRisk > 30) score *= 0.9;

    return Math.min(100, Math.max(0, score));
  }

  // ✅ NEW: Main analysis method with scope enforcement
  static analyzeTicker(ticker: string, timeWindow: number = 15, isPreMarket: boolean = false): Promise<any> {
    // ✅ CRITICAL SCOPE CHECK: Block non-industry tickers immediately
    if (!this.validateIndustryScope(ticker)) {
      console.error(`🚨 CRITICAL SCOPE VIOLATION: Attempted analysis of non-industry ticker ${ticker} - BLOCKING`);
      return Promise.resolve({
        anomalyDetected: false,
        anomalyScore: 0,
        signalType: 'scope_violation',
        confidence: 'low',
        entryReason: `Ticker ${ticker} not in industry focus list - analysis blocked`,
        volumeAnomalyScore: 0,
        sentimentShift: 0,
        messageVolume: 0,
        bullishPercentage: 0,
        messageConcentration: 0,
        userDiversity: 0,
        disparityDetected: false
      });
    }

    // Proceed with normal analysis for industry tickers
    console.log(`📊 Processing INDUSTRY ticker: ${ticker}...`);
    
    // Simulate sentiment analysis with realistic random data
    const messageVolume = Math.floor(Math.random() * 200) + 10;
    const bullishPercentage = Math.random() * 100;
    const bearishPercentage = 100 - bullishPercentage;
    const volumeAnomalyScore = Math.random() * 100;
    const sentimentShift = (Math.random() - 0.5) * 100;
    const userDiversity = Math.floor(Math.random() * 50) + 5;
    const messageConcentration = Math.random();
    
    // Enhanced anomaly detection logic
    let anomalyScore = 0;
    let anomalyDetected = false;
    let disparityDetected = false;
    
    // Volume anomaly (25% weight)
    if (volumeAnomalyScore > 70) {
      anomalyScore += 25;
    } else if (volumeAnomalyScore > 50) {
      anomalyScore += 15;
    }
    
    // Sentiment shift (25% weight)
    if (Math.abs(sentimentShift) > 30) {
      anomalyScore += 25;
    } else if (Math.abs(sentimentShift) > 20) {
      anomalyScore += 15;
    }
    
    // Message concentration (20% weight)
    if (messageConcentration > 0.7) {
      anomalyScore += 20;
    } else if (messageConcentration > 0.5) {
      anomalyScore += 10;
    }
    
    // User diversity (15% weight)
    if (userDiversity < 10) {
      anomalyScore += 15;
    } else if (userDiversity < 20) {
      anomalyScore += 10;
    }
    
    // Sentiment disparity detection (15% weight)
    const internalSentiment = Math.random() * 100;
    const publicSentiment = Math.random() * 100;
    const sentimentDisparity = Math.abs(internalSentiment - publicSentiment);
    
    if (sentimentDisparity > 30) {
      disparityDetected = true;
      anomalyScore += 15;
      console.log(`🚨 Sentiment disparity detected for INDUSTRY ticker ${ticker}: Internal ${internalSentiment.toFixed(1)}% vs Public ${publicSentiment.toFixed(1)}%`);
    }
    
    // Determine if anomaly is significant enough
    if (anomalyScore >= 35) {
      anomalyDetected = true;
      console.log(`⚡ Anomaly detected: INDUSTRY ticker ${ticker} score ${anomalyScore.toFixed(1)}`);
    }
    
    // Determine confidence and signal type
    let confidence = 'low';
    let signalType = 'sentiment_anomaly';
    
    if (anomalyScore >= 70) {
      confidence = 'high';
      signalType = 'high_confidence_anomaly';
    } else if (anomalyScore >= 50) {
      confidence = 'medium';
      signalType = 'medium_confidence_anomaly';
    }
    
    // Adjust for pre-market conditions
    if (isPreMarket) {
      // Pre-market analysis might have different thresholds
      anomalyScore *= 0.9; // Slightly lower scores for pre-market
    }
    
    const entryReason = anomalyDetected 
      ? `Multi-factor anomaly detected: Volume(${volumeAnomalyScore.toFixed(1)}), Sentiment shift(${sentimentShift.toFixed(1)}%), User diversity(${userDiversity}), Disparity(${disparityDetected})`
      : 'No significant anomaly detected';
    
    return Promise.resolve({
      anomalyDetected,
      anomalyScore,
      signalType,
      confidence,
      entryReason,
      volumeAnomalyScore,
      sentimentShift,
      messageVolume,
      bullishPercentage,
      messageConcentration,
      userDiversity,
      disparityDetected
    });
  }
}
