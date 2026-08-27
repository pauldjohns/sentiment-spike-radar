import { INDUSTRY_FOCUS_TICKERS } from '@/data/industry_tickers';
import { supabase } from '@/integrations/supabase/client';

/**
 * Signal Integrity Validator
 * Ensures all signals are based on real data and valid industry tickers
 */
export class SignalIntegrityValidator {
  /**
   * Validates that a ticker is from the approved industry focus list
   */
  static isValidIndustryTicker(ticker: string): boolean {
    return INDUSTRY_FOCUS_TICKERS.includes(ticker.toUpperCase() as any);
  }

  /**
   * Gets the complete list of valid industry tickers
   */
  static getAllValidTickers(): string[] {
    return [...INDUSTRY_FOCUS_TICKERS];
  }

  /**
   * Validates a batch of tickers for signal processing
   */
  static validateTickerBatch(tickers: string[]): {
    valid: string[];
    invalid: string[];
    warnings: string[];
  } {
    const valid: string[] = [];
    const invalid: string[] = [];
    const warnings: string[] = [];

    tickers.forEach(ticker => {
      const upperTicker = ticker.toUpperCase();
      if (this.isValidIndustryTicker(upperTicker)) {
        valid.push(upperTicker);
      } else {
        invalid.push(upperTicker);
        warnings.push(`🚨 SCOPE VIOLATION: ${upperTicker} not in industry focus list`);
      }
    });

    if (invalid.length > 0) {
      console.warn(`⚠️ Filtered out ${invalid.length} non-industry tickers:`, invalid);
    }

    return { valid, invalid, warnings };
  }

  /**
   * Validates signal selection integrity - ensures no duplicates and proper selection
   */
  static async validateSignalSelection(
    selectedTickers: string[],
    timeWindow: string
  ): Promise<{
    isValid: boolean;
    issues: string[];
    metrics: {
      totalEligible: number;
      selected: number;
      duplicates: number;
      nonIndustry: number;
    };
  }> {
    const issues: string[] = [];
    const metrics = {
      totalEligible: INDUSTRY_FOCUS_TICKERS.length,
      selected: selectedTickers.length,
      duplicates: 0,
      nonIndustry: 0
    };

    // Check for duplicates
    const uniqueTickers = new Set(selectedTickers);
    metrics.duplicates = selectedTickers.length - uniqueTickers.size;
    if (metrics.duplicates > 0) {
      issues.push(`🚨 DUPLICATE TICKERS: Found ${metrics.duplicates} duplicate tickers in selection`);
    }

    // Check for non-industry tickers
    const validation = this.validateTickerBatch(selectedTickers);
    metrics.nonIndustry = validation.invalid.length;
    if (metrics.nonIndustry > 0) {
      issues.push(`🚨 NON-INDUSTRY TICKERS: ${metrics.nonIndustry} tickers outside industry scope`);
    }

    // Check if we have proper selection from eligible pool
    if (metrics.selected < 5) {
      issues.push(`⚠️ LOW SELECTION: Only ${metrics.selected} tickers selected for analysis`);
    }

    // Check for previous signals in same time window (avoid reprocessing)
    if (timeWindow) {
      try {
        const { data: existingSignals } = await supabase
          .from('enriched_signals')
          .select('ticker, signal_detected_at')
          .in('ticker', validation.valid)
          .eq('time_window', timeWindow)
          .gte('signal_detected_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

        const reprocessedTickers = existingSignals?.map(s => s.ticker) || [];
        if (reprocessedTickers.length > 0) {
          issues.push(`⚠️ REPROCESSING: ${reprocessedTickers.length} tickers already processed in current window`);
        }
      } catch (error) {
        issues.push(`❌ VALIDATION ERROR: Could not check existing signals - ${error.message}`);
      }
    }

    const isValid = issues.filter(i => i.includes('🚨')).length === 0; // Only critical issues fail validation

    return {
      isValid,
      issues,
      metrics
    };
  }

  /**
   * Logs signal integrity metrics for monitoring
   */
  static async logIntegrityMetrics(
    processedTickers: string[],
    successfulSignals: number,
    skippedTickers: number,
    timeWindow: string
  ): Promise<void> {
    const validation = this.validateTickerBatch(processedTickers);
    
    console.log('📊 SIGNAL INTEGRITY METRICS:');
    console.log(`   Total Eligible Tickers: ${INDUSTRY_FOCUS_TICKERS.length}`);
    console.log(`   Processed Tickers: ${validation.valid.length}`);
    console.log(`   Successful Signals: ${successfulSignals}`);
    console.log(`   Skipped Tickers: ${skippedTickers}`);
    console.log(`   Scope Violations: ${validation.invalid.length}`);
    console.log(`   Time Window: ${timeWindow}`);
    
    if (validation.invalid.length > 0) {
      console.warn('🚨 SCOPE VIOLATIONS:', validation.invalid);
    }

    // Alert if success rate is too low
    const successRate = processedTickers.length > 0 ? (successfulSignals / processedTickers.length) * 100 : 0;
    if (successRate < 30) {
      console.warn(`⚠️ LOW SUCCESS RATE: Only ${successRate.toFixed(1)}% of processed tickers generated signals`);
    }
  }

  /**
   * Validates that signal data is based on real inputs, not mock/simulated data
   */
  static validateSignalData(signalData: {
    ticker: string;
    message_volume?: number;
    z_score?: number;
    sentiment_velocity?: number;
    price_at_signal?: number;
  }): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check ticker validity
    if (!this.isValidIndustryTicker(signalData.ticker)) {
      issues.push(`🚨 INVALID TICKER: ${signalData.ticker} not in industry focus list`);
    }

    // Check for realistic data ranges (detect mock data)
    if (signalData.message_volume !== undefined) {
      if (signalData.message_volume < 1) {
        issues.push(`🚨 INVALID MESSAGE VOLUME: ${signalData.message_volume} is too low`);
      }
      if (signalData.message_volume > 10000) {
        issues.push(`⚠️ SUSPICIOUS MESSAGE VOLUME: ${signalData.message_volume} seems unrealistically high`);
      }
    }

    if (signalData.z_score !== undefined) {
      if (Math.abs(signalData.z_score) > 10) {
        issues.push(`⚠️ SUSPICIOUS Z-SCORE: ${signalData.z_score} seems unrealistically high`);
      }
    }

    if (signalData.price_at_signal !== undefined) {
      // Check for obvious mock prices (round numbers like 100, 200, etc.)
      if (signalData.price_at_signal % 100 === 0 && signalData.price_at_signal <= 1000) {
        issues.push(`⚠️ SUSPICIOUS PRICE: ${signalData.price_at_signal} looks like a mock price`);
      }
    }

    const isValid = issues.filter(i => i.includes('🚨')).length === 0;

    return { isValid, issues };
  }
}