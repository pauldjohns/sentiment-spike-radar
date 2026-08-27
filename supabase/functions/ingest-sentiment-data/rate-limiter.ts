
const MIN_RUN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes minimum between runs

export async function getLastSuccessfulRunTimestamp(supabase: any): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('system_logs')
      .select('timestamp')
      .eq('event_type', 'ingestion_cycle_complete')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return 0; // No previous run found
    }

    return new Date(data.timestamp).getTime();
  } catch (err) {
    console.log('Could not retrieve last run timestamp, allowing execution');
    return 0;
  }
}

export async function logSuccessfulRun(supabase: any, sessionId: string, totalBatches: number): Promise<void> {
  try {
    await supabase.from('system_logs').insert({
      event_type: 'ingestion_cycle_complete',
      details: {
        session_id: sessionId,
        total_batches: totalBatches,
        completion_time: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.log('Could not log successful run completion');
  }
}

export async function checkRateLimit(supabase: any, isManual: boolean): Promise<{ allowed: boolean; waitSeconds?: number }> {
  if (isManual) {
    return { allowed: true };
  }

  const lastRunTime = await getLastSuccessfulRunTimestamp(supabase);
  const now = Date.now();
  const timeSinceLastRun = now - lastRunTime;

  if (timeSinceLastRun < MIN_RUN_INTERVAL_MS) {
    const remainingWait = Math.ceil((MIN_RUN_INTERVAL_MS - timeSinceLastRun) / 1000);
    console.log(`⏳ RATE LIMIT: Last run was ${Math.ceil(timeSinceLastRun / 1000)}s ago, need to wait ${remainingWait}s more`);
    
    return {
      allowed: false,
      waitSeconds: remainingWait
    };
  }

  return { allowed: true };
}
