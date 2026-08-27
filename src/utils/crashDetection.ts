
interface CrashReport {
  errorId: string;
  timestamp: string;
  error: string;
  stack?: string;
  component?: string;
  url: string;
  userAgent: string;
}

export class CrashDetection {
  private static crashCount = 0;
  private static maxCrashes = 5;

  static initialize() {
    // Global error handler for unhandled promises
    window.addEventListener('unhandledrejection', (event) => {
      console.error('🚨 UNHANDLED PROMISE REJECTION:', event.reason);
      this.logCrash({
        errorId: `unhandled_promise_${Date.now()}`,
        timestamp: new Date().toISOString(),
        error: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        component: 'UnhandledPromise',
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });

    // Global error handler for JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('🚨 GLOBAL ERROR:', event.error);
      this.logCrash({
        errorId: `global_error_${Date.now()}`,
        timestamp: new Date().toISOString(),
        error: event.error?.message || event.message,
        stack: event.error?.stack,
        component: 'Global',
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });

    // Use pagehide instead of unload (modern alternative)
    window.addEventListener('pagehide', () => {
      // Only log if we have crashes to report
      if (this.crashCount > 0) {
        console.log(`🛡️ Page cleanup: ${this.crashCount} crashes recorded this session`);
      }
    });

    // Use visibilitychange for better cleanup detection
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Page is being hidden, good time for cleanup
        if (this.crashCount > 0) {
          console.log(`🛡️ Page hidden: ${this.crashCount} crashes recorded`);
        }
      }
    });

    console.log('🛡️ Crash detection initialized with modern event listeners');
  }

  static logCrash(crash: CrashReport) {
    this.crashCount++;
    
    console.error(`🚨 CRASH REPORT #${this.crashCount}:`, crash);
    
    try {
      const existingCrashes = JSON.parse(sessionStorage.getItem('app_crashes') || '[]');
      existingCrashes.push(crash);
      sessionStorage.setItem('app_crashes', JSON.stringify(existingCrashes.slice(-20))); // Keep last 20
    } catch (e) {
      console.warn('Failed to log crash to session storage:', e);
    }

    // If too many crashes, suggest reload
    if (this.crashCount >= this.maxCrashes) {
      console.error(`🚨 CRITICAL: ${this.maxCrashes} crashes detected. App may be unstable.`);
      
      if (confirm(`The app has crashed ${this.maxCrashes} times. Would you like to reload the page?`)) {
        window.location.reload();
      }
    }
  }

  static getCrashHistory(): CrashReport[] {
    try {
      return JSON.parse(sessionStorage.getItem('app_crashes') || '[]');
    } catch (e) {
      console.warn('Failed to get crash history:', e);
      return [];
    }
  }

  static clearCrashHistory() {
    try {
      sessionStorage.removeItem('app_crashes');
      this.crashCount = 0;
      console.log('🧹 Crash history cleared');
    } catch (e) {
      console.warn('Failed to clear crash history:', e);
    }
  }
}
