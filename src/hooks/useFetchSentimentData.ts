
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SentimentData, Alert, WatchlistStock, AlertConfig } from '@/types/sentiment';
import { useToast } from '@/hooks/use-toast';
import { INDUSTRY_FOCUS_TICKERS } from '@/data/industry_tickers';

export const useFetchSentimentData = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const validateIndustryScope = (ticker: string): boolean => {
    const isValid = INDUSTRY_FOCUS_TICKERS.includes(ticker.toUpperCase() as any);
    
    if (!isValid) {
      console.warn(`🚨 SCOPE VIOLATION: ${ticker} not in industry focus list - filtering out`);
    }
    
    return isValid;
  };

  const filterIndustryData = <T extends { ticker: string }>(data: T[]): T[] => {
    const filtered = data.filter(item => validateIndustryScope(item.ticker));
    const filteredCount = data.length - filtered.length;
    
    if (filteredCount > 0) {
      console.warn(`🚨 SCOPE ENFORCEMENT: Filtered out ${filteredCount} non-industry tickers from data`);
    }
    
    return filtered;
  };

  const fetchSentimentData = async (isMarketOpen: boolean) => {
    if (!isMarketOpen) return { sentimentData: {}, alerts: [], signalLogs: [], activeTickers: [] };
    
    setIsAnalyzing(true);
    
    try {
      console.log('📊 Fetching INDUSTRY-SCOPED sentiment data from Supabase...');
      console.log(`🎯 QUERY RESTRICTION: Limiting to ${INDUSTRY_FOCUS_TICKERS.length} industry tickers only`);
      
      // ✅ CRITICAL FIX: Restrict ticker sentiment query to industry list only
      const { data: tickerData, error: tickerError } = await supabase
        .from('ticker_sentiment')
        .select('*')
        .in('ticker', INDUSTRY_FOCUS_TICKERS)
        .order('last_updated', { ascending: false });

      if (tickerError) {
        console.error('Error fetching ticker sentiment:', tickerError);
        return { sentimentData: {}, alerts: [], signalLogs: [], activeTickers: [] };
      }

      console.log(`✅ QUERY SUCCESS: Retrieved ${tickerData?.length || 0} industry ticker records from database`);

      // ✅ CRITICAL FIX: Restrict alerts query to industry list only
      const { data: alertsData, error: alertsError } = await supabase
        .from('sentiment_alerts')
        .select('*')
        .in('ticker', INDUSTRY_FOCUS_TICKERS)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (alertsError) {
        console.error('Error fetching alerts:', alertsError);
        return { sentimentData: {}, alerts: [], signalLogs: [], activeTickers: [] };
      }

      console.log(`✅ ALERTS SUCCESS: Retrieved ${alertsData?.length || 0} industry alert records`);

      // ✅ CRITICAL FIX: Restrict signal logs query to industry list only
      const { data: signalLogsData, error: signalLogsError } = await supabase
        .from('signal_logs')
        .select('*')
        .in('ticker', INDUSTRY_FOCUS_TICKERS)
        .order('signal_timestamp', { ascending: false })
        .limit(100);

      if (signalLogsError) {
        console.error('Error fetching signal logs:', signalLogsError);
      }

      console.log(`✅ SIGNALS SUCCESS: Retrieved ${signalLogsData?.length || 0} industry signal records`);

      // ✅ CRITICAL FIX: Restrict active tickers query to industry list only
      const { data: activeTickersData, error: activeTickersError } = await supabase
        .from('active_ticker_queue')
        .select('*')
        .in('ticker', INDUSTRY_FOCUS_TICKERS)
        .eq('status', 'active')
        .order('priority_score', { ascending: false });

      if (activeTickersError) {
        console.error('Error fetching active tickers:', activeTickersError);
      }

      console.log(`✅ ACTIVE TICKERS SUCCESS: Retrieved ${activeTickersData?.length || 0} industry active ticker records`);

      // ✅ NO ADDITIONAL FILTERING NEEDED - queries are already scoped to industry list
      return {
        sentimentData: tickerData || [],
        alerts: alertsData || [],
        signalLogs: signalLogsData || [],
        activeTickers: activeTickersData || []
      };
      
    } catch (error) {
      console.error('Error fetching industry sentiment data:', error);
      toast({
        title: "Data Fetch Error",
        description: "Failed to load industry sentiment data from database",
        variant: "destructive",
      });
      return { sentimentData: {}, alerts: [], signalLogs: [], activeTickers: [] };
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { fetchSentimentData, isAnalyzing };
};
