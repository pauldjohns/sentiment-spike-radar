// Ticker deduplication utility for edge functions
// This replicates the logic from src/utils/tickerDeduplication.ts for the Deno environment

export interface DeduplicationResult {
  uniqueTickers: string[];
  skippedDuplicatesInWindow: string[];
  skippedDuplicatesFromOtherWindows: string[];
}

/**
 * Enforces unique ticker selection per day and per time window
 */
function startOfTodayEasternISO(referenceDate: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(referenceDate);
  const data: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      data[part.type] = part.value;
    }
  }

  const utcTime = Date.UTC(
    Number(data.year),
    Number(data.month) - 1,
    Number(data.day),
    Number(data.hour),
    Number(data.minute),
    Number(data.second)
  );
  const offset = referenceDate.getTime() - utcTime;
  const localMidnightUtc =
    Date.UTC(Number(data.year), Number(data.month) - 1, Number(data.day)) + offset;
  return new Date(localMidnightUtc).toISOString();
}

export class TickerDeduplicationService {
  /**
   * Filter candidates to ensure uniqueness per time window and per day
   */
  static async filterUniqueTickersForWindow(
    supabase: any,
    candidates: string[],
    timeWindow: string
  ): Promise<DeduplicationResult> {
    const seenInWindow = new Set<string>();
    const skippedDuplicatesInWindow: string[] = [];
    const skippedDuplicatesFromOtherWindows: string[] = [];
    const uniqueTickers: string[] = [];

    // Get start of today in U.S. Eastern time
    const startOfTodayISO = startOfTodayEasternISO();

    // Check which tickers were already selected today
    const { data: alreadySelectedToday } = await supabase
      .from('enriched_signals')
      .select('ticker')
      .gte('signal_detected_at', startOfTodayISO);

    const selectedTodaySet = new Set(
      alreadySelectedToday?.map((signal: any) => signal.ticker) || []
    );

    console.log(`📊 Deduplication check: ${selectedTodaySet.size} tickers already selected today`);

    for (const ticker of candidates) {
      // Check for duplicates within this window
      if (seenInWindow.has(ticker)) {
        skippedDuplicatesInWindow.push(ticker);
        console.warn(`⚠️ Skipping ${ticker} - duplicate in window ${timeWindow}`);
        continue;
      }

      // Check for duplicates from other windows today
      if (selectedTodaySet.has(ticker)) {
        skippedDuplicatesFromOtherWindows.push(ticker);
        console.warn(`⚠️ Skipping ${ticker} - already selected earlier today`);
        continue;
      }

      // Ticker is unique for today and this window
      seenInWindow.add(ticker);
      uniqueTickers.push(ticker);
    }

    console.log(`✅ Deduplication results for ${timeWindow}:`, {
      total_candidates: candidates.length,
      unique_selected: uniqueTickers.length,
      skipped_in_window: skippedDuplicatesInWindow.length,
      skipped_from_other_windows: skippedDuplicatesFromOtherWindows.length
    });

    return {
      uniqueTickers,
      skippedDuplicatesInWindow,
      skippedDuplicatesFromOtherWindows
    };
  }

  /**
   * Batch check for unique tickers with signal data
   */
  static async filterUniqueSignalsForWindow<T extends { ticker: string }>(
    supabase: any,
    candidates: T[],
    timeWindow: string
  ): Promise<{
    uniqueSignals: T[];
    skippedDuplicatesInWindow: string[];
    skippedDuplicatesFromOtherWindows: string[];
  }> {
    const candidateTickers = candidates.map(c => c.ticker);
    const deduplicationResult = await this.filterUniqueTickersForWindow(supabase, candidateTickers, timeWindow);
    
    const uniqueTickerSet = new Set(deduplicationResult.uniqueTickers);
    const uniqueSignals = candidates.filter(candidate => uniqueTickerSet.has(candidate.ticker));

    return {
      uniqueSignals,
      skippedDuplicatesInWindow: deduplicationResult.skippedDuplicatesInWindow,
      skippedDuplicatesFromOtherWindows: deduplicationResult.skippedDuplicatesFromOtherWindows
    };
  }
}