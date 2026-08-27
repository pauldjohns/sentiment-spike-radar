// Test script to manually trigger ingestion pipeline
import { supabase } from '@/integrations/supabase/client';

export async function testIngestionPipeline(): Promise<void> {
  console.log('🧪 Testing ingestion pipeline...');
  
  try {
    // Test fetch-stocktwits-data function first
    console.log('📡 Testing StockTwits data fetching...');
    const { data: fetchResult, error: fetchError } = await supabase.functions.invoke(
      'fetch-stocktwits-data',
      {
        body: { 
          ticker_batch_size: 3,
          test_mode: true
        }
      }
    );

    if (fetchError) {
      console.error('❌ StockTwits fetch failed:', fetchError);
      return;
    }

    console.log('✅ StockTwits fetch result:', fetchResult);

    // Wait a moment for data to be stored
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test ingest-sentiment-data function
    console.log('🎯 Testing sentiment ingestion pipeline...');
    const { data: ingestResult, error: ingestError } = await supabase.functions.invoke(
      'ingest-sentiment-data',
      {
        body: { 
          manual_override: true,
          test_mode: true
        }
      }
    );

    if (ingestError) {
      console.error('❌ Sentiment ingestion failed:', ingestError);
      return;
    }

    console.log('✅ Sentiment ingestion result:', ingestResult);

    // Check data in database
    console.log('🔍 Checking database for new messages...');
    const { data: messages, error: dbError } = await supabase
      .from('stocktwits_messages_live')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (dbError) {
      console.error('❌ Database check failed:', dbError);
      return;
    }

    console.log(`✅ Found ${messages?.length || 0} recent messages in database`);
    if (messages && messages.length > 0) {
      console.log('📋 Sample message:', {
        ticker: messages[0].ticker,
        body: messages[0].body?.substring(0, 50) + '...',
        sentiment_label: messages[0].sentiment_label,
        sentiment_confidence: messages[0].sentiment_confidence,
        created_at: messages[0].created_at_stocktwits
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}