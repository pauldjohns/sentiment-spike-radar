
import { RateLimitConfigManager } from './RateLimitConfig';

export class RequestExecutor {
  private configManager: RateLimitConfigManager;
  private activeRequests = 0;
  private lastRequestTime = 0;
  private requestHistory: number[] = [];

  constructor(configManager: RateLimitConfigManager) {
    this.configManager = configManager;
  }

  async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    ticker: string,
    retryCount: number
  ): Promise<T> {
    try {
      // Wait for rate limit compliance
      await this.waitForRateLimit();
      
      // Execute the request
      this.activeRequests++;
      this.recordRequest();
      
      const result = await requestFn();
      
      this.activeRequests--;
      console.log(`✅ Successfully fetched data for ${ticker} (attempt ${retryCount + 1})`);
      
      return result;
      
    } catch (error: any) {
      this.activeRequests--;
      
      // Handle rate limiting (429) and other retryable errors
      if (this.configManager.shouldRetry(error, retryCount)) {
        const backoffTime = this.configManager.calculateBackoff(retryCount);
        console.warn(`⚠️ Rate limited for ${ticker}, retrying in ${backoffTime}ms (attempt ${retryCount + 1}/${this.configManager.getConfig().maxRetries})`);
        
        await this.sleep(backoffTime);
        return this.executeWithRetry(requestFn, ticker, retryCount + 1);
      }
      
      // Log the error and rethrow
      console.error(`❌ Failed to fetch ${ticker} after ${retryCount + 1} attempts:`, error.message);
      throw error;
    }
  }

  private async waitForRateLimit(): Promise<void> {
    const config = this.configManager.getConfig();
    
    // Clean old requests from history (older than 1 second)
    const now = Date.now();
    this.requestHistory = this.requestHistory.filter(time => now - time < 1000);
    
    // Wait if we're at the concurrent request limit
    while (this.activeRequests >= config.maxConcurrentRequests) {
      await this.sleep(100);
    }
    
    // Wait if we're at the rate limit
    if (this.requestHistory.length >= config.maxRequestsPerSecond) {
      const oldestRequest = Math.min(...this.requestHistory);
      const waitTime = 1000 - (now - oldestRequest);
      if (waitTime > 0) {
        console.log(`🕐 Rate limiting: waiting ${waitTime}ms`);
        await this.sleep(waitTime);
      }
    }
    
    // Ensure minimum time between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000 / config.maxRequestsPerSecond;
    
    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await this.sleep(waitTime);
    }
  }

  private recordRequest(): void {
    const now = Date.now();
    this.requestHistory.push(now);
    this.lastRequestTime = now;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getActiveRequests(): number {
    return this.activeRequests;
  }

  getRequestRate(): number {
    const now = Date.now();
    const recentRequests = this.requestHistory.filter(time => now - time < 1000);
    return recentRequests.length;
  }

  resetStats(): void {
    this.requestHistory = [];
    this.lastRequestTime = 0;
    this.activeRequests = 0;
    console.log('📊 Rate limit stats reset');
  }
}
