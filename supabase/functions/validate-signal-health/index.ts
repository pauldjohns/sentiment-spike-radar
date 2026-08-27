import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SignalHealthReport {
  interval: string;
  total_eligible_tickers: number;
  signals_detected: number;
  unique_tickers: number;
  status: 'pass' | 'warn' | 'fail';
  duplicate_ticker_flag: boolean;
  baseline_coverage_score: number;
  timestamp: string;
  health_details: {
    sentiment_health: Array<{
      ticker: string;
      issue?: string;
      action?: string;
      sentiment_score?: number;
      message_volume?: number;
      baseline_available?: boolean;
    }>;
    duplicates?: Array<{
      ticker: string;
      count: number;
    }>;
    warnings: string[];
    errors: string[];
  };
}

function determineTimeWindow(): string {
  const now = new Date();
  const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const day = etNow.getDay();
  const hour = etNow.getHours();
  const minute = etNow.getMinutes();
  const currentTime = hour * 60 + minute;
  
  // Weekend check
  if (day === 0 || day === 6) return 'weekend';
  
  // Pre-market: 4:00 AM - 9:30 AM ET
  if (currentTime >= 4 * 60 && currentTime < 9 * 60 + 30) return 'pre_market';
  
  // Market hours with specific windows
  if (currentTime >= 9 * 60 + 30 && currentTime < 10 * 60) return 'market_open'; // 9:30-10:00 AM
  if (currentTime >= 10 * 60 && currentTime < 10 * 60 + 30) return 'plus_30_min'; // 10:00-10:30 AM
  if (currentTime >= 10 * 60 + 30 && currentTime < 11 * 60) return 'plus_1_hr'; // 10:30-11:00 AM
  if (currentTime >= 11 * 60 && currentTime < 16 * 60) return 'market_hours'; // 11:00 AM-4:00 PM
  
  // After-hours: 4:00 PM - 8:00 PM ET
  if (currentTime >= 16 * 60 && currentTime < 20 * 60) return 'after_hours';
  
  return 'overnight';
}

