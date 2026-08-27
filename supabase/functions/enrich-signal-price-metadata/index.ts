import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentRequest {
  signal_id: string;
  test_mode?: boolean;
  ticker?: string;
  health_check?: boolean;
}

interface DailyCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number; // Optional since /quote doesn't provide volume
}

// Rate limiting: 50 requests per minute
const RATE_LIMIT = 50;
const RATE_WINDOW = 60 * 1000; // 1 minute
let requestCount = 0;
let windowStart = Date.now();

async function rateLimitedDelay() {
  const now = Date.now();
  
  // Reset window if needed
  if (now - windowStart > RATE_WINDOW) {
    requestCount = 0;
    windowStart = now;
  }
  
  // Check if we need to wait
  if (requestCount >= RATE_LIMIT) {
    const waitTime = RATE_WINDOW - (now - windowStart);
    console.log(`⏱️ Rate limit reached, waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    requestCount = 0;
    windowStart = Date.now();
  }
  
  requestCount++;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 DAILY ENRICHMENT: Starting daily price data collection...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: EnrichmentRequest = await req.json().catch(() => ({}));
    const { 
      signal_id, 
      test_mode = false, 
      ticker: testTicker,
      health_check = false 
    } = requestData;
    
    // Handle health check requests
    if (health_check) {
      console.log('✅ HEALTH CHECK: Daily enrichment service is healthy');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Daily enrichment service is healthy',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle test mode - test Finnhub quote data
    if (test_mode) {
      // Use industry ticker instead of consumer stock for testing
      const testSymbol = testTicker || 'LMT';
      console.log(`🧪 TEST MODE: Testing Finnhub quote for ${testSymbol}`);
      
      try {
        const candle = await fetchFinnhubQuote(testSymbol);
        console.log(`✅ TEST SUCCESS: ${testSymbol} quote data:`, candle);
        return new Response(
          JSON.stringify({ 
            success: true, 
            quote_data: candle,
            ticker: testSymbol,
            message: 'Finnhub quote test successful',
            using_finnhub: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('❌ TEST MODE ERROR:', error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Finnhub quote test failed: ${error.message}`,
            ticker: testSymbol,
            using_finnhub: true,
            details: error.stack || 'No stack trace available'
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    if (!signal_id) {
      return new Response(
        JSON.stringify({ error: 'signal_id is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the signal to enrich
    const { data: signal, error: signalError } = await supabase
      .from('enriched_signals')
      .select('*')
      .eq('id', signal_id)
      .single();

    if (signalError || !signal) {
      console.error('Signal not found:', signalError);
      return new Response(
        JSON.stringify({ error: 'Signal not found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { ticker, signal_detected_at } = signal;
    const signalDate = new Date(signal_detected_at);
    console.log(`📊 ENRICHING: ${ticker} signal from ${signalDate.toDateString()}`);

    // Fetch current quote data for the ticker
    let dailyCandle: DailyCandle;
    try {
      dailyCandle = await fetchFinnhubQuote(ticker);
      console.log(`📈 QUOTE DATA: ${ticker}`, dailyCandle);
    } catch (quoteError) {
      console.error(`❌ Failed to get quote for ${ticker}:`, quoteError);
      
      // Extract error information for better tracking
      const errorType = (quoteError as any).errorType || 'UNKNOWN_ERROR';
      const retryable = (quoteError as any).retryable !== false; // Default to retryable
      
      // Update signal with enhanced error tracking
      await supabase
        .from('enriched_signals')
        .update({
          price_metadata_status: retryable ? 'failed' : 'permanently_failed',
          failure_reason: quoteError.message,
          retry_count: signal.retry_count ? signal.retry_count + 1 : 1,
          last_retry_at: new Date().toISOString()
        })
        .eq('id', signal_id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch quote for ${ticker}: ${quoteError.message}`,
          error_type: errorType,
          retryable: retryable,
          ticker,
          signal_id,
          using_finnhub: true
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Update signal with quote data
    const { error: updateError } = await supabase
      .from('enriched_signals')
      .update({
        price_open: dailyCandle.open,
        price_high: dailyCandle.high,
        price_low: dailyCandle.low,
        price_close: dailyCandle.close,
        price_volume: null, // Volume not available from /quote endpoint
        price_metadata_status: 'complete',
      })
      .eq('id', signal_id);

    if (updateError) {
      console.error('❌ Failed to update signal:', updateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to update signal: ${updateError.message}`,
          ticker,
          signal_id
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`✅ ENRICHMENT COMPLETE: ${ticker} updated with quote data`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Quote price enrichment completed successfully',
        signal_id,
        ticker,
        quote_data: dailyCandle,
        price_source: 'finnhub_quote',
        using_finnhub: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ ENRICHMENT ERROR:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Enrichment failed',
        details: error.stack || 'No stack trace available'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Enhanced Finnhub ticker validation and formatting
function validateAndFormatTicker(ticker: string): string {
  // Remove any whitespace and convert to uppercase
  const cleanTicker = ticker.trim().toUpperCase();
  
  // List of tickers that may need special handling for Finnhub
  const exchangeSuffixMap: Record<string, string> = {
    // Most US stocks work without suffix, but some may need .US
    // Add specific mappings here if needed based on API responses
  };
  
  // For now, return clean ticker as-is since most US stocks work without suffix
  return exchangeSuffixMap[cleanTicker] || cleanTicker;
}

// Smart date handling for market data
function getLastTradingDate(date: Date): Date {
  const targetDate = new Date(date);
  
  // If it's a weekend, go back to Friday
  const dayOfWeek = targetDate.getDay();
  if (dayOfWeek === 0) { // Sunday
    targetDate.setDate(targetDate.getDate() - 2);
  } else if (dayOfWeek === 6) { // Saturday
    targetDate.setDate(targetDate.getDate() - 1);
  }
  
  return targetDate;
}

// Enhanced error classification
function classifyError(error: any, ticker: string): { type: string; reason: string; retryable: boolean } {
  const errorMessage = error.message || error.toString();
  
  if (errorMessage.includes('401') || errorMessage.includes('403')) {
    return { type: 'AUTH_ERROR', reason: 'Finnhub API authentication failed', retryable: false };
  }
  
  if (errorMessage.includes('429')) {
    return { type: 'RATE_LIMIT', reason: 'Finnhub API rate limit exceeded', retryable: true };
  }
  
  if (errorMessage.includes('No quote data available') || errorMessage.includes('No quote data found')) {
    return { type: 'NO_DATA', reason: `No market data available for ${ticker}`, retryable: false };
  }
  
  if (errorMessage.includes('Invalid quote data')) {
    return { type: 'INVALID_DATA', reason: `Invalid price data received for ${ticker}`, retryable: false };
  }
  
  if (errorMessage.includes('FINNHUB_API_KEY not configured')) {
    return { type: 'CONFIG_ERROR', reason: 'Finnhub API key not configured', retryable: false };
  }
  
  // Network or temporary errors
  if (errorMessage.includes('timeout') || errorMessage.includes('ECONNRESET') || errorMessage.includes('500')) {
    return { type: 'NETWORK_ERROR', reason: 'Network or server error', retryable: true };
  }
  
  return { type: 'UNKNOWN_ERROR', reason: errorMessage, retryable: true };
}

// Fetch current quote data from Finnhub with enhanced error handling
async function fetchFinnhubQuote(symbol: string): Promise<DailyCandle> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second
  
  // Validate and format ticker
  const formattedSymbol = validateAndFormatTicker(symbol);
  console.log(`📊 Processing ticker: ${symbol} -> ${formattedSymbol}`);
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await rateLimitedDelay();
      
      const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY');
      if (!finnhubApiKey) {
        throw new Error('FINNHUB_API_KEY not configured');
      }

      // Use quote endpoint - no date parameters needed
      const url = `https://finnhub.io/api/v1/quote?symbol=${formattedSymbol}`;
      console.log(`🌐 Fetching quote for ${formattedSymbol}... (Attempt ${attempt + 1})`);
      
      const response = await fetch(`${url}&token=${finnhubApiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Supabase-Edge-Function/1.0'
        }
      });
      
      if (!response.ok) {
        let errorDetails = '';
        try {
          const errorBody = await response.text();
          errorDetails = errorBody;
          console.error(`❌ Finnhub error response (${response.status}):`, errorDetails);
        } catch (e) {
          errorDetails = 'Unable to read error response';
        }
        
        throw new Error(`Finnhub API error ${response.status}: ${errorDetails}`);
      }
      
      const data = await response.json();
      console.log(`✅ Finnhub quote response for ${formattedSymbol}:`, data);
      
      // Enhanced data validation for quote response
      if (!data.o && !data.h && !data.l && !data.c) {
        throw new Error(`No quote data available for ${formattedSymbol}`);
      }
      
      // Quote response has single values, not arrays
      if (typeof data.o !== 'number' || typeof data.h !== 'number' || 
          typeof data.l !== 'number' || typeof data.c !== 'number') {
        throw new Error(`Invalid quote response for ${formattedSymbol}: missing OHLC data`);
      }
      
      const quote: DailyCandle = {
        open: data.o,
        high: data.h,
        low: data.l,
        close: data.c,
        // Volume not available in quote endpoint
      };
      
      // Enhanced quote data validation
      if (!quote.open || !quote.high || !quote.low || !quote.close) {
        throw new Error(`Invalid quote data for ${formattedSymbol}: ${JSON.stringify(quote)}`);
      }
      
      // Sanity check: ensure high >= low and prices are reasonable
      if (quote.high < quote.low || quote.open <= 0 || quote.close <= 0) {
        throw new Error(`Invalid price data for ${formattedSymbol}: high=${quote.high}, low=${quote.low}, open=${quote.open}, close=${quote.close}`);
      }
      
      console.log(`✅ Valid quote data for ${formattedSymbol}: O=${quote.open}, H=${quote.high}, L=${quote.low}, C=${quote.close}`);
      return quote;
      
    } catch (error) {
      console.error(`❌ Error fetching quote for ${formattedSymbol} (attempt ${attempt + 1}):`, error);
      
      const errorInfo = classifyError(error, formattedSymbol);
      
      if (attempt === maxRetries - 1) {
        // Add error classification to the thrown error
        const enhancedError = new Error(`${errorInfo.reason} (${errorInfo.type})`);
        (enhancedError as any).errorType = errorInfo.type;
        (enhancedError as any).retryable = errorInfo.retryable;
        throw enhancedError;
      }
      
      // Only retry if the error is retryable
      if (!errorInfo.retryable) {
        const nonRetryableError = new Error(`${errorInfo.reason} (${errorInfo.type})`);
        (nonRetryableError as any).errorType = errorInfo.type;
        (nonRetryableError as any).retryable = false;
        throw nonRetryableError;
      }
      
      // Exponential backoff for retryable errors
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`⏱️ Retrying in ${delay}ms... (${errorInfo.type})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Max retries exceeded for ${formattedSymbol}`);
}