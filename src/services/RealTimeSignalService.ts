import { supabase } from '@/integrations/supabase/client';
import { getTickerCount, getAllIndustryTickers } from '@/data/industry_tickers';
import { TickerDiversityScorer, type DiversitySelectionResult } from './TickerDiversityScorer';

interface SignalEvent {
  ticker: string;
  anomalyScore: number;
  signalType: string;
  triggerDetails: any;
  timestamp: Date;
}

interface QueuedTicker {
  ticker: string;
  priority: number;
  lastProcessed: Date;
  anomalyScore: number;
}

export class RealTimeSignalService {
  private static instance: RealTimeSignalService;
  private isActive = false;
  private processingQueue: QueuedTicker[] = [];
  private webSocket: WebSocket | null = null;
  private rapidPollingInterval: NodeJS.Timeout | null = null;
  private processedTickers = new Set<string>();
  private lastBatchTime = Date.now();
  private industryTickers: string[] = [];
  private industryTickerCount = 0;
  private rateLimitTracker = {
    requestCount: 0,
    windowStart: Date.now(),
    backoffUntil: 0
  };

  // ✅ FIXED: Updated configuration to handle full industry ticker list
  private config = {
    rapidPollingInterval: 60000, // 60 seconds
    priorityThreshold: 75, // High priority above this score
    mediumThreshold: 50, // Medium priority threshold
    maxConcurrentRequests: 8, // Increased from 5 for burst capacity
    burstCapacity: 15, // Allow bursts up to this many requests
    rateLimitWindow: 60000, // 1 minute window
    maxRequestsPerWindow: 100, // Conservative for StockTwits
    dynamicBackoffBase: 2000, // 2 second base backoff
    signalLatencyTarget: 120000, // 2 minutes target
    queueProcessingBatch: 20, // Process 20 tickers per batch
    maxQueueSize: 0 // Will be set based on runtime ticker count
  };

  private constructor() {}

  static getInstance(): RealTimeSignalService {
    if (!RealTimeSignalService.instance) {
      RealTimeSignalService.instance = new RealTimeSignalService();
    }
    return RealTimeSignalService.instance;
  }

  async startRealTimeProcessing(): Promise<void> {
    if (this.isActive) return;

    console.log('🚀 Starting Phase 2: Real-Time Signal Pipeline');

    // Load ticker metadata from database
    this.industryTickerCount = await getTickerCount();
    this.industryTickers = await getAllIndustryTickers();
    this.config.maxQueueSize = this.industryTickerCount + 50; // Allow full list with buffer

    console.log(
      `📊 Configuration: Max queue size ${this.config.maxQueueSize} (supports full ${this.industryTickerCount} industry tickers)`
    );

    this.isActive = true;

    // Load any existing runtime state before building queue
    await this.loadRuntimeState();

    // Initialize priority queue from existing active tickers or full ticker list
    if (this.processingQueue.length === 0) {
      await this.initializePriorityQueue();
    }

    // Start rapid polling (Option B - since WebSocket not available for StockTwits)
    this.startRapidPolling();

    // Start continuous queue processing
    this.startQueueProcessor();

    console.log('✅ Real-time signal pipeline active');
  }

  async stopRealTimeProcessing(): Promise<void> {
    this.isActive = false;
    
    if (this.rapidPollingInterval) {
      clearInterval(this.rapidPollingInterval);
      this.rapidPollingInterval = null;
    }

    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }

    await this.persistRuntimeState();

    this.processingQueue = [];
    this.processedTickers.clear();

