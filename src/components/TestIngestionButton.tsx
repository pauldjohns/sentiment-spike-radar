import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, PlayCircle, CheckCircle, XCircle } from 'lucide-react';

export const TestIngestionButton = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runIngestionTest = async () => {
    setIsRunning(true);
    setResults(null);
    
    try {
      console.log('🧪 Testing ingestion pipeline...');
      
      // Step 1: Test StockTwits data fetching
      console.log('📡 Step 1: Testing StockTwits data fetching...');
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
        throw new Error(`StockTwits fetch failed: ${fetchError.message}`);
      }

      // Wait for data to be stored
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 2: Test sentiment ingestion pipeline
      console.log('🎯 Step 2: Testing sentiment ingestion pipeline...');
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
        throw new Error(`Sentiment ingestion failed: ${ingestError.message}`);
      }

      // Step 3: Check database for new messages
      console.log('🔍 Step 3: Checking database for new messages...');
      const { data: messages, error: dbError } = await supabase
        .from('stocktwits_messages_live')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (dbError) {
        throw new Error(`Database check failed: ${dbError.message}`);
      }

      setResults({
        success: true,
        fetchResult,
        ingestResult,
        messageCount: messages?.length || 0,
        sampleMessages: messages?.slice(0, 3) || []
      });
      
      setLastRun(new Date());
      console.log('✅ Ingestion test completed successfully');

    } catch (error) {
      console.error('❌ Ingestion test failed:', error);
      setResults({
        success: false,
        error: error.message
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="p-6 bg-slate-800 border-slate-600">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <PlayCircle className="h-6 w-6 text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Test Ingestion Pipeline</h3>
            <p className="text-sm text-slate-400">
              Manually test StockTwits data fetching and sentiment analysis
            </p>
          </div>
        </div>
        
        <Button 
          onClick={runIngestionTest} 
          disabled={isRunning}
          className="flex items-center space-x-2"
        >
          {isRunning ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="h-4 w-4" />
          )}
          <span>{isRunning ? 'Testing...' : 'Run Test'}</span>
        </Button>
      </div>

      {results && (
        <div className="space-y-4">
          {/* Status */}
          <div className={`p-4 rounded-lg border-2 ${
            results.success 
              ? 'bg-green-900/20 border-green-500/50' 
              : 'bg-red-900/20 border-red-500/50'
          }`}>
            <div className="flex items-center space-x-3">
              {results.success ? (
                <CheckCircle className="h-6 w-6 text-green-400" />
              ) : (
                <XCircle className="h-6 w-6 text-red-400" />
              )}
              <div>
                <div className={`font-semibold ${results.success ? 'text-green-400' : 'text-red-400'}`}>
                  {results.success ? '✅ INGESTION TEST PASSED' : '❌ INGESTION TEST FAILED'}
                </div>
                {!results.success && (
                  <div className="text-sm text-slate-400 mt-1">
                    Error: {results.error}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results */}
          {results.success && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-700 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {results.fetchResult?.messages_stored || 0}
                  </div>
                  <div className="text-sm text-slate-400">Messages Stored</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {results.ingestResult?.signals_generated || 0}
                  </div>
                  <div className="text-sm text-slate-400">Signals Generated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {results.messageCount}
                  </div>
                  <div className="text-sm text-slate-400">Total Messages</div>
                </div>
              </div>

              {/* Sample Messages */}
              {results.sampleMessages.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-md font-medium text-white">Recent Messages</h4>
                  {results.sampleMessages.map((msg: any, index: number) => (
                    <div key={index} className="p-3 bg-slate-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white">{msg.ticker}</span>
                        <Badge variant={
                          msg.sentiment_label === 'bullish' ? 'default' :
                          msg.sentiment_label === 'bearish' ? 'destructive' : 'secondary'
                        }>
                          {msg.sentiment_label} ({msg.sentiment_confidence?.toFixed(2)})
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-300">
                        {msg.body?.substring(0, 100)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {lastRun && (
            <div className="text-xs text-slate-500 text-center">
              Last run: {lastRun.toLocaleString()}
            </div>
          )}
        </div>
      )}

      {!results && !isRunning && (
        <div className="text-center py-8 text-slate-400">
          <PlayCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Click "Run Test" to test the ingestion pipeline</p>
        </div>
      )}
    </Card>
  );
};