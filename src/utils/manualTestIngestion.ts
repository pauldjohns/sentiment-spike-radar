// Manual test of ingestion functions for debugging
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
}

export async function manualTestIngestion() {
  console.log('🧪 MANUAL INGESTION TEST START');
  
  try {
    // Test 1: Call fetch-stocktwits-data directly
    console.log('📡 Testing fetch-stocktwits-data function...');
    const fetchResponse = await fetch(`${SUPABASE_URL}/functions/v1/fetch-stocktwits-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        ticker_batch_size: 3,
        test_mode: true
      })
    });
    
    const fetchResult = await fetchResponse.json();
    console.log('📡 Fetch result:', fetchResult);
    
    if (!fetchResponse.ok) {
      console.error('❌ Fetch failed:', fetchResult);
      return;
    }
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 2: Call ingest-sentiment-data with proper auth
    console.log('🎯 Testing ingest-sentiment-data function...');
    const ingestResponse = await fetch(`${SUPABASE_URL}/functions/v1/ingest-sentiment-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        manual_override: true,
        test_mode: true
      })
    });
    
    const ingestResult = await ingestResponse.json();
    console.log('🎯 Ingest result:', ingestResult);
    
    if (!ingestResponse.ok) {
      console.error('❌ Ingest failed:', ingestResult);
      return;
    }
    
    // Test 3: Check database
    console.log('🔍 Checking database...');
    const { data: messages, error } = await supabase
      .from('stocktwits_messages_live')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Database check failed:', error);
    } else {
      console.log(`✅ Found ${messages?.length || 0} messages in database`);
      if (messages && messages.length > 0) {
        console.log('📋 Sample:', messages[0]);
      }
    }
    
  } catch (error) {
    console.error('❌ Manual test failed:', error);
  }
}

// Execute immediately for testing
if (typeof window !== 'undefined') {
  console.log('🚀 Ready to test ingestion');
}