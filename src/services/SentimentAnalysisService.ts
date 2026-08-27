
// Real sentiment analysis service using HuggingFace FinALBERT - optimized for Stocktwits content
export { RealSentimentAnalysisService as SentimentAnalysisService } from './RealSentimentAnalysisService';
export type { SentimentResult } from './RealSentimentAnalysisService';

// Legacy compatibility
export class LegacySentimentAnalysisService {
  static async analyzeSentiment(message: string): Promise<'bullish' | 'bearish' | 'neutral'> {
    const { RealSentimentAnalysisService } = await import('./RealSentimentAnalysisService');
    const result = await RealSentimentAnalysisService.analyzeSentiment(message);
    return result.label;
  }
}
