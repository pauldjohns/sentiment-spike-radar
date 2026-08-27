import { supabase } from '@/integrations/supabase/client';

export interface TickerScore {
  ticker: string;
  signal_score: number;
  adjusted_score: number;
  recency_penalty: number;
  sector_penalty: number;
  feedback_penalty: number;
  anomaly_score: number;
  volume_ratio: number;
  sentiment_spike_score: number;
  user_growth: number;
  message_volume?: number;
  sector?: string;
  last_selected_date?: string;
}

export interface DiversitySelectionResult {
  selectedTickers: TickerScore[];
  totalCandidates: number;
  maxSignalScore: number;
  minSelectedScore: number;
  rejectedDueToRecency: string[];
  fallbackUsed: boolean;
  finalTickers: string[];
  diversityMetrics: {
    sectorDistribution: Record<string, number>;
    averageRecencyDays: number;
    scoreRange: { min: number; max: number };
  };
}

export class TickerDiversityScorer {
  private static readonly SCORE_WEIGHTS = {
    sentiment_spike: 0.4,
    volume_ratio: 0.3,
    user_growth: 0.2,
    anomaly_score: 0.1
  };

  private static readonly RECENCY_PENALTY_DAYS = parseInt(process.env.RECENCY_PENALTY_DAYS || '7');
  private static readonly RECENCY_PENALTY_FACTOR = 0.1;
  private static readonly SECTOR_PENALTY = 0.2;
  private static readonly MAX_PER_SECTOR = 3;
  private static readonly FEEDBACK_PENALTY_FACTOR = 2;

  /**
   * Calculate composite signal score for a ticker
   */
  static calculateSignalScore(data: {
    sentiment_spike_score?: number;
    volume_ratio?: number;
    user_growth?: number;
    anomaly_score?: number;
  }): number {
    const {
      sentiment_spike_score = 0,
      volume_ratio = 1,
      user_growth = 0,
      anomaly_score = 0
    } = data;

    // Normalize values to 0-100 scale
    const normalizedSentiment = Math.min(Math.abs(sentiment_spike_score), 100);
    const normalizedVolume = Math.min(volume_ratio * 25, 100); // 4x volume = 100 points
    const normalizedUserGrowth = Math.min(user_growth * 10, 100);
    const normalizedAnomaly = Math.min(anomaly_score, 100);

    return (
      this.SCORE_WEIGHTS.sentiment_spike * normalizedSentiment +
      this.SCORE_WEIGHTS.volume_ratio * normalizedVolume +
      this.SCORE_WEIGHTS.user_growth * normalizedUserGrowth +
      this.SCORE_WEIGHTS.anomaly_score * normalizedAnomaly
    );
  }

  /**
   * Calculate recency penalty based on last selection
   */
  static calculateRecencyPenalty(lastSelectedDate?: string): number {
    if (!lastSelectedDate) return 0;

    const now = new Date();
    const lastSelected = new Date(lastSelectedDate);
    const daysSince = Math.floor((now.getTime() - lastSelected.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince >= this.RECENCY_PENALTY_DAYS) return 0;

    return (this.RECENCY_PENALTY_DAYS - daysSince) * this.RECENCY_PENALTY_FACTOR;
  }

  /**
   * Check if sector cap is exceeded
   */
  static calculateSectorPenalty(
    ticker: string,
    sector: string | undefined,
    currentSelections: TickerScore[]
  ): number {
    if (!sector) return 0;

    const sectorCount = currentSelections.filter(t => t.sector === sector).length;
    return sectorCount >= this.MAX_PER_SECTOR ? this.SECTOR_PENALTY : 0;
  }

  /**
   * Get last selection dates for tickers from enriched_signals
   */
  static async getLastSelectionDates(tickers: string[]): Promise<Record<string, string>> {
    try {
      const { data, error } = await supabase
        .from('enriched_signals')
        .select('ticker, signal_detected_at')
        .in('ticker', tickers)
        .gte('signal_detected_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('signal_detected_at', { ascending: false });

      if (error) {
        console.error('Error fetching last selection dates:', error);
        return {};
      }

      // Get most recent date per ticker
      const lastDates: Record<string, string> = {};
      data?.forEach(signal => {
        if (!lastDates[signal.ticker]) {
          lastDates[signal.ticker] = signal.signal_detected_at;
        }
      });

      return lastDates;
    } catch (error) {
      console.error('Error in getLastSelectionDates:', error);
      return {};
    }
  }

  /**
   * Get sector mapping for tickers
   */
  static async getSectorMapping(tickers: string[]): Promise<Record<string, string>> {
    try {
      const { data, error } = await supabase
        .from('industry_tickers')
        .select('symbol, sector')
        .in('symbol', tickers);

      if (error) {
        console.error('Error fetching sector mapping:', error);
        return {};
      }

      const sectorMap: Record<string, string> = {};
      data?.forEach(ticker => {
        if (ticker.sector) {
          sectorMap[ticker.symbol] = ticker.sector;
        }
      });

      return sectorMap;
    } catch (error) {
      console.error('Error in getSectorMapping:', error);
      return {};
    }
  }

  /**
   * Get count of recent failed signals for each ticker
   */
  static async getNegativeFeedbackCounts(tickers: string[]): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('enriched_signals')
        .select('ticker')
        .in('ticker', tickers)
        .eq('evaluation_status', 'complete')
        .eq('success_eod', false)
        .gte(
          'signal_detected_at',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        );

      if (error) {
        console.error('Error fetching negative feedback:', error);
        return {};
      }

      const counts: Record<string, number> = {};
      data?.forEach(row => {
        counts[row.ticker] = (counts[row.ticker] || 0) + 1;
      });

      return counts;
    } catch (error) {
      console.error('Error in getNegativeFeedbackCounts:', error);
      return {};
    }
  }

