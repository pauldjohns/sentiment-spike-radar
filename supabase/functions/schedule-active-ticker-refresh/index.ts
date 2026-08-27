import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date().toISOString();

    const { data: tickers, error: tickerError } = await supabase
      .from('industry_tickers')
      .select('symbol');

    if (tickerError) throw tickerError;

    const seedTickers = (tickers ?? []).map(({ symbol }) => ({
      ticker: symbol,
      entry_reason: 'industry_seed',
      priority_score: 1,
      status: 'active',
      entry_timestamp: now,
      last_activity: now,
    }));

    if (seedTickers.length > 0) {
      const { error: upsertError } = await supabase
        .from('active_ticker_queue')
        .upsert(seedTickers, { onConflict: 'ticker' });
      if (upsertError) throw upsertError;
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: signals, error: signalsError } = await supabase
      .from('signal_logs')
      .select('ticker, anomaly_score')
      .gte('signal_timestamp', oneDayAgo);

    if (signalsError) throw signalsError;

    const scoreMap: Record<string, { total: number; count: number }> = {};
    for (const s of signals ?? []) {
      if (!scoreMap[s.ticker]) {
        scoreMap[s.ticker] = { total: 0, count: 0 };
      }
      scoreMap[s.ticker].total += Number(s.anomaly_score) || 0;
      scoreMap[s.ticker].count += 1;
    }

    for (const [ticker, info] of Object.entries(scoreMap)) {
      const avgScore = info.total / info.count;
      await supabase
        .from('active_ticker_queue')
        .update({ priority_score: avgScore, last_activity: now })
        .eq('ticker', ticker);
    }

    const staleThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('active_ticker_queue')
      .update({ status: 'removed', removal_reason: 'stale', updated_at: now })
      .lt('last_activity', staleThreshold);

    return new Response(
      JSON.stringify({
        success: true,
        seed_count: seedTickers.length,
        priority_updates: Object.keys(scoreMap).length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Active ticker refresh error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

