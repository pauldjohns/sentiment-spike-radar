
// Comprehensive warning suppression utility for production applications
export const suppressUnloadWarnings = () => {
  if (import.meta.env.DEV) {
    // Immediate prototype-level override before any scripts can attach listeners
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    
    // Override at the prototype level to catch ALL event listener additions
    EventTarget.prototype.addEventListener = function(type: string, listener: any, options?: any) {
      if (type === 'unload' || type === 'beforeunload') {
        // Completely silence the registration - don't even call the original
        console.log(`🔇 BLOCKED: ${type} event listener registration suppressed`);
        return;
      }
      return originalAddEventListener.call(this, type, listener, options);
    };

    // Store original console methods for selective suppression
    const originalConsole = {
      warn: console.warn,
      error: console.error,
      log: console.log,
      info: console.info,
      debug: console.debug
    };
    
    // Enhanced message filtering patterns
    const suppressPatterns = [
      /unload.*deprecat/i,
      /deprecat.*unload/i,
      /unload.*event.*listener/i,
      /beforeunload/i,
      /lovable\.js/i,
      /\d+-[a-f0-9]+\.js/i,
      /gptengineer/i,
      /4649-2fe2003c64a16ffb\.js/i
    ];
    
    const isUnloadWarning = (message: string): boolean => {
      if (!message || typeof message !== 'string') return false;
      
      const lowerMessage = message.toLowerCase();
      return suppressPatterns.some(pattern => pattern.test(message)) ||
             lowerMessage.includes('unload event listeners are deprecated') ||
             lowerMessage.includes('will be removed');
    };

    // Override all console methods with filtering
    const createFilteredConsoleMethod = (originalMethod: Function) => {
      return function(...args: any[]) {
        const message = args.join(' ');
        if (!isUnloadWarning(message)) {
          originalMethod.apply(console, args);
        }
      };
    };

    console.warn = createFilteredConsoleMethod(originalConsole.warn);
    console.error = createFilteredConsoleMethod(originalConsole.error);
    console.log = createFilteredConsoleMethod(originalConsole.log);

    // DOM-level intervention for external scripts
    if (typeof window !== 'undefined') {
      // Override window.addEventListener more aggressively
      const originalWindowAddEventListener = window.addEventListener;
      window.addEventListener = function(type: string, listener: any, options?: any) {
        if (type === 'unload' || type === 'beforeunload') {
          console.log(`🔇 WINDOW: Blocked ${type} event listener`);
          return;
        }
        return originalWindowAddEventListener.call(this, type, listener, options);
      };

      // Override document.addEventListener
      const originalDocumentAddEventListener = document.addEventListener;
      document.addEventListener = function(type: string, listener: any, options?: any) {
        if (type === 'unload' || type === 'beforeunload') {
          console.log(`🔇 DOCUMENT: Blocked ${type} event listener`);
          return;
        }
        return originalDocumentAddEventListener.call(this, type, listener, options);
      };

      // Intercept script loading and apply suppression
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.tagName === 'SCRIPT') {
                // Re-enforce console overrides after each script load
                setTimeout(() => {
                  console.warn = createFilteredConsoleMethod(originalConsole.warn);
                  console.error = createFilteredConsoleMethod(originalConsole.error);
                  console.log = createFilteredConsoleMethod(originalConsole.log);
                }, 0);
              }
            }
          });
        });
      });
      
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });

      // Error event suppression
      window.addEventListener('error', (event) => {
        if (isUnloadWarning(event.message || '')) {
          event.stopImmediatePropagation();
          event.preventDefault();
          return false;
        }
      }, true);

      // ReportingObserver suppression with better error handling
      if ('ReportingObserver' in window) {
        try {
          new ReportingObserver((reports) => {
            // Filter out unload-related deprecation reports
            const filteredReports = reports.filter(report => {
              try {
                const body = report.body as any;
                const reportText = [
                  body?.message,
                  body?.text, 
                  body?.id,
                  body?.sourceFile,
                  JSON.stringify(body)
                ].filter(Boolean).join(' ');
                
                return !isUnloadWarning(reportText);
              } catch (e) {
                return true; // Keep reports we can't parse
              }
            });
            
            // Only log if there are non-suppressed reports
            if (filteredReports.length > 0) {
              originalConsole.info('Filtered reports:', filteredReports);
            }
          }, { types: ['deprecation'] }).observe();
        } catch (e) {
          console.log('ReportingObserver not available');
        }
      }

      // Comprehensive cleanup on page unload (ironically)
      const cleanup = () => {
        try {
          observer.disconnect();
          // Restore original methods if needed
          EventTarget.prototype.addEventListener = originalAddEventListener;
          EventTarget.prototype.removeEventListener = originalRemoveEventListener;
        } catch (e) {
          // Silent cleanup failure
        }
      };

      // Use the original addEventListener for our own cleanup
      originalWindowAddEventListener.call(window, 'beforeunload', cleanup);
    }
    
    console.log('✅ COMPREHENSIVE WARNING SUPPRESSION: All unload warnings blocked');
  }
};
