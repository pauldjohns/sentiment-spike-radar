
import { useState, useCallback } from 'react';
import { SentimentData } from '@/types/sentiment';
import { useFetchSentimentData } from './useFetchSentimentData';
import { useTransformSentimentData } from './useTransformSentimentData';
import { INDUSTRY_FOCUS_TICKERS } from '@/data/industry_tickers';

export const useSentimentDataManager = () => {
  const [sentimentData, setSentimentData] = useState<Record<string, SentimentData>>({});
  const [signalLogs, setSignalLogs] = useState<any[]>([]);
  const [activeTickers, setActiveTickers] = useState<any[]>([]);
  
  const { fetchSentimentData, isAnalyzing } = useFetchSentimentData();
  const { transformTickerData } = useTransformSentimentData();

  const updateData = useCallback(async (
    isMarketOpen: boolean,
    watchlistTickers: string[],
    onSuccess: () => void,
    onError: () => void
  ) => {
    if (!isMarketOpen || watchlistTickers.length === 0) {
      setSentimentData({});
      setSignalLogs([]);
      setActiveTickers([]);
      return;
    }

    try {
      const data = await fetchSentimentData(isMarketOpen);
      
      if (data && typeof data === 'object') {
        // Filter all data to watchlist scope
        const filteredSentimentData = Array.isArray(data.sentimentData) ? 
          data.sentimentData.filter(ticker => watchlistTickers.includes(ticker.ticker)) : [];
        const filteredSignalLogs = Array.isArray(data.signalLogs) ? 
          data.signalLogs.filter(signal => watchlistTickers.includes(signal.ticker)) : [];
        const filteredActiveTickers = Array.isArray(data.activeTickers) ? 
          data.activeTickers.filter(ticker => watchlistTickers.includes(ticker.ticker)) : [];
        
        // Transform and set data
        const indexedSentimentData = transformTickerData(filteredSentimentData) || {};
        setSentimentData(indexedSentimentData);
        setSignalLogs(filteredSignalLogs);
        setActiveTickers(filteredActiveTickers);
        
        onSuccess();
        console.log(`✅ DATA UPDATE: ${Object.keys(indexedSentimentData).length} tickers processed`);
      }
    } catch (error) {
      console.error('❌ DATA UPDATE FAILED:', error);
      onError();
    }
  }, [fetchSentimentData, transformTickerData]);

  return {
    sentimentData,
    signalLogs,
    activeTickers,
    isAnalyzing,
    updateData
  };
};
