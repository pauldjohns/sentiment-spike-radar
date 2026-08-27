import { supabase } from '@/integrations/supabase/client';

export interface SentimentHealthMetrics {
  totalMessages: number;
  labeledMessages: number;
  unlabeledMessages: number;
  labelingPercentage: number;
  recentMessages24h: number;
  recentLabeled24h: number;
  recent24hLabelingRate: number;
  failedInferenceCount: number;
  fallbackUsageCount: number;
  modelEndpointStatus: 'healthy' | 'degraded' | 'failed' | 'unknown';
  recommendedActions: string[];
}

export class SentimentHealthMonitor {
  static async getDetailedMetrics(): Promise<SentimentHealthMetrics> {
    try {
      // Get overall statistics
      const { data: overallStats } = await supabase
        .from('stocktwits_messages_live')
        .select('sentiment_label, created_at')
        .order('created_at', { ascending: false });

      const totalMessages = overallStats?.length || 0;
      const labeledMessages = overallStats?.filter(m => m.sentiment_label).length || 0;
      const unlabeledMessages = totalMessages - labeledMessages;
      const labelingPercentage = totalMessages > 0 ? (labeledMessages / totalMessages) * 100 : 0;

      // Get recent 24h statistics
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentStats } = await supabase
        .from('stocktwits_messages_live')
        .select('sentiment_label, created_at')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

      const recentMessages24h = recentStats?.length || 0;
      const recentLabeled24h = recentStats?.filter(m => m.sentiment_label).length || 0;
      const recent24hLabelingRate = recentMessages24h > 0 ? (recentLabeled24h / recentMessages24h) * 100 : 0;

      // Check for audit log entries to understand failure patterns
      const { data: auditStats } = await supabase
        .from('sentiment_model_audit_log')
        .select('model_version, predicted_sentiment, confidence_score, created_at')
        .gte('created_at', twentyFourHoursAgo);

      const modelUsageStats = auditStats?.length || 0;
      
      // Estimate failed inference count (messages without sentiment labels in recent data)
      const failedInferenceCount = recentMessages24h - recentLabeled24h;
      
      // Estimate fallback usage (low confidence scores typically indicate rule-based fallbacks)
      const fallbackUsageCount = auditStats?.filter(log => log.confidence_score < 0.6).length || 0;

      // Determine model endpoint status
      let modelEndpointStatus: 'healthy' | 'degraded' | 'failed' | 'unknown' = 'unknown';
      
      if (recent24hLabelingRate >= 85) {
        modelEndpointStatus = 'healthy';
      } else if (recent24hLabelingRate >= 60) {
        modelEndpointStatus = 'degraded';
      } else if (recent24hLabelingRate < 60) {
        modelEndpointStatus = 'failed';
      }

      // Generate recommended actions
      const recommendedActions: string[] = [];
      
      if (labelingPercentage < 70) {
        recommendedActions.push('Investigate FinALBERT API connectivity and rate limits');
        recommendedActions.push('Check HUGGINGFACE_API_KEY configuration and permissions');
        recommendedActions.push('Review edge function logs for error patterns');
      }
      
      if (failedInferenceCount > recentMessages24h * 0.3) {
        recommendedActions.push('High inference failure rate detected - check HuggingFace service status');
        recommendedActions.push('Consider implementing retry logic with exponential backoff');
      }
      
      if (fallbackUsageCount > modelUsageStats * 0.4) {
        recommendedActions.push('Excessive fallback to rule-based analysis - verify FinALBERT model availability');
        recommendedActions.push('Check if model is experiencing temporary outages');
      }
      
      if (recent24hLabelingRate < 50) {
        recommendedActions.push('CRITICAL: Recent labeling rate extremely low - manual intervention required');
        recommendedActions.push('Consider switching to backup sentiment analysis model temporarily');
      }

      if (recommendedActions.length === 0) {
        recommendedActions.push('System is performing within acceptable parameters');
      }

      return {
        totalMessages,
        labeledMessages,
        unlabeledMessages,
        labelingPercentage,
        recentMessages24h,
        recentLabeled24h,
        recent24hLabelingRate,
        failedInferenceCount,
        fallbackUsageCount,
        modelEndpointStatus,
        recommendedActions
      };

    } catch (error) {
      console.error('Error getting sentiment health metrics:', error);
      throw new Error(`Failed to get sentiment health metrics: ${error.message}`);
    }
  }

  static async logSentimentAlert(metrics: SentimentHealthMetrics): Promise<void> {
    try {
      if (metrics.labelingPercentage < 70) {
        const { error } = await supabase
          .from('sentiment_alerts')
          .insert({
            alert_type: 'low_labeling_rate',
            ticker: 'SYSTEM',
            message: `Sentiment labeling rate dropped to ${metrics.labelingPercentage.toFixed(1)}%. Recent 24h rate: ${metrics.recent24hLabelingRate.toFixed(1)}%`,
            confidence: metrics.modelEndpointStatus,
            z_score: metrics.labelingPercentage,
            active: true
          });

        if (error) {
          console.error('Failed to log sentiment alert:', error);
        }
      }
    } catch (error) {
      console.error('Error logging sentiment alert:', error);
    }
  }

  static async testFinALBERTEndpoint(): Promise<{ success: boolean; details: string }> {
    try {
      // Test the FinALBERT endpoint directly through our sentiment service
      const { RealSentimentAnalysisService } = await import('./RealSentimentAnalysisService');
      
      const testMessage = "Tesla stock is looking bullish today with strong volume";
      const result = await RealSentimentAnalysisService.analyzeSentiment(testMessage);
      
      if (result.confidence > 0.5 && result.modelVersion === 'FinALBERT') {
        return {
          success: true,
          details: `FinALBERT endpoint is responding. Test result: ${result.label} (${result.confidence.toFixed(2)} confidence)`
        };
      } else {
        return {
          success: false,
          details: `FinALBERT endpoint returned low confidence result: ${result.label} (${result.confidence.toFixed(2)} confidence)`
        };
      }
    } catch (error) {
      return {
        success: false,
        details: `FinALBERT endpoint test failed: ${error.message}`
      };
    }
  }
}