async function validateSignalHealth(supabase: any): Promise<SignalHealthReport> {
  console.log('🧪 SIGNAL HEALTH VALIDATION: Starting comprehensive check...');
  
  const timeWindow = determineTimeWindow();
  const currentTime = new Date().toISOString();
  
  const report: SignalHealthReport = {
    interval: timeWindow,
    total_eligible_tickers: 0,
    signals_detected: 0,
    unique_tickers: 0,
    status: 'pass',
    duplicate_ticker_flag: false,
    baseline_coverage_score: 0,
    timestamp: currentTime,
    health_details: {
      sentiment_health: [],
      warnings: [],
      errors: []
    }
  };

  try {
    // ✅ 1. GET TOTAL ELIGIBLE TICKER COUNT
    console.log('📊 Checking total eligible ticker count...');
    const { data: allTickers, error: tickerError } = await supabase
      .from('industry_tickers')
      .select('symbol')
      .order('symbol');

    if (tickerError) {
      report.health_details.errors.push(`Failed to load industry tickers: ${tickerError.message}`);
      report.status = 'fail';
      return report;
    }

    report.total_eligible_tickers = allTickers?.length || 0;
    console.log(`✅ Total eligible tickers: ${report.total_eligible_tickers}`);

    if (report.total_eligible_tickers < 300) {
      report.health_details.warnings.push(`Low ticker count: ${report.total_eligible_tickers} (expected ~357)`);
      report.status = 'warn';
    }

    // ✅ 2. CHECK SIGNALS FROM CURRENT INTERVAL (last 30 minutes)
    console.log('🎯 Checking recent signals for current interval...');
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: recentSignals, error: signalsError } = await supabase
      .from('enriched_signals')
      .select('*')
      .eq('time_window', timeWindow)
      .gte('signal_detected_at', thirtyMinutesAgo)
      .eq('source', 'live')
      .order('signal_detected_at', { ascending: false });

    if (signalsError) {
      report.health_details.errors.push(`Failed to fetch recent signals: ${signalsError.message}`);
      report.status = 'fail';
      return report;
    }

    report.signals_detected = recentSignals?.length || 0;
    console.log(`📈 Signals detected in current interval: ${report.signals_detected}`);

    // ✅ 3. CHECK FOR DUPLICATE TICKERS
    console.log('🔍 Checking for duplicate tickers in signals...');
    const tickerCounts = new Map<string, number>();
    const duplicates: Array<{ ticker: string; count: number }> = [];

    recentSignals?.forEach(signal => {
      const count = tickerCounts.get(signal.ticker) || 0;
      tickerCounts.set(signal.ticker, count + 1);
    });

    for (const [ticker, count] of tickerCounts.entries()) {
      if (count > 1) {
        duplicates.push({ ticker, count });
        report.duplicate_ticker_flag = true;
        report.health_details.errors.push(`Duplicate ticker detected: ${ticker} appears ${count} times in interval ${timeWindow}`);
      }
    }

    if (duplicates.length > 0) {
      report.health_details.duplicates = duplicates;
      report.status = 'fail';
      console.log(`❌ Found ${duplicates.length} duplicate tickers:`, duplicates);
    }

    report.unique_tickers = tickerCounts.size;
    console.log(`✅ Unique tickers in signals: ${report.unique_tickers}`);

    // ✅ 4. VALIDATE SIGNAL TARGET (should be exactly 10 unique signals)
    if (report.unique_tickers !== 10 && timeWindow !== 'weekend' && timeWindow !== 'overnight') {
      if (report.unique_tickers < 10) {
        report.health_details.warnings.push(`Low signal count: ${report.unique_tickers} unique signals (expected 10)`);
        report.status = 'warn';
      } else {
        report.health_details.errors.push(`Excessive signal count: ${report.unique_tickers} unique signals (expected 10)`);
        report.status = 'fail';
      }
    }

    // ✅ 5. SENTIMENT HEALTH VALIDATION FOR EACH SIGNAL
    console.log('🧠 Validating sentiment health for detected signals...');
    let baselineCoverageCount = 0;
    
    for (const signal of recentSignals || []) {
      const healthEntry = {
        ticker: signal.ticker,
        sentiment_score: signal.sentiment_velocity,
        message_volume: signal.message_volume,
        baseline_available: false
      };

      // Check for missing sentiment data
      if (signal.sentiment_velocity === null || signal.sentiment_velocity === undefined) {
        healthEntry.issue = 'Missing sentiment score';
        healthEntry.action = 'Fallback or null used';
        report.health_details.warnings.push(`${signal.ticker}: Missing sentiment score`);
        if (report.status === 'pass') report.status = 'warn';
      }

      // Check for missing message volume
      if (!signal.message_volume || signal.message_volume === 0) {
        healthEntry.issue = 'Missing or zero message volume';
        healthEntry.action = 'Invalid signal data';
        report.health_details.warnings.push(`${signal.ticker}: Missing or zero message volume`);
        if (report.status === 'pass') report.status = 'warn';
      }

      // Check if baseline data was available for this ticker
      const { data: baseline } = await supabase
        .from('message_volume_history')
        .select('*')
        .eq('ticker', signal.ticker)
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .limit(1);

      if (baseline && baseline.length > 0) {
        healthEntry.baseline_available = true;
        baselineCoverageCount++;
      }

      report.health_details.sentiment_health.push(healthEntry);
    }

    // Calculate baseline coverage score
    report.baseline_coverage_score = report.signals_detected > 0 ? 
      (baselineCoverageCount / report.signals_detected) * 100 : 0;
    
    console.log(`📊 Baseline coverage: ${baselineCoverageCount}/${report.signals_detected} signals (${report.baseline_coverage_score.toFixed(1)}%)`);

    if (report.baseline_coverage_score < 50) {
      report.health_details.warnings.push(`Low baseline coverage: ${report.baseline_coverage_score.toFixed(1)}% of signals have historical baseline data`);
      if (report.status === 'pass') report.status = 'warn';
    }

    // ✅ 6. LOG HEALTH CHECK RESULTS
    await supabase
      .from('signal_logs')
      .insert({
        ticker: 'HEALTH_CHECK',
        signal_type: 'signal_health_check',
        anomaly_score: report.baseline_coverage_score,
        message_volume: report.signals_detected,
        signal_confidence: report.status === 'pass' ? 'high' : report.status === 'warn' ? 'medium' : 'low',
        time_window: timeWindow,
        trigger_details: {
          total_eligible_tickers: report.total_eligible_tickers,
          unique_tickers: report.unique_tickers,
          duplicate_ticker_flag: report.duplicate_ticker_flag,
          baseline_coverage_score: report.baseline_coverage_score,
          health_status: report.status,
          warnings_count: report.health_details.warnings.length,
          errors_count: report.health_details.errors.length,
          validation_timestamp: currentTime
        }
      });

    console.log(`✅ SIGNAL HEALTH VALIDATION COMPLETE: Status = ${report.status}`);
    console.log(`📊 Summary: ${report.signals_detected} signals, ${report.unique_tickers} unique tickers, ${report.baseline_coverage_score.toFixed(1)}% baseline coverage`);
    
    if (report.health_details.warnings.length > 0) {
      console.log(`⚠️ Warnings (${report.health_details.warnings.length}):`, report.health_details.warnings);
    }
    
    if (report.health_details.errors.length > 0) {
      console.log(`❌ Errors (${report.health_details.errors.length}):`, report.health_details.errors);
    }

    return report;

  } catch (error) {
    console.error('❌ Signal health validation failed:', error);
    report.health_details.errors.push(`Validation failed: ${error.message}`);
    report.status = 'fail';
    return report;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log('🧪 SIGNAL HEALTH VALIDATION: Starting health check...');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const healthReport = await validateSignalHealth(supabase);

    return new Response(
      JSON.stringify(healthReport, null, 2),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Health validation service error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Health validation failed',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})