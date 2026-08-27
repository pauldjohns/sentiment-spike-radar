
import { supabase } from '@/integrations/supabase/client';

export async function testFinnhubConnection(ticker?: string): Promise<{
  success: boolean;
  price?: number;
  error?: string;
}> {
  // Use dynamic industry ticker if none provided
  if (!ticker) {
    const { data, error } = await supabase
      .from('industry_tickers')
      .select('symbol')
      .limit(1);
    
    if (error || !data?.length) {
      return { success: false, error: 'Failed to get test ticker from database' };
    }
    ticker = data[0].symbol;
  }

  try {
    console.log(`🧪 Testing Finnhub connection for ${ticker}...`);
    
    const { data, error } = await supabase.functions.invoke('enrich-signal-price-metadata', {
      body: { 
        signal_id: 'test-signal-id',
        immediate_price_only: true,
        test_mode: true,
        ticker
      }
    });

    if (error) {
      console.error('Finnhub test failed:', error);
      return { success: false, error: error.message };
    }

    if (data?.success && data?.price_at_signal) {
      console.log(`✅ Finnhub connection successful: ${ticker} = $${data.price_at_signal}`);
      return { success: true, price: data.price_at_signal };
    }

    return { success: false, error: 'Invalid response format' };

  } catch (error) {
    console.error('Finnhub connection test error:', error);
    return { success: false, error: error.message };
  }
}

export async function validateSystemReadiness(): Promise<{
  ready: boolean;
  checks: Record<string, boolean>;
  issues: string[];
}> {
  const checks = {
    database: false,
    finnhub: false,
    stocktwits: false,
    edgeFunctions: false
  };
  
  const issues: string[] = [];

  try {
    // Test database connection
    const { error: dbError } = await supabase
      .from('enriched_signals')
      .select('count')
      .limit(1);
    
    checks.database = !dbError;
    if (dbError) issues.push(`Database: ${dbError.message}`);

    // Test Finnhub connection
    const finnhubTest = await testFinnhubConnection();
    checks.finnhub = finnhubTest.success;
    if (!finnhubTest.success) issues.push(`Finnhub: ${finnhubTest.error}`);

    // Test StockTwits data availability
    const { data: recentMessages, error: stockTwitsError } = await supabase
      .from('stocktwits_messages_live')
      .select('*')
      .limit(1);
    
    checks.stocktwits = !stockTwitsError && !!(recentMessages?.length);
    if (stockTwitsError) issues.push(`StockTwits: ${stockTwitsError.message}`);
    if (!recentMessages?.length) issues.push('StockTwits: No recent messages found');

    // Test edge functions (basic health check)
    const { error: functionError } = await supabase.functions.invoke('ingest-sentiment-data', {
      body: { health_check: true }
    });
    
    checks.edgeFunctions = !functionError;
    if (functionError) issues.push(`Edge Functions: ${functionError.message}`);

  } catch (error) {
    issues.push(`System validation error: ${error.message}`);
  }

  const ready = Object.values(checks).every(check => check === true);

  return { ready, checks, issues };
}

// Legacy exports for backward compatibility
export const testYFinanceConnection = testFinnhubConnection;
