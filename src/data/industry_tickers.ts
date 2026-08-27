
// ✅ DEPRECATED: This file is now deprecated in favor of the dynamic database table 'industry_tickers'
// This static export remains only for backward compatibility and type definitions
// All production code should query the database table instead of using this static list

import { supabase } from '@/integrations/supabase/client';

// Curated list maintained for type definitions and emergency fallback only
export const INDUSTRY_FOCUS_TICKERS = [
  // This list is kept for TypeScript types but should NOT be used in production
  // Use supabase.from('industry_tickers').select('symbol') instead
  'LMT', 'RTX', 'BA', 'NOC', 'GD' // Minimal list for type inference
] as const;

export type IndustryTicker = string; // Changed to allow dynamic tickers

// Sector categorization for reporting
export const SECTOR_CATEGORIES = {
  DEFENSE_AEROSPACE: 'Defense & Aerospace',
  ENERGY_RENEWABLES: 'Energy & Renewables', 
  BIOTECH_PHARMA: 'Biotech & Pharma'
} as const;

// ✅ DYNAMIC: Get ticker count from database
export const getTickerCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('industry_tickers')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Failed to get ticker count from database:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Error getting ticker count:', error);
    return 0;
  }
};

// ✅ DYNAMIC: Validate ticker against database
export const isValidIndustryTicker = async (ticker: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('industry_tickers')
      .select('symbol')
      .eq('symbol', ticker.toUpperCase())
      .limit(1);
    
    if (error) {
      console.error('Failed to validate ticker:', error);
      return false;
    }
    
    return !!(data && data.length > 0);
  } catch (error) {
    console.error('Error validating ticker:', error);
    return false;
  }
};

// ✅ DYNAMIC: Get all tickers from database
export const getAllIndustryTickers = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('industry_tickers')
      .select('symbol')
      .order('symbol');
    
    if (error) {
      console.error('Failed to load tickers from database:', error);
      return [];
    }
    
    return data.map(t => t.symbol);
  } catch (error) {
    console.error('Error loading tickers:', error);
    return [];
  }
};

// Migration helper - log that this file should not be used for production data
if (import.meta.env.DEV) {
  console.warn(
    '⚠️ DEPRECATED: industry_tickers.ts static list should not be used. Use database queries instead.'
  );
  console.log(
    '✅ Use: supabase.from("industry_tickers").select("symbol") for production ticker lists'
  );
}
