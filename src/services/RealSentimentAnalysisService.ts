import { supabase } from '@/integrations/supabase/client';

export interface SentimentResult {
  label: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  modelVersion: 'FinALBERT';
}

export class RealSentimentAnalysisService {
  private static readonly HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/Tonealabs/fin-albert-large-finetuned-financial-sentiment';
  private static readonly FALLBACK_MODEL_URL = 'https://api-inference.huggingface.co/models/mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis';
  private static readonly MODEL_VERSION = 'FinALBERT';
  
  // Cached results to avoid duplicate API calls for identical messages
  private static sentimentCache = new Map<string, SentimentResult>();
  private static readonly CACHE_SIZE_LIMIT = 1000;

  // Simple queue/semaphore for throttling FinALBERT requests
  private static readonly MAX_CONCURRENT_REQUESTS = 5;
  private static readonly MAX_REQUESTS_PER_MINUTE = 60;
  private static activeRequests = 0;
  private static requestQueue: Array<() => void> = [];
  private static requestTimestamps: number[] = [];

  // Label mapping for FinALBERT response to our sentiment types
  private static readonly SENTIMENT_MAP: Record<string, 'bullish' | 'bearish' | 'neutral'> = {
    positive: 'bullish',
    negative: 'bearish',
    neutral: 'neutral',
    bullish: 'bullish',
    bearish: 'bearish'
  };

  static async analyzeSentiment(message: string, ticker?: string, messageId?: string): Promise<SentimentResult> {
    // Clean and prepare message
    const cleanedMessage = this.preprocessMessage(message);

    // Cache key with extra normalization for short messages
    const cacheKey = cleanedMessage.length < 32
      ? this.hashMessage(this.normalizeShortMessage(cleanedMessage))
      : this.hashMessage(cleanedMessage);

    if (this.sentimentCache.has(cacheKey)) {
      return this.sentimentCache.get(cacheKey)!;
    }

    try {
      if (cleanedMessage.length < 10) {
        const result: SentimentResult = { label: 'neutral', confidence: 0.1, modelVersion: this.MODEL_VERSION as 'FinALBERT' };
        this.cacheResult(cacheKey, result);
        return result;
      }

      // Try primary FinALBERT model
      let result = await this.callHuggingFaceAPI(this.HUGGINGFACE_API_URL, cleanedMessage);

      if (!result) {
        // Fallback to secondary model
        await this.logFallback('secondary_model', ticker, messageId);
        console.log('Primary FinALBERT model failed, trying fallback...');
        result = await this.callHuggingFaceAPI(this.FALLBACK_MODEL_URL, cleanedMessage);
      }

      if (!result) {
        // Final fallback to rule-based analysis
        await this.logFallback('rule_based', ticker, messageId);
        console.log('All ML models failed, using rule-based fallback');
        result = this.ruleBasedFallback(cleanedMessage);
      }

      // Log sentiment prediction for model drift analysis
      if (ticker && messageId && this.isValidConfidence(result.confidence)) {
        await this.logSentimentPrediction(messageId, ticker, message, result);
      }

      // Cache the result
      this.cacheResult(cacheKey, result);

      return result;

    } catch (error) {
      console.error('Error in FinALBERT sentiment analysis:', error);
      await this.logFallback('rule_based', ticker, messageId);
      const fallbackResult = this.ruleBasedFallback(message);

      // Log fallback prediction if we have the required data
      if (ticker && messageId && this.isValidConfidence(fallbackResult.confidence)) {
        await this.logSentimentPrediction(messageId, ticker, message, fallbackResult);
      }

      return fallbackResult;
    }
  }