  /**
   * Score and select diverse set of tickers
   */
  static async scoreAndSelectTickers(
    candidateData: Array<{
      ticker: string;
      sentiment_spike_score?: number;
      volume_ratio?: number;
      user_growth?: number;
      anomaly_score?: number;
      message_volume?: number;
    }>,
    targetCount: number = 10
  ): Promise<DiversitySelectionResult> {
    console.log(`🎯 Starting diversity scoring for ${candidateData.length} candidates`);

    // Get auxiliary data
    const tickers = candidateData.map(c => c.ticker);
    const [lastSelectionDates, sectorMapping, negativeFeedback] = await Promise.all([
      this.getLastSelectionDates(tickers),
      this.getSectorMapping(tickers),
      this.getNegativeFeedbackCounts(tickers)
    ]);

    // Score all candidates
    const scoredTickers: TickerScore[] = candidateData.map(data => {
      const signal_score = this.calculateSignalScore(data);
      const recency_penalty = this.calculateRecencyPenalty(lastSelectionDates[data.ticker]);
      const feedback_penalty = (negativeFeedback[data.ticker] || 0) * this.FEEDBACK_PENALTY_FACTOR;
      
      return {
        ticker: data.ticker,
        signal_score,
        adjusted_score: signal_score, // Will be updated below
        recency_penalty,
        sector_penalty: 0, // Will be calculated during selection
        feedback_penalty,
        anomaly_score: data.anomaly_score || 0,
        volume_ratio: data.volume_ratio || 1,
        sentiment_spike_score: data.sentiment_spike_score || 0,
        user_growth: data.user_growth || 0,
        message_volume: data.message_volume,
        sector: sectorMapping[data.ticker],
        last_selected_date: lastSelectionDates[data.ticker]
      };
    });

    // Sort by raw signal score for initial ranking
    scoredTickers.sort((a, b) => b.signal_score - a.signal_score);

    const selectedTickers: TickerScore[] = [];
    const rejectedDueToRecency: string[] = [];
    const sectorCounts: Record<string, number> = {};

    // Selection process with diversity constraints
    for (const ticker of scoredTickers) {
      // Calculate sector penalty based on current selections
      ticker.sector_penalty = this.calculateSectorPenalty(ticker.ticker, ticker.sector, selectedTickers);
      
      // Update adjusted score
      ticker.adjusted_score =
        ticker.signal_score -
        ticker.recency_penalty -
        ticker.sector_penalty -
        ticker.feedback_penalty;

      // Check if we should reject due to recency
      if (ticker.recency_penalty > 0.3) { // High recency penalty threshold
        rejectedDueToRecency.push(ticker.ticker);
        continue;
      }

      // Track sector distribution
      if (ticker.sector) {
        sectorCounts[ticker.sector] = (sectorCounts[ticker.sector] || 0) + 1;
      }

      selectedTickers.push(ticker);

      if (selectedTickers.length >= targetCount) break;
    }

    // Fallback sampling if we don't have enough
    let fallbackUsed = false;
    if (selectedTickers.length < targetCount) {
      fallbackUsed = true;
      console.log(`🔄 Fallback needed: only ${selectedTickers.length}/${targetCount} selected`);
      
      // Get remaining candidates not selected recently
      const remainingCandidates = scoredTickers
        .filter(t => !selectedTickers.includes(t) && t.recency_penalty === 0)
        .filter(t => (t.message_volume || 0) >= 3); // Minimum volume threshold

      const fillCount = targetCount - selectedTickers.length;
      const randomExtras = this.randomSample(remainingCandidates, fillCount);
      selectedTickers.push(...randomExtras);
    }

    // Final sort by adjusted score
    selectedTickers.sort((a, b) => b.adjusted_score - a.adjusted_score);

    // Calculate metrics
    const scores = selectedTickers.map(t => t.adjusted_score);
    const maxSignalScore = Math.max(...scoredTickers.map(t => t.signal_score));
    const minSelectedScore = Math.min(...scores);

    const diversityMetrics = {
      sectorDistribution: sectorCounts,
      averageRecencyDays: this.calculateAverageRecencyDays(selectedTickers),
      scoreRange: { min: minSelectedScore, max: Math.max(...scores) }
    };

    const result: DiversitySelectionResult = {
      selectedTickers,
      totalCandidates: candidateData.length,
      maxSignalScore,
      minSelectedScore,
      rejectedDueToRecency,
      fallbackUsed,
      finalTickers: selectedTickers.map(t => t.ticker),
      diversityMetrics
    };

    // Log selection results
    console.log('🎯 Diversity Selection Results:', {
      total_candidates_considered: result.totalCandidates,
      max_signal_score: result.maxSignalScore.toFixed(2),
      min_selected_score: result.minSelectedScore.toFixed(2),
      rejected_due_to_recency: result.rejectedDueToRecency,
      fallback_used: result.fallbackUsed,
      final_tickers: result.finalTickers,
      sector_distribution: result.diversityMetrics.sectorDistribution
    });

    return result;
  }

  private static randomSample<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  private static calculateAverageRecencyDays(tickers: TickerScore[]): number {
    const recencyDays = tickers
      .filter(t => t.last_selected_date)
      .map(t => {
        const now = new Date();
        const lastSelected = new Date(t.last_selected_date!);
        return Math.floor((now.getTime() - lastSelected.getTime()) / (1000 * 60 * 60 * 24));
      });

    return recencyDays.length > 0 ? recencyDays.reduce((a, b) => a + b, 0) / recencyDays.length : 0;
  }
}