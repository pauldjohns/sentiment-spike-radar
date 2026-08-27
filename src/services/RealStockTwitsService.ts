
import { supabase } from '@/integrations/supabase/client';
import { enforceStockTwitsRateLimit } from './StockTwitsRateLimiter';

export interface StockTwitsMessage {
  id: string;
  message_id: string;
  ticker: string;
  body: string;
  created_at: Date;
  user_id?: string;
  username?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
}

export interface StockTwitsApiResponse {
  messages: Array<{
    id: number;
    body: string;
    created_at: string;
    user: {
      id: number;
      username: string;
    };
    symbols?: Array<{
      symbol: string;
    }>;
  }>;
}

export class RealStockTwitsService {
  private static readonly BASE_URL = 'https://api.stocktwits.com/api/2';
  private static readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests
  private static lastRequestTime = 0;

  private static async rateLimitedFetch(url: string): Promise<Response> {
    const apiKey = (import.meta.env?.VITE_STOCKTWITS_API_TOKEN as string) || 'public';
    let attempt = 0;

    while (true) {
      await enforceStockTwitsRateLimit(apiKey);

      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastRequest));
      }

      this.lastRequestTime = Date.now();

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SentimentAnalyzer/1.0',
          'Accept': 'application/json'
        }
      });

      if (response.status === 429) {
        const backoff = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 1000);
        console.warn(`Rate limit hit, backing off for ${backoff}ms (attempt ${attempt + 1})`);
        attempt++;
        await new Promise(res => setTimeout(res, backoff));
        continue;
      }

      if (!response.ok) {
        throw new Error(`StockTwits API error: ${response.status} ${response.statusText}`);
      }

      return response;
    }
  }

  // This method now primarily serves as a fallback and for UI display
  static async fetchMessages(ticker: string, limit: number = 30): Promise<StockTwitsMessage[]> {
    try {
      console.log(`📡 Fetching messages for ${ticker} (limit: ${limit})...`);
      
      // First check cache from database (primary source)
      const cachedMessages = await this.getCachedMessages(ticker, limit);
      if (cachedMessages.length > 0) {
        console.log(`💾 Using ${cachedMessages.length} cached messages for ${ticker}`);
        return cachedMessages;
      }

      // Fallback to direct API call if no cached data
      console.log(`🔄 No cached data for ${ticker}, fetching from API...`);
      const url = `${this.BASE_URL}/streams/symbol/${ticker}.json?limit=${Math.min(limit, 30)}`;
      const response = await this.rateLimitedFetch(url);
      const data: StockTwitsApiResponse = await response.json();

      // Fixed: Use proper array length check
      if (!data.messages || data.messages.length === 0) {
        console.warn(`No messages found for ${ticker}`);
        return [];
      }

      const messages: StockTwitsMessage[] = data.messages.map(msg => ({
        id: `stocktwits-${msg.id}`,
        message_id: msg.id.toString(),
        ticker: ticker.toUpperCase(),
        body: msg.body,
        created_at: new Date(msg.created_at),
        user_id: msg.user.id.toString(),
        username: msg.user.username
      }));

      // Cache messages in database
      await this.cacheMessages(messages);

      console.log(`✅ Fetched ${messages.length} messages for ${ticker}`);
      return messages;

    } catch (error) {
      console.error(`Error fetching StockTwits messages for ${ticker}:`, error);
      
      // Fallback to cached data if API fails
      const fallbackMessages = await this.getCachedMessages(ticker, limit);
      if (fallbackMessages.length > 0) {
        console.log(`🔄 Using cached fallback: ${fallbackMessages.length} messages for ${ticker}`);
        return fallbackMessages;
      }
      
      return [];
    }
  }

  private static async getCachedMessages(ticker: string, limit: number): Promise<StockTwitsMessage[]> {
    try {
      const { data, error } = await supabase
        .from('stocktwits_messages_live')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .gte('created_at_stocktwits', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()) // Last 4 hours
        .order('created_at_stocktwits', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching cached messages:', error);
        return [];
      }

      return (data || []).map(msg => ({
        id: msg.id,
        message_id: msg.message_id,
        ticker: msg.ticker,
        body: msg.body,
        created_at: new Date(msg.created_at_stocktwits),
        user_id: msg.user_id_stocktwits || undefined,
        username: msg.username || undefined,
        sentiment: msg.sentiment_label as 'bullish' | 'bearish' | 'neutral' || undefined
      }));
    } catch (error) {
      console.error('Error accessing cached messages:', error);
      return [];
    }
  }

  private static async cacheMessages(messages: StockTwitsMessage[]): Promise<void> {
    try {
      const cacheData = messages.map(msg => ({
        message_id: msg.message_id,
        ticker: msg.ticker,
        body: msg.body,
        created_at_stocktwits: msg.created_at.toISOString(),
        user_id_stocktwits: msg.user_id || null,
        username: msg.username || null
      }));

      const { error } = await supabase
        .from('stocktwits_messages_live')
        .upsert(cacheData, { 
          onConflict: 'message_id',
          ignoreDuplicates: true 
        });

      if (error) {
        console.error('Error caching messages:', error);
      } else {
        console.log(`💾 Cached ${cacheData.length} messages`);
      }
    } catch (error) {
      console.error('Error in cacheMessages:', error);
    }
  }

  static async updateMessageVolume(ticker: string, messageCount: number, sentimentBreakdown: {
    bullish: number;
    bearish: number;
    neutral: number;
  }): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const totalMessages = sentimentBreakdown.bullish + sentimentBreakdown.bearish + sentimentBreakdown.neutral;
      
      // Fixed: Use proper comparison for zero check
      if (totalMessages === 0) return;

      const bullishRatio = sentimentBreakdown.bullish / totalMessages;
      const bearishRatio = sentimentBreakdown.bearish / totalMessages;
      const neutralRatio = sentimentBreakdown.neutral / totalMessages;

      const { error } = await supabase.rpc('update_daily_message_volume', {
        p_ticker: ticker,
        p_date: today,
        p_message_count: messageCount,
        p_bullish_ratio: bullishRatio,
        p_bearish_ratio: bearishRatio,
        p_neutral_ratio: neutralRatio
      });

      if (error) {
        console.error('Error updating message volume:', error);
      } else {
        console.log(`📊 Updated daily volume for ${ticker}: ${messageCount} messages`);
      }
    } catch (error) {
      console.error('Error in updateMessageVolume:', error);
    }
  }

  // New method to check recent ingestion status
  static async checkIngestionStatus(): Promise<{
    recentMessages: number;
    latestTimestamp: string | null;
    isHealthy: boolean;
  }> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('stocktwits_messages_live')
        .select('created_at_stocktwits', { count: 'exact' })
        .gte('created_at_stocktwits', oneHourAgo)
        .order('created_at_stocktwits', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking ingestion status:', error);
        return { recentMessages: 0, latestTimestamp: null, isHealthy: false };
      }

      // Fixed: Use proper array length check and optional chaining
      const recentMessages = data?.length || 0;
      const latestTimestamp = data?.[0]?.created_at_stocktwits || null;
      const isHealthy = recentMessages > 0;

      return { recentMessages, latestTimestamp, isHealthy };
    } catch (error) {
      console.error('Error in checkIngestionStatus:', error);
      return { recentMessages: 0, latestTimestamp: null, isHealthy: false };
    }
  }
}
