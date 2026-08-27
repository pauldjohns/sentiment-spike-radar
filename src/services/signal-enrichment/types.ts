
export interface EnrichedSignal {
  id: string;
  ticker: string;
  time_window: string | null;
  signal_detected_at: string;
  sentiment_type: string | null;
  z_score: number | null;
  sentiment_velocity: number | null;
  message_volume: number | null;
  price_at_signal: number | null;
  price_1h_later: number | null;
  price_3h_later: number | null;
  price_eod: number | null;
  change_1h: number | null;
  change_3h: number | null;
  change_eod: number | null;
  price_metadata_status: string | null;
  success_1h: boolean | null;
  success_3h: boolean | null;
  success_eod: boolean | null;
  evaluation_status: string | null;
  evaluation_timestamp: string | null;
  confidence_score: number | null;
  confidence_source: string | null;
  source: string | null;
  is_simulated: boolean | null;
  replay_batch_id: string | null;
  created_at: string | null;
}

export interface SignalSuccessMetrics {
  total_signals: number;
  evaluated_signals: number;
  success_rate_1h: number;
  success_rate_3h: number;
  success_rate_eod: number;
  bullish_success_rate: number;
  bearish_success_rate: number;
}
