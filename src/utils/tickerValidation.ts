import { getAllIndustryTickers } from '@/data/industry_tickers';

/**
 * ✅ DYNAMIC TICKER VALIDATION UTILITIES
 * Now uses dynamic database queries instead of static lists
 */

// Cache for loaded tickers to avoid repeated database queries
let cachedTickers: string[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function loadIndustryTickers(): Promise<string[]> {
  const now = Date.now();
  
  // Return cached tickers if still valid
  if (cachedTickers.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedTickers;
  }
  
  // Load fresh tickers from database
  const tickers = await getAllIndustryTickers();
  
  if (tickers.length > 0) {
    cachedTickers = tickers;
    cacheTimestamp = now;
    console.log(`✅ Loaded ${tickers.length} industry tickers from database`);
  } else {
    console.warn('⚠️ No industry tickers loaded from database');
  }
  
  return tickers;
}

export class TickerValidator {
  /**
   * Validates if a ticker is in the approved industry focus list
   */
  static async isValidTicker(ticker: string): Promise<boolean> {
    const tickers = await loadIndustryTickers();
    const isValid = tickers.includes(ticker.toUpperCase());
    
    if (!isValid) {
      console.warn(`🚨 TICKER SCOPE VIOLATION: ${ticker} not in industry list`);
    }
    
    return isValid;
  }

  /**
   * Filters an array of tickers to only include valid industry tickers
   */
  static async filterValidTickers(tickers: string[]): Promise<string[]> {
    const industryTickers = await loadIndustryTickers();
    const validTickers = tickers.filter(ticker => 
      industryTickers.includes(ticker.toUpperCase())
    );
    
    const filteredCount = tickers.length - validTickers.length;
    if (filteredCount > 0) {
      console.warn(`🚨 SCOPE ENFORCEMENT: Filtered out ${filteredCount} non-industry tickers`);
    }
    
    return validTickers;
  }

  /**
   * Validates ticker and returns null if invalid (for React components)
   */
  static async validateTickerForRender(ticker: string): Promise<string | null> {
    const isValid = await this.isValidTicker(ticker);
    return isValid ? ticker : null;
  }

  /**
   * Gets the complete industry ticker list
   */
  static async getAllValidTickers(): Promise<string[]> {
    return await loadIndustryTickers();
  }

  /**
   * Runtime assertion for TypeScript safety
   */
  static async assertValidTicker(ticker: string): Promise<void> {
    const isValid = await this.isValidTicker(ticker);
    if (!isValid) {
      const count = await this.getValidTickerCount();
      throw new Error(`Invalid ticker: ${ticker} not in ${count}-ticker industry scope`);
    }
  }

  /**
   * Gets ticker count for validation
   */
  static async getValidTickerCount(): Promise<number> {
    const tickers = await loadIndustryTickers();
    return tickers.length;
  }

  /**
   * Validates ticker list integrity (for testing) - non-blocking
   */
  static async validateTickerListIntegrity(): Promise<boolean> {
    const tickers = await loadIndustryTickers();
    const actualCount = tickers.length;
    
    if (actualCount < 300) {
      console.warn(`⚠️ TICKER COUNT WARNING: Only ${actualCount} tickers loaded`);
      return false;
    }
    
    console.log(`✅ TICKER LIST VERIFIED: ${actualCount} tickers validated`);
    return true;
  }
}

// Export utility functions
export const getValidTickerCount = () => TickerValidator.getValidTickerCount();

// Initialize and verify on load (non-blocking)
TickerValidator.validateTickerListIntegrity().then(isValid => {
  if (!isValid) {
    console.warn('⚠️ Ticker list integrity check warning');
  }
}).catch(error => {
  console.error('❌ Failed to validate ticker list integrity:', error);
});