    console.log('⏹️ Real-time signal pipeline stopped');
  }

  private async loadRuntimeState(): Promise<void> {
    // Temporarily disabled until database types are regenerated
    console.log('Runtime state persistence temporarily disabled');
    /* 
    try {
      // Remove stale entries older than 1 day
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('runtime_processing_state').delete().lt('updated_at', cutoff);

      const { data, error } = await supabase
        .from('runtime_processing_state')
        .select('*');

      if (error) {
        console.error('Error loading runtime state:', error);
        return;
      }

      data?.forEach((row: any) => {
        if (row.state === 'processed') {
          this.processedTickers.add(row.ticker);
        } else if (row.state === 'queued') {
          this.processingQueue.push({
            ticker: row.ticker,
            priority: row.priority || 0,
            lastProcessed: row.last_processed ? new Date(row.last_processed) : new Date(0),
            anomalyScore: row.anomaly_score || 0
          });
        }
      });

      if (this.processingQueue.length > 0) {
        this.processingQueue.sort((a, b) => b.priority - a.priority);
      }

      console.log(`🔁 Loaded runtime state: ${this.processedTickers.size} processed, ${this.processingQueue.length} queued`);
    } catch (err) {
      console.error('Failed to load runtime state:', err);
    }
    */
  }

  private async persistRuntimeState(): Promise<void> {
    // Temporarily disabled until database types are regenerated
    console.log('Runtime state persistence temporarily disabled');
    /*
    try {
      // Prepare records for upsert
      const nowIso = new Date().toISOString();

      const processedRecords = Array.from(this.processedTickers).map(ticker => ({
        ticker,
        state: 'processed',
        priority: 0,
        anomaly_score: 0,
        last_processed: nowIso,
        updated_at: nowIso
      }));

      const queuedRecords = this.processingQueue.map(t => ({
        ticker: t.ticker,
        state: 'queued',
        priority: t.priority,
        anomaly_score: t.anomalyScore,
        last_processed: t.lastProcessed.toISOString(),
        updated_at: nowIso
      }));

      const records = [...processedRecords, ...queuedRecords];
      if (records.length > 0) {
        const { error } = await supabase
          .from('runtime_processing_state')
          .upsert(records);
        if (error) {
          console.error('Error persisting runtime state:', error);
        }
      }

      // Cleanup old entries
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('runtime_processing_state').delete().lt('updated_at', cutoff);
    } catch (err) {
      console.error('Failed to persist runtime state:', err);
    }
    */
  }

  private async initializePriorityQueue(): Promise<void> {
    try {
      const { data: activeTickers } = await supabase
        .from('active_ticker_queue')
        .select('*')
        .eq('status', 'active')
        .order('priority_score', { ascending: false });

      if (activeTickers && activeTickers.length > 0) {
        this.processingQueue = activeTickers.map(ticker => ({
          ticker: ticker.ticker,
          priority: ticker.priority_score || 0,
          lastProcessed: new Date(ticker.last_activity),
          anomalyScore: ticker.anomaly_score || 0
        }));
      } else {
        // Fallback to full industry ticker list from database
        this.processingQueue = this.industryTickers.map(ticker => ({
          ticker,
          priority: 0,
          lastProcessed: new Date(0),
          anomalyScore: 0
        }));
      }

      // ✅ VALIDATION: Ensure we can handle the full industry list
      console.log(`📊 Initialized priority queue with ${this.processingQueue.length} tickers`);
      console.log(
        `📊 Queue capacity: ${this.config.maxQueueSize} (can handle full ${this.industryTickerCount} industry tickers)`
      );

      if (this.processingQueue.length > this.config.maxQueueSize * 0.8) {
        console.warn(`⚠️ Queue approaching capacity: ${this.processingQueue.length}/${this.config.maxQueueSize}`);
      }
    } catch (error) {
      console.error('Error initializing priority queue:', error);
    }
  }

  private startRapidPolling(): void {
    console.log('🔄 Starting rapid polling (60s intervals)');
    
    this.rapidPollingInterval = setInterval(async () => {
      if (!this.isMarketHours()) {
        console.log('🕐 Outside market hours - pausing rapid polling');
        return;
      }

      await this.triggerIncrementalDiscovery();
    }, this.config.rapidPollingInterval);

    // Initial trigger
    if (this.isMarketHours()) {
      setTimeout(() => this.triggerIncrementalDiscovery(), 5000);
    }
  }

  private async triggerIncrementalDiscovery(): Promise<void> {
    try {
      console.log('🔍 Triggering incremental discovery...');

      // Check rate limits before proceeding
      if (!this.canMakeRequest()) {
        console.log('⚠️ Rate limit active, skipping this cycle');
        return;
      }

      const startTime = Date.now();

      const { data, error } = await supabase.functions.invoke('ingest-sentiment-data', {
        body: { 
          automated: true,
          rapidMode: true,
          sessionId: `rapid_${Date.now()}`
        }
      });

      this.trackRequest();

      if (error) {
        console.error('Incremental discovery error:', error);
        this.handleRateLimit(error);
        return;
      }

      const latency = Date.now() - startTime;
      console.log(`✅ Discovery completed in ${latency}ms`);

      // Update queue with new anomalies
      if (data?.signals_generated && data.signals_generated > 0) {
        await this.refreshPriorityQueue();
      }

      // Monitor latency performance
      if (latency > this.config.signalLatencyTarget) {
        console.warn(`⚠️ Latency warning: ${latency}ms exceeds ${this.config.signalLatencyTarget}ms target`);
      }

    } catch (error) {
      console.error('Rapid polling error:', error);
      this.handleRateLimit(error);
    }
  }

  private async refreshPriorityQueue(): Promise<void> {
    try {
      // Get latest signal logs to update priorities with diversity scoring
      const { data: recentSignals } = await supabase
        .from('signal_logs')
        .select('*')
        .gte('signal_timestamp', new Date(Date.now() - 300000).toISOString()) // Last 5 minutes
        .order('anomaly_score', { ascending: false });

      if (recentSignals && recentSignals.length > 0) {
        // Prepare data for diversity scoring
        const candidateData = recentSignals.map(signal => ({
          ticker: signal.ticker,
          sentiment_spike_score: Math.abs(signal.sentiment_shift_percent || 0),
          volume_ratio: signal.volume_anomaly_score || 1,
          user_growth: signal.user_diversity_score || 0,
          anomaly_score: signal.anomaly_score,
          message_volume: signal.message_volume || 0
        }));

        // Apply diversity scoring to prevent repeated ticker selection
        const diversityResult: DiversitySelectionResult = await TickerDiversityScorer.scoreAndSelectTickers(
          candidateData,
          Math.min(15, this.config.maxQueueSize) // Select top 15 with diversity
        );

        // Clear and rebuild queue with diversified selection
        this.processingQueue = [];

        diversityResult.selectedTickers.forEach(scored => {
          this.processingQueue.push({
            ticker: scored.ticker,
            priority: scored.adjusted_score,
            lastProcessed: new Date(0), // Reset processing time
            anomalyScore: scored.anomaly_score
          });
        });

        // Sort by adjusted diversity score
        this.processingQueue.sort((a, b) => b.priority - a.priority);

        console.log(`📊 Updated priority queue with diversity scoring: ${this.processingQueue.length}/${this.config.maxQueueSize} tickers`);
        console.log(`🎯 Diversity metrics:`, {
          rejected_due_to_recency: diversityResult.rejectedDueToRecency,
          fallback_used: diversityResult.fallbackUsed,
          sector_distribution: diversityResult.diversityMetrics.sectorDistribution
        });
        
        // ✅ VALIDATION: Log if queue is getting full
        if (this.processingQueue.length > this.config.maxQueueSize * 0.9) {
          console.warn(`⚠️ Queue near capacity: ${this.processingQueue.length}/${this.config.maxQueueSize}`);
        }
      }
    } catch (error) {
      console.error('Error refreshing priority queue with diversity scoring:', error);
      // Fallback to original logic if diversity scoring fails
      await this.refreshPriorityQueueFallback();
    }
  }

  private async refreshPriorityQueueFallback(): Promise<void> {
    try {
      const { data: recentSignals } = await supabase
        .from('signal_logs')
        .select('*')
        .gte('signal_timestamp', new Date(Date.now() - 300000).toISOString())
        .order('anomaly_score', { ascending: false });

      if (recentSignals && recentSignals.length > 0) {
        const tickers = recentSignals.map(s => s.ticker);
        const [lastSelectionDates, sectorMap] = await Promise.all([
          TickerDiversityScorer.getLastSelectionDates(tickers),
          TickerDiversityScorer.getSectorMapping(tickers)
        ]);

        const sectorCounts: Record<string, number> = {};

        recentSignals.forEach(signal => {
          const recencyPenalty = TickerDiversityScorer.calculateRecencyPenalty(
            lastSelectionDates[signal.ticker]
          );
          if (recencyPenalty > 0.3) return;

          const sector = sectorMap[signal.ticker];
          if (sector && (sectorCounts[sector] || 0) >= 3) return;

          const existingIndex = this.processingQueue.findIndex(t => t.ticker === signal.ticker);

          if (existingIndex >= 0) {
            this.processingQueue[existingIndex].priority = signal.anomaly_score;
            this.processingQueue[existingIndex].anomalyScore = signal.anomaly_score;
          } else if (signal.anomaly_score >= this.config.mediumThreshold) {
            this.processingQueue.push({
              ticker: signal.ticker,
              priority: signal.anomaly_score,
              lastProcessed: new Date(0),
              anomalyScore: signal.anomaly_score
            });
          }

          if (sector) {
            sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
          }
        });

        this.processingQueue.sort((a, b) => b.priority - a.priority);
        this.processingQueue = this.processingQueue.slice(0, this.config.maxQueueSize);
        console.log(`📊 Fallback: Updated priority queue: ${this.processingQueue.length}/${this.config.maxQueueSize} tickers`);
      }
    } catch (error) {
      console.error('Error in fallback priority queue refresh:', error);
    }
  }

  private startQueueProcessor(): void {
    console.log('⚡ Starting continuous queue processor');

    const processQueue = async () => {
      if (!this.isActive || !this.isMarketHours()) {
        setTimeout(processQueue, 30000); // Check again in 30 seconds
        return;
      }

      try {
        await this.processPriorityBatch();
      } catch (error) {
        console.error('Queue processing error:', error);
      }

      // Schedule next processing cycle
      setTimeout(processQueue, 15000); // Process every 15 seconds
    };

    // Start processing
    setTimeout(processQueue, 2000);
  }

  private async processPriorityBatch(): Promise<void> {
    if (this.processingQueue.length === 0) return;

    const now = Date.now();
    const batchStartTime = now;

    // Get high-priority tickers that haven't been processed recently
    const highPriorityTickers = this.processingQueue
      .filter(t => 
        t.priority >= this.config.priorityThreshold && 
        (now - t.lastProcessed.getTime()) > 60000 // Not processed in last minute
      )
      .slice(0, Math.floor(this.config.queueProcessingBatch / 2));

    // Get medium-priority tickers for remaining slots
    const mediumPriorityTickers = this.processingQueue
      .filter(t => 
        t.priority >= this.config.mediumThreshold && 
        t.priority < this.config.priorityThreshold &&
        (now - t.lastProcessed.getTime()) > 120000 // Not processed in last 2 minutes
      )
      .slice(0, this.config.queueProcessingBatch - highPriorityTickers.length);

    const batchTickers = [...highPriorityTickers, ...mediumPriorityTickers];

    if (batchTickers.length === 0) {
      console.log('📊 No tickers ready for processing');
      return;
    }

    console.log(`🎯 Processing priority batch: ${batchTickers.length} tickers`);
    console.log(`   High priority: ${highPriorityTickers.length}, Medium: ${mediumPriorityTickers.length}`);

    // Process batch with targeted sentiment analysis
    await this.processTickerBatch(batchTickers);

    const batchLatency = Date.now() - batchStartTime;
    console.log(`⚡ Batch processed in ${batchLatency}ms`);

    // Log performance metrics
    this.logPerformanceMetrics(batchTickers.length, batchLatency);
  }

  private async processTickerBatch(tickers: QueuedTicker[]): Promise<void> {
    const promises = tickers.map(async (tickerData) => {
      try {
        // Mark as being processed
        tickerData.lastProcessed = new Date();

        // Trigger focused analysis for this specific ticker
        // This would ideally call a specialized endpoint for single-ticker analysis
        const result = await this.analyzeSpecificTicker(tickerData.ticker);
        
        if (result.signalGenerated) {
          await this.dispatchSignal({
            ticker: tickerData.ticker,
            anomalyScore: result.anomalyScore,
            signalType: result.signalType,
            triggerDetails: result.triggerDetails,
            timestamp: new Date()
          });
        }

        // Track processed ticker for coordination across instances
        this.processedTickers.add(tickerData.ticker);

        return result;
      } catch (error) {
        console.error(`Error processing ${tickerData.ticker}:`, error);
        return null;
      }
    });

    await Promise.allSettled(promises);
  }

  private async analyzeSpecificTicker(ticker: string): Promise<any> {
    // For now, this calls the main function but we could optimize this
    // In a production system, this would be a separate lightweight endpoint
    try {
      const { data, error } = await supabase.functions.invoke('ingest-sentiment-data', {
        body: { 
          automated: true,
          focusedTicker: ticker,
          rapidMode: true,
          sessionId: `focused_${ticker}_${Date.now()}`
        }
      });

      if (error) throw error;

      return {
        signalGenerated: data?.signals_generated && data.signals_generated > 0,
        anomalyScore: data?.max_anomaly_score || 0,
        signalType: data?.primary_signal_type || 'volume_spike',
        triggerDetails: data?.trigger_summary || {}
      };
    } catch (error) {
      console.error(`Analysis failed for ${ticker}:`, error);
      return { signalGenerated: false, anomalyScore: 0 };
    }
  }

  private async dispatchSignal(signal: SignalEvent): Promise<void> {
    try {
      console.log(`🚨 Dispatching ${this.getConfidenceLevel(signal.anomalyScore)} confidence signal for ${signal.ticker}`);

      // ✅ ENFORCE UNIQUE TICKER SELECTION PER DAY
      const startOfTodayISO = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
      
      // Check if ticker was already selected today
      const { data: alreadySelectedToday } = await supabase
        .from('enriched_signals')
        .select('ticker')
        .eq('ticker', signal.ticker)
        .gte('signal_detected_at', startOfTodayISO);

      if (alreadySelectedToday && alreadySelectedToday.length > 0) {
        console.warn(`⚠️ Skipping signal for ${signal.ticker} - already selected earlier today`);
        return;
      }

      // Check if ticker was already processed in alerts today
      const { data: alreadyAlertedToday } = await supabase
        .from('sentiment_alerts')
        .select('ticker')
        .eq('ticker', signal.ticker)
        .gte('created_at', startOfTodayISO)
        .eq('active', true);

      if (alreadyAlertedToday && alreadyAlertedToday.length > 0) {
        console.warn(`⚠️ Skipping alert for ${signal.ticker} - already alerted earlier today`);
        return;
      }

      // Create enhanced alert with confidence scoring
      const { error } = await supabase
        .from('sentiment_alerts')
        .insert({
          ticker: signal.ticker,
          alert_type: signal.signalType,
          message: `🎯 Real-time ${signal.signalType}: ${signal.ticker} anomaly score ${signal.anomalyScore.toFixed(1)}`,
          confidence: this.getConfidenceLevel(signal.anomalyScore),
          z_score: signal.anomalyScore / 10, // Normalize for z_score field
          active: true
        });

      if (error) {
        console.error('Error dispatching signal:', error);
      } else {
        console.log(`✅ Signal dispatched for ${signal.ticker} (unique for today)`);
      }
    } catch (error) {
      console.error('Signal dispatch error:', error);
    }
  }

  private getConfidenceLevel(anomalyScore: number): 'high' | 'medium' | 'low' {
    if (anomalyScore >= this.config.priorityThreshold) return 'high';
    if (anomalyScore >= this.config.mediumThreshold) return 'medium';
    return 'low';
  }

  private canMakeRequest(): boolean {
    const now = Date.now();

    // Check if we're in backoff period
    if (now < this.rateLimitTracker.backoffUntil) {
      return false;
    }

    // Reset window if needed
    if (now - this.rateLimitTracker.windowStart > this.config.rateLimitWindow) {
      this.rateLimitTracker.requestCount = 0;
      this.rateLimitTracker.windowStart = now;
    }

    // Check if we can make request within limits
    return this.rateLimitTracker.requestCount < this.config.maxRequestsPerWindow;
  }

  private trackRequest(): void {
    this.rateLimitTracker.requestCount++;
  }

  private handleRateLimit(error: any): void {
    // Dynamic backoff based on error type
    let backoffMs = this.config.dynamicBackoffBase;

    const errorStatus = error?.status || error?.code;
    const errorMessage = error?.message || '';

    if (errorStatus === 429 || errorMessage.includes('rate limit')) {
      backoffMs *= 3; // Longer backoff for rate limits
      console.log(`⚠️ Rate limit detected, backing off for ${backoffMs}ms`);
    } else if (errorStatus && errorStatus >= 500) {
      backoffMs *= 2; // Medium backoff for server errors
      console.log(`⚠️ Server error detected, backing off for ${backoffMs}ms`);
    }

    this.rateLimitTracker.backoffUntil = Date.now() + backoffMs;
  }

  private isMarketHours(): boolean {
    const now = new Date();
    const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const day = etNow.getDay();
    
    if (day === 0 || day === 6) return false; // Weekend
    
    const hour = etNow.getHours();
    const minute = etNow.getMinutes();
    const currentTime = hour * 60 + minute;
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM
    
    return currentTime >= marketOpen && currentTime < marketClose;
  }

  private logPerformanceMetrics(tickersProcessed: number, latency: number): void {
    const metrics = {
      timestamp: new Date().toISOString(),
      tickersProcessed,
      latency,
      queueLength: this.processingQueue.length,
      rateLimitStatus: {
        requestCount: this.rateLimitTracker.requestCount,
        backoffActive: Date.now() < this.rateLimitTracker.backoffUntil
      }
    };

    console.log('📊 Performance Metrics:', metrics);

    // In production, these would be sent to monitoring service
    if (latency > this.config.signalLatencyTarget * 2) {
      console.warn('⚠️ High latency detected - system may need optimization');
    }
  }

  // ✅ Enhanced monitoring methods
  getQueueStatus() {
    return {
      totalTickers: this.processingQueue.length,
      maxCapacity: this.config.maxQueueSize,
      industryTickerCount: this.industryTickerCount,
      highPriority: this.processingQueue.filter(t => t.priority >= this.config.priorityThreshold).length,
      mediumPriority: this.processingQueue.filter(t => t.priority >= this.config.mediumThreshold && t.priority < this.config.priorityThreshold).length,
      isActive: this.isActive,
      rateLimitStatus: this.rateLimitTracker,
      capacityUtilization: (this.processingQueue.length / this.config.maxQueueSize) * 100
    };
  }

  updateConfig(newConfig: Partial<typeof this.config>): void {
    // ✅ VALIDATION: Ensure maxQueueSize can handle industry tickers
    if (newConfig.maxQueueSize && newConfig.maxQueueSize < this.industryTickerCount) {
      console.warn(
        `⚠️ Config Warning: maxQueueSize (${newConfig.maxQueueSize}) is less than industry ticker count (${this.industryTickerCount})`
      );
    }

    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Real-time service config updated:', newConfig);
  }

  // ✅ NEW: Method to validate ticker processing coverage
  async validateTickerCoverage(): Promise<{
    industryTickerCount: number;
    queueCapacity: number;
    canHandleFullList: boolean;
    recommendedQueueSize: number;
  }> {
    const industryTickerCount = this.industryTickerCount || (await getTickerCount());
    const recommendedQueueSize = Math.ceil(industryTickerCount * 1.2); // 20% buffer
    
    return {
      industryTickerCount,
      queueCapacity: this.config.maxQueueSize,
      canHandleFullList: this.config.maxQueueSize >= industryTickerCount,
      recommendedQueueSize
    };
  }
}
