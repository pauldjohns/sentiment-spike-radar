
import { RateLimitConfig } from './types';

export class RateLimitConfigManager {
  private config: RateLimitConfig = {
    maxRequestsPerSecond: 10, // Conservative rate for StockTwits
    maxConcurrentRequests: 5,  // Reduced from 25 to avoid overwhelming API
    baseBackoffMs: 1000,       // Start with 1 second backoff
    maxBackoffMs: 30000,       // Max 30 second backoff
    maxRetries: 3,             // Retry up to 3 times
    jitterMs: 500              // Add randomness to avoid thundering herd
  };

  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('📊 Rate limit config updated:', this.config);
  }

  shouldRetry(error: any, retryCount: number): boolean {
    if (retryCount >= this.config.maxRetries) return false;
    
    // Retry on rate limiting, network errors, and server errors
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    const isRetryable = retryableStatusCodes.includes(error.status) || 
                       error.message?.includes('network') ||
                       error.message?.includes('timeout');
    
    return isRetryable;
  }

  calculateBackoff(retryCount: number): number {
    // Exponential backoff with jitter
    const exponentialBackoff = Math.min(
      this.config.baseBackoffMs * Math.pow(2, retryCount),
      this.config.maxBackoffMs
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * this.config.jitterMs;
    
    return exponentialBackoff + jitter;
  }
}
