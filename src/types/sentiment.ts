
export interface SentimentData {
  ticker: string;
  bullish: number;
  bearish: number;
  neutral: number;
  totalMessages: number;
  volumeMultiplier: number;
  lastUpdate: Date;
  lastChecked?: Date; // New field to track when ticker was last processed
  alerts: string[];
  
  // Enhanced analysis fields
  volumeZScore?: number;
  sentimentShift?: number;
  pumpRiskScore?: number;
  timeOfDayWeight?: number;
  polarityShiftDetected?: boolean;
  userDiversity?: number;
  confidenceBand?: 'high' | 'medium' | 'low';
}

export interface Alert {
  id: string;
  ticker: string;
  type: 'volume_spike' | 'sentiment_spike' | 'anomaly' | 'price_movement';
  message: string;
  timestamp: Date;
  active: boolean;
  confidence: 'high' | 'medium' | 'low';
  zScore?: number;
}

export interface WatchlistStock {
  ticker: string;
  enabled: boolean;
}

export interface AlertConfig {
  volumeSpike: number;
  sentimentThreshold: number;
  timeWindow: number;
  enableNotifications: boolean;
  
  // Enhanced configuration options
  volumeZScoreThreshold: number;
  sentimentShiftThreshold: number;
  pumpRiskThreshold: number;
  minUserDiversity: number;
  enableTimeWeighting: boolean;
  enablePolarityDetection: boolean;
}

// Add missing type exports
export interface StockTwitsMessage {
  id: string;
  ticker: string;
  message: string;
  timestamp: Date;
  userId?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
}

export interface VolumeHistory {
  ticker: string;
  timestamps: Date[];
  messageCounts: number[];
  sentimentHistory: Array<{
    bullish: number;
    bearish: number;
    neutral: number;
  }>;
}
