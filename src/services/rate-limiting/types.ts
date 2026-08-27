export interface RequestQueue {
  ticker: string;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  retryCount: number;
  priority: number;
  requestFn: () => Promise<any>;
}

export interface RateLimitConfig {
  maxRequestsPerSecond: number;
  maxConcurrentRequests: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  maxRetries: number;
  jitterMs: number;
}

export interface RateLimitStats {
  queueLength: number;
  activeRequests: number;
  requestRate: number;
}
