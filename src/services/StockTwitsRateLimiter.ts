import { supabase } from '@/integrations/supabase/client';

const MAX_REQUESTS_PER_HOUR = 200;

export async function enforceStockTwitsRateLimit(apiKey: string): Promise<void> {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from('stocktwits_api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('api_key', apiKey)
    .gte('created_at', windowStart);

  if (error) {
    console.error('Failed to query rate limit usage:', error);
    return;
  }

  const currentCount = count ?? 0;
  if (currentCount >= MAX_REQUESTS_PER_HOUR) {
    const { data } = await supabase
      .from('stocktwits_api_usage')
      .select('created_at')
      .eq('api_key', apiKey)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: true })
      .limit(1);

    const oldest = data && data.length > 0 ? new Date(data[0].created_at).getTime() : Date.now();
    const waitMs = 60 * 60 * 1000 - (Date.now() - oldest) + 1000;
    console.log(`⏳ StockTwits quota reached (${currentCount}/${MAX_REQUESTS_PER_HOUR}). Waiting ${Math.ceil(waitMs / 1000)}s`);
    await new Promise(res => setTimeout(res, waitMs));
  }

  await supabase.from('stocktwits_api_usage').insert({ api_key: apiKey });
  console.log(`📈 StockTwits usage for ${apiKey}: ${currentCount + 1}/${MAX_REQUESTS_PER_HOUR} in last hour`);

  await supabase
    .from('stocktwits_api_usage')
    .delete()
    .lt('created_at', windowStart);
}
