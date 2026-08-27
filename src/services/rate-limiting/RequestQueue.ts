
import { RequestQueue } from './types';
import { RequestExecutor } from './RequestExecutor';
import { RateLimitConfigManager } from './RateLimitConfig';

export class RequestQueueManager {
  private requestQueue: RequestQueue[] = [];
  private isProcessing = false;
  private configManager: RateLimitConfigManager;
  private executor: RequestExecutor;

  constructor(configManager: RateLimitConfigManager, executor: RequestExecutor) {
    this.configManager = configManager;
    this.executor = executor;
  }

  async addRequest<T>(
    ticker: string,
    requestFn: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        ticker,
        resolve,
        reject,
        retryCount: 0,
        priority,
        requestFn
      });

      // Sort by priority (higher numbers first)
      this.requestQueue.sort((a, b) => b.priority - a.priority);
      
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) return;
    
    this.isProcessing = true;
    const config = this.configManager.getConfig();
    
    while (this.requestQueue.length > 0 && this.executor.getActiveRequests() < config.maxConcurrentRequests) {
      const request = this.requestQueue.shift();
      if (request) {
        // Process request without blocking the queue
        this.processRequestAsync(request);
        
        // Small delay between queue processing
        await this.sleep(50);
      }
    }
    
    this.isProcessing = false;
    
    // Continue processing if there are more requests
    if (this.requestQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  private async processRequestAsync(request: RequestQueue): Promise<void> {
    try {
      // Execute the request function and get the result
      const result = await this.executor.executeWithRetry(request.requestFn, request.ticker, request.retryCount);
      // Resolve the original promise with the result
      request.resolve(result);
    } catch (error) {
      // Reject the original promise with the error
      request.reject(error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getQueueLength(): number {
    return this.requestQueue.length;
  }

  clearQueue(): void {
    this.requestQueue = [];
    console.log('🗑️ Request queue cleared');
  }
}
