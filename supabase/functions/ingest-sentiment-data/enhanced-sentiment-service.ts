import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface SentimentAnalysisResult {
  ticker: string;
  anomalyDetected: boolean;
  anomalyScore: number;
  confidence: string;
  entryReason: string;
  signalType: string;
  volumeAnomalyScore: number;
  sentimentShift: number;
  messageVolume: number;
  bullishPercentage: number;
  messageConcentration: number;
  userDiversity: number;
  disparityDetected: boolean;
}

interface FinALBERTResponse {
  label: string;
  score: number;
}

export class EnhancedSentimentService {
  private static supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  private static supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  private static huggingFaceKey = Deno.env.get('HUGGINGFACE_API_KEY')!;
  private static supabaseClient = createClient(this.supabaseUrl, this.supabaseKey);
  private static readonly HUGGINGFACE_MODEL_URL = 'https://api-inference.huggingface.co/models/ProsusAI/finbert';

  // Exponential backoff retry helper
  private static async withBackoffRetry<T>(
    fn: () => Promise<T>, 
    maxRetries: number = 5,
    operation: string = 'operation'
  ): Promise<T> {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await fn();
      } catch (err) {
        if (attempt === maxRetries - 1) {
          console.error(`❌ ${operation} failed after ${maxRetries} attempts:`, err);
          throw err;
        }
        const backoff = Math.pow(2, attempt) * 100 + Math.random() * 100;
        console.warn(`⚠️ ${operation} attempt ${attempt + 1} failed, retrying in ${Math.round(backoff)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        attempt++;
      }
    }
    throw new Error(`Max retries exceeded for ${operation}`);
  }

  // Real FinALBERT sentiment analysis
  private static async analyzeWithFinALBERT(text: string): Promise<{ label: 'bullish' | 'bearish' | 'neutral'; confidence: number }> {
    if (!this.huggingFaceKey) {
      console.warn('⚠️ HUGGINGFACE_API_KEY not set, falling back to rule-based analysis');
      return this.ruleBasedFallback(text);
    }

    try {
      const response = await this.withBackoffRetry(async () => {
        const res = await fetch(this.HUGGINGFACE_MODEL_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.huggingFaceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            inputs: text.substring(0, 512) // Limit input length
          }),
        });

        if (!res.ok) {
          if (res.status === 429) {
            throw new Error('Rate limit exceeded');
          } else if (res.status === 503) {
            throw new Error('Model loading');
          }
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res;
      }, 5, `FinALBERT API call for text: ${text.substring(0, 50)}...`);

      const result = await response.json() as FinALBERTResponse[][];
      
      if (!Array.isArray(result) || result.length === 0 || !Array.isArray(result[0]) || result[0].length === 0) {
        console.warn('⚠️ Invalid FinALBERT response format, using fallback');
        return this.ruleBasedFallback(text);
      }

      // Get the highest confidence prediction
      const predictions = result[0].sort((a, b) => b.score - a.score);
      const topPrediction = predictions[0];

      // Map FinBERT labels to our sentiment format
      const labelMap: Record<string, 'bullish' | 'bearish' | 'neutral'> = {
        'positive': 'bullish',
        'negative': 'bearish',
        'neutral': 'neutral',
        'POSITIVE': 'bullish',
        'NEGATIVE': 'bearish',
        'NEUTRAL': 'neutral'
      };

      const mappedLabel = labelMap[topPrediction.label] || 'neutral';
      
      console.log(`🧠 FinALBERT analysis: "${text.substring(0, 30)}..." -> ${mappedLabel} (${(topPrediction.score * 100).toFixed(1)}%)`);

      return {
        label: mappedLabel,
        confidence: Math.max(0.1, Math.min(0.95, topPrediction.score)) // Normalize confidence
      };

    } catch (error) {
      console.error('❌ FinALBERT analysis failed:', error);
      return this.ruleBasedFallback(text);
    }
  }

  // Rule-based fallback for when FinALBERT is unavailable
  private static ruleBasedFallback(text: string): { label: 'bullish' | 'bearish' | 'neutral'; confidence: number } {
    const lowerText = text.toLowerCase();
    
    const bullishWords = [
      'buy', 'bull', 'bullish', 'long', 'moon', 'rocket', 'up', 'calls', 'strong',
      'breakout', 'support', 'bounce', 'rally', 'green', 'pump', 'squeeze', 'target',
      'hodl', 'diamond', 'hands', 'ath', 'momentum'
    ];
    
    const bearishWords = [
      'sell', 'bear', 'bearish', 'short', 'crash', 'down', 'puts', 'weak',
      'breakdown', 'resistance', 'dump', 'drop', 'red', 'fall', 'collapse',
      'correction', 'dip', 'bleeding', 'tank', 'rekt'
    ];

    let bullishScore = 0;
    let bearishScore = 0;
    
    bullishWords.forEach(word => {
      if (lowerText.includes(word)) bullishScore++;
    });
    
    bearishWords.forEach(word => {
      if (lowerText.includes(word)) bearishScore++;
    });

    const totalScore = bullishScore + bearishScore;
    let confidence = Math.min(0.7, totalScore * 0.15); // Cap fallback confidence

    if (bullishScore > bearishScore) {
      return { label: 'bullish', confidence: Math.max(0.1, confidence) };
    } else if (bearishScore > bullishScore) {
      return { label: 'bearish', confidence: Math.max(0.1, confidence) };
    }
    
    return { label: 'neutral', confidence: 0.1 };
  }

  static async analyzeTicker(ticker: string, windowMinutes: number = 15, isPreMarket: boolean = false): Promise<SentimentAnalysisResult> {
    try {
      console.log(`🧠 Starting enhanced sentiment analysis for ${ticker} (${windowMinutes}min window)...`);
      
      // Get recent messages for this ticker
      const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
      
      const { data: messages, error } = await this.supabaseClient
        .from('stocktwits_messages_live')
        .select('*')
        .eq('ticker', ticker)
        .gte('created_at_stocktwits', windowStart)
        .order('created_at_stocktwits', { ascending: false });

      if (error) {
        console.error(`❌ Error fetching messages for ${ticker}:`, error);
        return this.createEmptyResult(ticker);
      }

      if (!messages || messages.length === 0) {
        console.log(`⚠️ No recent messages found for ${ticker} in last ${windowMinutes} minutes`);
        return this.createEmptyResult(ticker);
      }

      console.log(`📊 Processing ${messages.length} messages for ${ticker} with FinALBERT...`);

      // Process each message with FinALBERT sentiment analysis
      let processedCount = 0;
      let sentimentCounts = { bullish: 0, bearish: 0, neutral: 0 };
      
      for (const message of messages) {
        // Defensive check for message validity
        if (!message || !message.message_id || !message.ticker || !message.body) {
          console.warn(`⚠️ Skipping invalid message record for ${ticker}:`, message);
          continue;
        }

        try {
          const { message_id, ticker: msgTicker, body: raw_message } = message;
          
          // Use FinALBERT for sentiment analysis
          const sentimentResult = await this.analyzeWithFinALBERT(raw_message);
          
          // Store sentiment analysis result with retry logic
          await this.withBackoffRetry(async () => {
            const { error: auditError } = await this.supabaseClient
              .from('sentiment_model_audit_log')
              .upsert({
                message_id: message_id,
                ticker: msgTicker,
                raw_message: raw_message,
                predicted_sentiment: sentimentResult.label,
                confidence_score: Math.round(sentimentResult.confidence * 1000) / 1000, // 3 decimal places
                model_version: 'FinALBERT'
              }, { 
                onConflict: 'message_id,model_version',
                ignoreDuplicates: true 
              });

            if (auditError && !auditError.message.includes('duplicate key')) {
              throw auditError;
            }
          }, 3, `Sentiment storage for ${ticker} message ${message_id}`);

          // Update sentiment counts
          sentimentCounts[sentimentResult.label]++;
          processedCount++;

          console.log(`✅ FinALBERT processed ${ticker} message ${message_id}: ${sentimentResult.label} (${(sentimentResult.confidence * 100).toFixed(1)}%)`);
          
        } catch (messageError) {
          console.error(`❌ Error processing individual message for ${ticker}:`, messageError);
          continue;
        }
      }

      console.log(`📊 ${ticker} FinALBERT analysis complete: ${processedCount}/${messages.length} messages processed`);
      console.log(`📊 ${ticker} sentiment breakdown:`, sentimentCounts);

      // Calculate metrics and anomaly detection
      const totalMessages = processedCount;
      const bullishPercentage = totalMessages > 0 ? (sentimentCounts.bullish / totalMessages) * 100 : 0;
      const messageVolume = totalMessages;
      
      // Enhanced anomaly detection logic
      const volumeThreshold = 10;
      const sentimentThreshold = 70;
      
      const volumeAnomaly = messageVolume >= volumeThreshold;
      const sentimentAnomaly = bullishPercentage >= sentimentThreshold || bullishPercentage <= (100 - sentimentThreshold);
      
      const anomalyDetected = volumeAnomaly || sentimentAnomaly;
      const anomalyScore = this.calculateAnomalyScore(messageVolume, bullishPercentage, volumeThreshold, sentimentThreshold);
      
      const result: SentimentAnalysisResult = {
        ticker,
        anomalyDetected,
        anomalyScore,
        confidence: anomalyScore > 7 ? 'high' : anomalyScore > 4 ? 'medium' : 'low',
        entryReason: this.generateEntryReason(volumeAnomaly, sentimentAnomaly, messageVolume, bullishPercentage),
        signalType: volumeAnomaly && sentimentAnomaly ? 'combined_signal' : volumeAnomaly ? 'volume_spike' : 'sentiment_shift',
        volumeAnomalyScore: volumeAnomaly ? Math.min(messageVolume / volumeThreshold, 10) : 0,
        sentimentShift: Math.abs(bullishPercentage - 50),
        messageVolume,
        bullishPercentage,
        messageConcentration: this.calculateMessageConcentration(messages),
        userDiversity: this.calculateUserDiversity(messages),
        disparityDetected: Math.abs(bullishPercentage - 50) > 30
      };

      if (anomalyDetected) {
        console.log(`🚨 ANOMALY DETECTED for ${ticker}: Score ${anomalyScore.toFixed(1)} - ${result.entryReason}`);
      }

      return result;

    } catch (error) {
      console.error(`❌ Error in enhanced sentiment analysis for ${ticker}:`, error);
      return this.createEmptyResult(ticker);
    }
  }

  private static createEmptyResult(ticker: string): SentimentAnalysisResult {
    return {
      ticker,
      anomalyDetected: false,
      anomalyScore: 0,
      confidence: 'low',
      entryReason: 'No data available for analysis',
      signalType: 'no_signal',
      volumeAnomalyScore: 0,
      sentimentShift: 0,
      messageVolume: 0,
      bullishPercentage: 50,
      messageConcentration: 0,
      userDiversity: 0,
      disparityDetected: false
    };
  }

  private static calculateAnomalyScore(volume: number, sentiment: number, volumeThreshold: number, sentimentThreshold: number): number {
    let score = 0;
    
    if (volume >= volumeThreshold) {
      score += Math.min(volume / volumeThreshold, 5);
    }
    
    const sentimentDeviation = Math.abs(sentiment - 50);
    if (sentimentDeviation >= (sentimentThreshold - 50)) {
      score += Math.min(sentimentDeviation / 10, 5);
    }
    
    return Math.min(score, 10);
  }

  private static generateEntryReason(volumeAnomaly: boolean, sentimentAnomaly: boolean, volume: number, sentiment: number): string {
    const reasons = [];
    
    if (volumeAnomaly) {
      reasons.push(`High message volume (${volume} messages)`);
    }
    
    if (sentimentAnomaly) {
      const direction = sentiment > 50 ? 'bullish' : 'bearish';
      reasons.push(`Strong ${direction} sentiment (${sentiment.toFixed(1)}%)`);
    }
    
    return reasons.length > 0 ? reasons.join(' + ') : 'Standard activity detected';
  }

  private static calculateMessageConcentration(messages: any[]): number {
    if (!messages || messages.length === 0) return 0;
    const timeSpanMinutes = 15;
    return (messages.length / timeSpanMinutes);
  }

  private static calculateUserDiversity(messages: any[]): number {
    if (!messages || messages.length === 0) return 0;
    
    const uniqueUsers = new Set();
    messages.forEach(msg => {
      if (msg && msg.user_id_stocktwits) {
        uniqueUsers.add(msg.user_id_stocktwits);
      }
    });
    
    return uniqueUsers.size;
  }
}
