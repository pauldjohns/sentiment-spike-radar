
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting: 60 requests per minute for Finnhub free tier
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const windowStart = Math.floor(now / 60000) * 60000; // 1-minute window
  
  if (!rateLimiter.has(clientId)) {
    rateLimiter.set(clientId, { count: 1, resetTime: windowStart + 60000 });
    return true;
  }
  
  const client = rateLimiter.get(clientId)!;
  
  // Reset if we're in a new window
  if (now >= client.resetTime) {
    client.count = 1;
    client.resetTime = windowStart + 60000;
    return true;
  }
  
  // Check if under limit (50 requests per minute to leave buffer)
  if (client.count >= 50) {
    return false;
  }
  
  client.count++;
  return true;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const ticker = url.searchParams.get('ticker')
    
    if (!ticker) {
      return new Response(
        JSON.stringify({ error: 'Ticker parameter is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Rate limiting check
    const clientId = req.headers.get('x-forwarded-for') || 'default';
    if (!checkRateLimit(clientId)) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Maximum 50 requests per minute.',
          retry_after: Math.ceil((rateLimiter.get(clientId)?.resetTime || Date.now()) - Date.now()) / 1000
        }),
        { 
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '60'
          }
        }
      )
    }

    // Get Finnhub API key from environment
    const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY')
    if (!finnhubApiKey) {
      console.error('❌ FINNHUB_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Finnhub API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`📊 Fetching price for ${ticker} from Finnhub...`)
    console.log(`🔑 API Key configured: ${finnhubApiKey ? 'YES' : 'NO'}`)

    // Fetch current price from Finnhub using X-Finnhub-Token header
    const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${ticker}`
    console.log(`🌐 Finnhub URL: ${finnhubUrl}`)
    
    const response = await fetch(finnhubUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Finnhub-Token': finnhubApiKey,
        'User-Agent': 'Supabase-Edge-Function/1.0'
      }
    })
    
    console.log(`📡 Finnhub response status: ${response.status}`)
    
    if (!response.ok) {
      console.error(`❌ Finnhub API error: ${response.status} ${response.statusText}`)
      
      let errorDetails = '';
      try {
        const errorBody = await response.text();
        errorDetails = errorBody;
        console.error(`❌ Finnhub error response: ${errorDetails}`);
      } catch (e) {
        errorDetails = 'Unable to read error response';
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Finnhub API error: ${response.status}`,
          details: errorDetails,
          ticker,
          api_key_present: !!finnhubApiKey
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const data = await response.json()
    console.log(`📈 Finnhub response for ${ticker}:`, data)

    // Finnhub returns: { c: current_price, h: high, l: low, o: open, pc: previous_close, t: timestamp }
    const currentPrice = data.c
    
    if (!currentPrice || currentPrice <= 0) {
      console.error(`❌ Invalid price data for ${ticker}:`, data)
      return new Response(
        JSON.stringify({ 
          error: `Invalid or missing price data for ${ticker}`,
          ticker,
          raw_data: data,
          api_key_present: !!finnhubApiKey
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const result = {
      ticker: ticker.toUpperCase(),
      price: currentPrice,
      timestamp: new Date().toISOString(),
      source: 'finnhub',
      market_data: {
        current: data.c,
        high: data.h,
        low: data.l,
        open: data.o,
        previous_close: data.pc,
        change: data.c - data.pc,
        change_percent: ((data.c - data.pc) / data.pc) * 100
      }
    }

    console.log(`✅ Successfully fetched ${ticker} price: $${currentPrice}`)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Finnhub service error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
        stack: error.stack || 'No stack trace available'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
