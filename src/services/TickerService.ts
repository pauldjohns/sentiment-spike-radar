
import { INDUSTRY_FOCUS_TICKERS } from '@/data/industry_tickers';

export class TickerService {
  private static tickers: string[] = [];
  private static initialized = false;

  // Load industry-focused ticker list - STRICT SCOPE ENFORCEMENT
  private static async loadTickerList(): Promise<string[]> {
    try {
      // ONLY return the static industry focus list - no external sources
      console.log('🎯 Loading STRICT industry-focused ticker scope:', INDUSTRY_FOCUS_TICKERS.length, 'tickers');
      return [...INDUSTRY_FOCUS_TICKERS]; // Use the complete curated industry list
    } catch (error) {
      console.error('Failed to load ticker list:', error);
      return [...INDUSTRY_FOCUS_TICKERS]; // Fallback to the same list
    }
  }

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.tickers = await this.loadTickerList();
      this.initialized = true;
      
      // ✅ VALIDATION LOG: Confirm strict scope
      console.log(`✅ STRICT SCOPE: Initialized with ${this.tickers.length} industry-focused tickers ONLY`);
      console.log('🎯 Sectors: Defense/Aerospace, Energy & Renewables, Biotech & Pharma');
      console.log('🚨 SCOPE ENFORCEMENT: No external tickers allowed');
      
      // ✅ Sample validation - log first few tickers to confirm source
      console.log('📋 Sample tickers (first 10):', this.tickers.slice(0, 10));
    } catch (error) {
      console.error('Failed to initialize ticker service:', error);
      this.tickers = [...INDUSTRY_FOCUS_TICKERS];
      this.initialized = true;
    }
  }

  static async getAllTickers(): Promise<string[]> {
    await this.initialize();
    
    // ✅ SCOPE VALIDATION: Ensure we're only returning industry tickers
    const validatedTickers = this.tickers.filter(ticker => 
      INDUSTRY_FOCUS_TICKERS.includes(ticker as any)
    );
    
    if (validatedTickers.length !== this.tickers.length) {
      console.warn(`🚨 SCOPE VIOLATION: Filtered out ${this.tickers.length - validatedTickers.length} non-industry tickers`);
    }
    
    console.log(`📊 Returning ${validatedTickers.length} validated industry tickers`);
    return validatedTickers;
  }

  static async getTickerCount(): Promise<number> {
    const tickers = await this.getAllTickers();
    return tickers.length; // Return count of validated tickers only
  }

  static async getTickerBatch(batchIndex: number, batchSize: number): Promise<string[]> {
    const tickers = await this.getAllTickers(); // Use validated list
    const startIndex = batchIndex * batchSize;
    return tickers.slice(startIndex, startIndex + batchSize);
  }

  static async isValidTicker(ticker: string): Promise<boolean> {
    // ✅ STRICT VALIDATION: Only industry tickers are valid
    const isValid = INDUSTRY_FOCUS_TICKERS.includes(ticker.toUpperCase() as any);
    
    if (!isValid) {
      console.warn(`🚨 INVALID TICKER: ${ticker} not in industry focus list`);
    }
    
    return isValid;
  }

  // Get market statistics for industry focus ONLY
  static async getMarketStats(): Promise<{ total: number; sectors: Record<string, number> }> {
    const tickers = await this.getAllTickers();
    return {
      total: tickers.length, // Only industry ticker count
      sectors: {
        'Defense & Aerospace': 85,
        'Energy & Renewables': 120, 
        'Biotech & Pharma': 100
      }
    };
  }

  // Get industry-focused ticker categories
  static getIndustryCategories(): string[] {
    return [
      'Defense & Aerospace',
      'Energy & Renewables', 
      'Biotech & Pharma'
    ];
  }

  // Get total ticker count without initialization (for UI display) - STATIC ONLY
  static getStaticTickerCount(): number {
    return INDUSTRY_FOCUS_TICKERS.length;
  }

  // ✅ NEW: Validation method to check if a list contains only industry tickers
  static validateTickerScope(tickers: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];
    
    tickers.forEach(ticker => {
      if (INDUSTRY_FOCUS_TICKERS.includes(ticker as any)) {
        valid.push(ticker);
      } else {
        invalid.push(ticker);
      }
    });
    
    if (invalid.length > 0) {
      console.warn(`🚨 SCOPE VIOLATIONS: ${invalid.length} invalid tickers:`, invalid);
    }
    
    return { valid, invalid };
  }
}
