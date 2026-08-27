
import { useRef } from 'react';

class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly threshold = 3;
  private readonly timeout = 60000; // 1 minute

  isOpen(): boolean {
    if (this.failureCount >= this.threshold) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure < this.timeout) {
        return true;
      } else {
        this.reset();
      }
    }
    return false;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }

  recordSuccess(): void {
    this.reset();
  }

  private reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}

export const useCircuitBreaker = () => {
  const circuitBreaker = useRef(new CircuitBreaker());
  
  return {
    isOpen: () => circuitBreaker.current.isOpen(),
    recordFailure: () => circuitBreaker.current.recordFailure(),
    recordSuccess: () => circuitBreaker.current.recordSuccess()
  };
};
