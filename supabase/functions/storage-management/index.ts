
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting storage management cleanup...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check current database size
    const { data: sizeData, error: sizeError } = await supabase
      .rpc('get_db_size');
    
    if (sizeError) {
      console.error('Error getting database size:', sizeError);
      throw sizeError;
    }

    const currentSizeGB = sizeData / (1024 * 1024 * 1024); // Convert to GB
    console.log(`Current database size: ${currentSizeGB.toFixed(2)} GB`);

    // If we're over 90GB, start cleanup (10GB buffer before the 100GB limit)
    if (currentSizeGB > 90) {
      console.log('Database size exceeds 90GB, starting cleanup...');
      
      // Cleanup strategy (in order of priority - least important first):
      
      // 1. Delete old messages for non-flagged tickers (older than 7 days)
      const { data: cleanupMessages, error: cleanupError1 } = await supabase
        .from('stocktwits_messages')
        .delete()
        .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .not('ticker', 'in', `(
          SELECT DISTINCT ticker FROM sentiment_alerts 
          WHERE created_at > NOW() - INTERVAL '30 days' AND active = true
        )`);

      if (cleanupError1) {
        console.error('Error cleaning up old messages:', cleanupError1);
      } else {
        console.log('Cleaned up old messages for non-flagged tickers');
      }

      // 2. Delete old ticker sentiment data for non-flagged tickers (older than 3 days)
      const { data: cleanupSentiment, error: cleanupError2 } = await supabase
        .from('ticker_sentiment')
        .delete()
        .lt('last_updated', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
        .not('ticker', 'in', `(
          SELECT DISTINCT ticker FROM sentiment_alerts 
          WHERE created_at > NOW() - INTERVAL '30 days' AND active = true
        )`);

      if (cleanupError2) {
        console.error('Error cleaning up old sentiment data:', cleanupError2);
      } else {
        console.log('Cleaned up old sentiment data for non-flagged tickers');
      }

      // 3. If still over limit, delete older flagged ticker data (older than 14 days)
      const { data: newSizeData, error: newSizeError } = await supabase
        .rpc('get_db_size');
      
      if (!newSizeError) {
        const newSizeGB = newSizeData / (1024 * 1024 * 1024);
        console.log(`Size after cleanup: ${newSizeGB.toFixed(2)} GB`);
        
        if (newSizeGB > 95) {
          console.log('Still over 95GB, cleaning flagged ticker data older than 14 days...');
          
          // Delete old messages for flagged tickers (older than 14 days)
          const { error: cleanupError3 } = await supabase
            .from('stocktwits_messages')
            .delete()
            .lt('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

          // Delete old sentiment data for flagged tickers (older than 7 days)
          const { error: cleanupError4 } = await supabase
            .from('ticker_sentiment')
            .delete()
            .lt('last_updated', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

          if (cleanupError3 || cleanupError4) {
            console.error('Error in final cleanup phase');
          } else {
            console.log('Completed final cleanup phase');
          }
        }
      }

      // 4. Clean up old inactive alerts (older than 7 days)
      const { error: cleanupError5 } = await supabase
        .from('sentiment_alerts')
        .delete()
        .eq('active', false)
        .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (cleanupError5) {
        console.error('Error cleaning up old alerts:', cleanupError5);
      } else {
        console.log('Cleaned up old inactive alerts');
      }

      // Final size check
      const { data: finalSizeData, error: finalSizeError } = await supabase
        .rpc('get_db_size');
      
      if (!finalSizeError) {
        const finalSizeGB = finalSizeData / (1024 * 1024 * 1024);
        console.log(`Final database size: ${finalSizeGB.toFixed(2)} GB`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Storage cleanup completed',
            initialSize: `${currentSizeGB.toFixed(2)} GB`,
            finalSize: `${finalSizeGB.toFixed(2)} GB`,
            spaceFreed: `${(currentSizeGB - finalSizeGB).toFixed(2)} GB`
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } else {
      console.log('Database size is within limits, no cleanup needed');
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Storage check completed - no cleanup needed',
        currentSize: `${currentSizeGB.toFixed(2)} GB`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('Error in storage management:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
