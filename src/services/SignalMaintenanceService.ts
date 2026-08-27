import { supabase } from '@/integrations/supabase/client';
import { SignalIntegrityValidator } from './SignalIntegrityValidator';

/**
 * Service for triggering signal maintenance functions and monitoring system health
 */
export class SignalMaintenanceService {
  
  /**
   * Trigger learning data logging function
   */
  static async triggerLearningDataLog(options?: {
    enriched_signal_ids?: string[];
    batch_mode?: boolean;
    limit?: number;
  }): Promise<{ success: boolean; logged_count?: number; error?: string }> {
    try {
      console.log('🚀 MAINTENANCE: Triggering learning data logging...');
      
      const { data, error } = await supabase.functions.invoke(
        'log-signal-learning-data',
        {
          body: options || { batch_mode: true, limit: 100 }
        }
      );

      if (error) {
        console.error('❌ MAINTENANCE: Learning data log failed:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ MAINTENANCE: Learning data logged successfully:', data);
      return data || { success: false, error: 'No response data' };

    } catch (error) {
      console.error('❌ MAINTENANCE: Learning data log service error:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Trigger pattern analysis function
   */
  static async triggerPatternAnalysis(options?: {
    force_refresh?: boolean;
    ticker_filter?: string;
  }): Promise<{ success: boolean; patterns_processed?: number; error?: string }> {
    try {
      console.log('🚀 MAINTENANCE: Triggering pattern analysis...');
      
      const { data, error } = await supabase.functions.invoke(
        'analyze-signal-patterns',
        {
          body: options || { force_refresh: true }
        }
      );

      if (error) {
        console.error('❌ MAINTENANCE: Pattern analysis failed:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ MAINTENANCE: Pattern analysis completed successfully:', data);
      return data || { success: false, error: 'No response data' };

    } catch (error) {
      console.error('❌ MAINTENANCE: Pattern analysis service error:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Run full maintenance cycle (learning + patterns)
   */
  static async runFullMaintenance(): Promise<{
    learning: { success: boolean; logged_count?: number; error?: string };
    patterns: { success: boolean; patterns_processed?: number; error?: string };
  }> {
    console.log('🔧 MAINTENANCE: Starting full maintenance cycle...');
    
    // Run learning data logging first
    const learningResult = await this.triggerLearningDataLog();
    
    // Then run pattern analysis
    const patternsResult = await this.triggerPatternAnalysis();
    
    console.log('🎉 MAINTENANCE: Full maintenance cycle complete');
    console.log('📊 MAINTENANCE: Results:', { 
      learning: learningResult, 
      patterns: patternsResult 
    });
    
    return {
      learning: learningResult,
      patterns: patternsResult
    };
  }

  /**
   * Check if maintenance functions are healthy
   */
  static async checkMaintenanceHealth(): Promise<{
    learning_function: boolean;
    pattern_function: boolean;
    overall_health: boolean;
  }> {
    try {
      // Test learning function with health check
      const { error: learningError } = await supabase.functions.invoke(
        'log-signal-learning-data',
        { body: { health_check: true } }
      );

      // Test pattern analysis function with health check
      const { error: patternError } = await supabase.functions.invoke(
        'analyze-signal-patterns',
        { body: { health_check: true } }
      );

      const learningHealthy = !learningError;
      const patternHealthy = !patternError;

      return {
        learning_function: learningHealthy,
        pattern_function: patternHealthy,
        overall_health: learningHealthy && patternHealthy
      };

    } catch (error) {
      console.error('❌ MAINTENANCE: Health check failed:', error);
      return {
        learning_function: false,
        pattern_function: false,
        overall_health: false
      };
    }
  }

  /**
   * Run signal integrity checks
   */
  static async runIntegrityCheck(): Promise<{
    success: boolean;
    message: string;
    metrics?: any;
  }> {
    try {
      console.log('🔍 Running signal integrity checks...');
      
      // Check recent signals for integrity
      const { data: recentSignals, error } = await supabase
        .from('enriched_signals')
        .select('*')
        .gte('signal_detected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('signal_detected_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const metrics = {
        total_checked: recentSignals?.length || 0,
        scope_violations: 0,
        data_integrity_issues: 0,
        mock_data_detected: 0,
        valid_signals: 0
      };

      const issues: string[] = [];

      for (const signal of recentSignals || []) {
        // Validate ticker scope
        if (!SignalIntegrityValidator.isValidIndustryTicker(signal.ticker)) {
          metrics.scope_violations++;
          issues.push(`🚨 SCOPE VIOLATION: ${signal.ticker} not in industry focus list`);
        }

        // Validate signal data integrity
        const validation = SignalIntegrityValidator.validateSignalData(signal);
        if (!validation.isValid) {
          metrics.data_integrity_issues++;
          issues.push(...validation.issues);
        } else {
          metrics.valid_signals++;
        }

        // Check for mock data patterns
        if (signal.price_at_signal && signal.price_at_signal % 100 === 0) {
          metrics.mock_data_detected++;
        }
      }

      // Log summary
      console.log('📊 INTEGRITY CHECK RESULTS:');
      console.log(`   Total Signals Checked: ${metrics.total_checked}`);
      console.log(`   Valid Signals: ${metrics.valid_signals}`);
      console.log(`   Scope Violations: ${metrics.scope_violations}`);
      console.log(`   Data Integrity Issues: ${metrics.data_integrity_issues}`);
      console.log(`   Mock Data Detected: ${metrics.mock_data_detected}`);

      const criticalIssues = metrics.scope_violations + metrics.data_integrity_issues;
      const success = criticalIssues === 0;

      return {
        success,
        message: success 
          ? `Integrity check passed: ${metrics.valid_signals} valid signals` 
          : `Integrity check found ${criticalIssues} critical issues`,
        metrics
      };
    } catch (error) {
      console.error('❌ Integrity check failed:', error);
      return {
        success: false,
        message: `Integrity check failed: ${error.message}`
      };
    }
  }
}