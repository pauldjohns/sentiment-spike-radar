import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface IndustryTicker {
  symbol: string;
  sector: string | null;
}

export const useIndustryMetadata = () => {
  const [industryData, setIndustryData] = useState<IndustryTicker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIndustryData = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('industry_tickers')
          .select('symbol, sector');

        if (error) throw error;

        setIndustryData(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch industry data');
        console.error('Error fetching industry metadata:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIndustryData();
  }, []);

  // Create ticker to industry mapping
  const tickerIndustryMap = useMemo(() => {
    return Object.fromEntries(
      industryData.map(({ symbol, sector }) => [symbol, sector || 'Unknown'])
    );
  }, [industryData]);

  // Get unique industries for filter dropdown
  const uniqueIndustries = useMemo(() => {
    const industries = industryData
      .map(t => t.sector)
      .filter(Boolean)
      .filter((sector, index, array) => array.indexOf(sector) === index);
    
    return industries.sort();
  }, [industryData]);

  return {
    industryData,
    tickerIndustryMap,
    uniqueIndustries,
    isLoading,
    error
  };
};