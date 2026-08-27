
import { RateLimitStats } from './rate-limiting/types';
import { RateLimitConfigManager } from './rate-limiting/RateLimitConfig';
import { RequestExecutor } from './rate-limiting/RequestExecutor';
import { RequestQueueManager } from './rate-limiting/RequestQueue';

export class RateLimitService {
  private static instance: RateLimitService;
  private configManager: RateLimitConfigManager;
  private executor: RequestExecutor;
  private queueManager: RequestQueueManager;

  private constructor() {
    this.configManager = new RateLimitConfigManager();
    this.executor = new RequestExecutor(this.configManager);
    this.queueManager = new RequestQueueManager(this.configManager, this.executor);
  }

  static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  async makeRequest<T>(
    ticker: string,
    requestFn: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    return this.queueManager.addRequest(ticker, requestFn, priority);
  }

  // Status methods for monitoring
  getQueueLength(): number {
    return this.queueManager.getQueueLength();
  }

  getActiveRequests(): number {
    return this.executor.getActiveRequests();
  }

  getRequestRate(): number {
    return this.executor.getRequestRate();
  }

  getStats(): RateLimitStats {
    return {
      queueLength: this.getQueueLength(),
      activeRequests: this.getActiveRequests(),
      requestRate: this.getRequestRate()
    };
  }

  // Configuration methods
  updateConfig(newConfig: Partial<import('./rate-limiting/types').RateLimitConfig>): void {
    this.configManager.updateConfig(newConfig);
  }

  // Reset methods for testing/debugging
  clearQueue(): void {
    this.queueManager.clearQueue();
  }

  resetStats(): void {
    this.executor.resetStats();
  }
}