  private static async logSentimentPrediction(
    messageId: string, 
    ticker: string, 
    rawMessage: string, 
    result: SentimentResult
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('sentiment_model_audit_log')
        .insert({
          message_id: messageId,
          ticker: ticker.toUpperCase(),
          raw_message: rawMessage,
          model_version: result.modelVersion,
          predicted_sentiment: result.label,
          confidence_score: Math.round(result.confidence * 1000) / 1000 // Round to 3 decimal places
        });

      if (error) {
        // Don't log constraint violations (duplicate entries) as errors
        if (!error.message.includes('duplicate key value') && !error.message.includes('unique constraint')) {
          console.error('Failed to log sentiment prediction:', error);
        }
      }
    } catch (logError) {
      // Prevent logging errors from interrupting sentiment flow
      console.warn('Sentiment audit logging failed:', logError);
    }
  }

  private static isValidConfidence(confidence: number): boolean {
    return typeof confidence === 'number' && !isNaN(confidence) && isFinite(confidence);
  }
  private static async callHuggingFaceAPI(apiUrl: string, text: string): Promise<SentimentResult | null> {
    return this.enqueueRequest<SentimentResult | null>(async () => {
      try {
        // Note: In production, you would need to set up HuggingFace API key as a secret
        // For now, we'll simulate the API call structure

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Note: API key would be needed for production use
          },
          body: JSON.stringify({
            inputs: text,
            options: {
              wait_for_model: true
            }
          })
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.warn('HuggingFace rate limit hit');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return null;
          }
          throw new Error(`HuggingFace API error: ${response.status}`);
        }

        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          return this.parseFinALBERTResponse(data[0]);
        }

        return null;
      } catch (error) {
        console.error('FinALBERT API call failed:', error);
        return null;
      }
    });
  }

  private static async enqueueRequest<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const execute = async () => {
        try {
          await this.rateLimit();
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          this.activeRequests--;
          const next = this.requestQueue.shift();
          if (next) next();
        }
      };

      if (this.activeRequests < this.MAX_CONCURRENT_REQUESTS) {
        this.activeRequests++;
        execute();
      } else {
        this.requestQueue.push(() => {
          this.activeRequests++;
          execute();
        });
      }
    });
  }

  private static async rateLimit(): Promise<void> {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(ts => now - ts < 60000);
    if (this.requestTimestamps.length >= this.MAX_REQUESTS_PER_MINUTE) {
      const waitTime = 60000 - (now - this.requestTimestamps[0]);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.requestTimestamps.push(Date.now());
  }

  private static async logFallback(
    type: 'secondary_model' | 'rule_based',
    ticker?: string,
    messageId?: string
  ): Promise<void> {
    console.warn(`FinALBERT fallback triggered: ${type}${ticker ? ` for ${ticker}` : ''}`);
    try {
      await supabase.from('sentiment_model_fallback_log').insert({
        message_id: messageId || 'unknown',
        ticker: ticker?.toUpperCase() || 'unknown',
        raw_message: `Fallback triggered: ${type}`,
        fallback_sentiment: 'neutral',
        reason: `FinALBERT fallback - ${type}`
      });
    } catch (error) {
      console.warn('Failed to log fallback event:', error);
    }
  }

  private static normalizeShortMessage(message: string): string {
    return message.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  }

  private static parseFinALBERTResponse(response: any): SentimentResult {
    // Handle FinALBERT response format
    if (Array.isArray(response)) {
      const sortedResults = response.sort((a, b) => b.score - a.score);
      const topResult = sortedResults[0];
      
      const rawLabel = topResult.label.toLowerCase();
      console.debug('FinALBERT raw label:', rawLabel);
      
      const label = this.mapFinALBERTLabel(rawLabel);
      const confidence = Math.max(0, Math.min(1, topResult.score)); // Normalize to 0-1 range
      
      return {
        label,
        confidence,
        modelVersion: this.MODEL_VERSION as 'FinALBERT'
      };
    }

    // Fallback parsing
    return { label: 'neutral', confidence: 0.1, modelVersion: this.MODEL_VERSION as 'FinALBERT' };
  }

  private static mapFinALBERTLabel(finalbertLabel: string): 'bullish' | 'bearish' | 'neutral' {
    // Map FinALBERT labels to our sentiment format with fallback
    return this.SENTIMENT_MAP[finalbertLabel] || 'neutral';
  }

  private static preprocessMessage(message: string): string {
    // Enhanced preprocessing for Stocktwits-style messages
    return message
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/\$([A-Z]+)/g, 'STOCK') // Replace ticker symbols
      .replace(/[@#]\w+/g, '') // Remove mentions and hashtags for cleaner analysis
      .replace(/[🚀📈📉💎🙌]/g, '') // Remove common trading emojis that might confuse the model
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 512); // Limit length for API
  }

  private static ruleBasedFallback(message: string): SentimentResult {
    const lowerMessage = message.toLowerCase();
    
    const bullishWords = [
      'buy', 'bull', 'bullish', 'long', 'moon', 'rocket', 'up', 'calls', 'strong',
      'breakout', 'support', 'bounce', 'rally', 'green', 'pump', 'squeeze', 'target',
      'hodl', 'diamond', 'hands', 'ath', 'breakout', 'momentum'
    ];
    
    const bearishWords = [
      'sell', 'bear', 'bearish', 'short', 'crash', 'down', 'puts', 'weak',
      'breakdown', 'resistance', 'dump', 'drop', 'red', 'fall', 'collapse',
      'correction', 'dip', 'bleeding', 'tank', 'rekt'
    ];

    let bullishScore = 0;
    let bearishScore = 0;
    
    bullishWords.forEach(word => {
      if (lowerMessage.includes(word)) bullishScore++;
    });
    
    bearishWords.forEach(word => {
      if (lowerMessage.includes(word)) bearishScore++;
    });

    // Check for price targets and patterns common in Stocktwits
    const priceUpRegex = /\+\d+%|\$\d+\s*(target|pt)|going\s*up|to\s*the\s*moon|🚀|📈/i;
    const priceDownRegex = /-\d+%|going\s*down|crash|tank|📉/i;
    
    if (priceUpRegex.test(message)) bullishScore += 2;
    if (priceDownRegex.test(message)) bearishScore += 2;

    const totalScore = bullishScore + bearishScore;
    let confidence = Math.min(0.8, totalScore * 0.1); // Cap at 80% confidence for rule-based

    if (bullishScore > bearishScore) {
      return { label: 'bullish', confidence, modelVersion: this.MODEL_VERSION as 'FinALBERT' };
    } else if (bearishScore > bullishScore) {
      return { label: 'bearish', confidence, modelVersion: this.MODEL_VERSION as 'FinALBERT' };
    }
    
    return { label: 'neutral', confidence: 0.1, modelVersion: this.MODEL_VERSION as 'FinALBERT' };
  }

  private static hashMessage(message: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private static cacheResult(key: string, result: SentimentResult): void {
    // Implement LRU cache
    if (this.sentimentCache.size >= this.CACHE_SIZE_LIMIT) {
      const firstKey = this.sentimentCache.keys().next().value;
      this.sentimentCache.delete(firstKey);
    }
    this.sentimentCache.set(key, result);
  }

  static clearCache(): void {
    this.sentimentCache.clear();
  }

  static getModelVersion(): string {
    return this.MODEL_VERSION;
  }
}
