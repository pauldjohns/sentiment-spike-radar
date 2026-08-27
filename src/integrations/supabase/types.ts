export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      active_ticker_queue: {
        Row: {
          anomaly_score: number | null
          created_at: string
          entry_reason: string
          entry_timestamp: string
          id: string
          last_activity: string
          priority_score: number | null
          removal_reason: string | null
          status: string | null
          ticker: string
          updated_at: string
        }
        Insert: {
          anomaly_score?: number | null
          created_at?: string
          entry_reason: string
          entry_timestamp?: string
          id?: string
          last_activity?: string
          priority_score?: number | null
          removal_reason?: string | null
          status?: string | null
          ticker: string
          updated_at?: string
        }
        Update: {
          anomaly_score?: number | null
          created_at?: string
          entry_reason?: string
          entry_timestamp?: string
          id?: string
          last_activity?: string
          priority_score?: number | null
          removal_reason?: string | null
          status?: string | null
          ticker?: string
          updated_at?: string
        }
        Relationships: []
      }
      backtest_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          date_range: unknown | null
          id: string
          min_velocity: number | null
          min_z_score: number | null
          notes: string | null
          run_name: string | null
          status: string | null
          ticker_filter: string[] | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          date_range?: unknown | null
          id?: string
          min_velocity?: number | null
          min_z_score?: number | null
          notes?: string | null
          run_name?: string | null
          status?: string | null
          ticker_filter?: string[] | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          date_range?: unknown | null
          id?: string
          min_velocity?: number | null
          min_z_score?: number | null
          notes?: string | null
          run_name?: string | null
          status?: string | null
          ticker_filter?: string[] | null
        }
        Relationships: []
      }
      enriched_signals: {
        Row: {
          change_1h: number | null
          change_3h: number | null
          change_eod: number | null
          confidence_score: number | null
          confidence_source: string | null
          created_at: string | null
          evaluation_status: string | null
          evaluation_timestamp: string | null
          failure_reason: string | null
          id: string
          is_simulated: boolean | null
          last_retry_at: string | null
          message_volume: number | null
          price_1h_later: number | null
          price_3h_later: number | null
          price_at_signal: number | null
          price_close: number | null
          price_eod: number | null
          price_high: number | null
          price_low: number | null
          price_metadata_status: string | null
          price_open: number | null
          price_volume: number | null
          replay_batch_id: string | null
          retry_count: number | null
          sentiment_type: string | null
          sentiment_velocity: number | null
          signal_detected_at: string
          source: string | null
          success_1h: boolean | null
          success_3h: boolean | null
          success_close: boolean | null
          success_eod: boolean | null
          success_high: boolean | null
          success_threshold: number | null
          ticker: string
          time_window: string | null
          z_score: number | null
        }
        Insert: {
          change_1h?: number | null
          change_3h?: number | null
          change_eod?: number | null
          confidence_score?: number | null
          confidence_source?: string | null
          created_at?: string | null
          evaluation_status?: string | null
          evaluation_timestamp?: string | null
          failure_reason?: string | null
          id?: string
          is_simulated?: boolean | null
          last_retry_at?: string | null
          message_volume?: number | null
          price_1h_later?: number | null
          price_3h_later?: number | null
          price_at_signal?: number | null
          price_close?: number | null
          price_eod?: number | null
          price_high?: number | null
          price_low?: number | null
          price_metadata_status?: string | null
          price_open?: number | null
          price_volume?: number | null
          replay_batch_id?: string | null
          retry_count?: number | null
          sentiment_type?: string | null
          sentiment_velocity?: number | null
          signal_detected_at: string
          source?: string | null
          success_1h?: boolean | null
          success_3h?: boolean | null
          success_close?: boolean | null
          success_eod?: boolean | null
          success_high?: boolean | null
          success_threshold?: number | null
          ticker: string
          time_window?: string | null
          z_score?: number | null
        }
        Update: {
          change_1h?: number | null
          change_3h?: number | null
          change_eod?: number | null
          confidence_score?: number | null
          confidence_source?: string | null
          created_at?: string | null
          evaluation_status?: string | null
          evaluation_timestamp?: string | null
          failure_reason?: string | null
          id?: string
          is_simulated?: boolean | null
          last_retry_at?: string | null
          message_volume?: number | null
          price_1h_later?: number | null
          price_3h_later?: number | null
          price_at_signal?: number | null
          price_close?: number | null
          price_eod?: number | null
          price_high?: number | null
          price_low?: number | null
          price_metadata_status?: string | null
          price_open?: number | null
          price_volume?: number | null
          replay_batch_id?: string | null
          retry_count?: number | null
          sentiment_type?: string | null
          sentiment_velocity?: number | null
          signal_detected_at?: string
          source?: string | null
          success_1h?: boolean | null
          success_3h?: boolean | null
          success_close?: boolean | null
          success_eod?: boolean | null
          success_high?: boolean | null
          success_threshold?: number | null
          ticker?: string
          time_window?: string | null
          z_score?: number | null
        }
        Relationships: []
      }
      industry_tickers: {
        Row: {
          created_at: string
          id: string
          name: string | null
          sector: string | null
          symbol: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          sector?: string | null
          symbol: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          sector?: string | null
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_volume_history: {
        Row: {
          avg_sentiment_score: number | null
          bearish_ratio: number | null
          bullish_ratio: number | null
          created_at: string | null
          date: string
          id: string
          message_count: number
          neutral_ratio: number | null
          ticker: string
          total_messages_analyzed: number
          updated_at: string | null
        }
        Insert: {
          avg_sentiment_score?: number | null
          bearish_ratio?: number | null
          bullish_ratio?: number | null
          created_at?: string | null
          date: string
          id?: string
          message_count?: number
          neutral_ratio?: number | null
          ticker: string
          total_messages_analyzed?: number
          updated_at?: string | null
        }
        Update: {
          avg_sentiment_score?: number | null
          bearish_ratio?: number | null
          bullish_ratio?: number | null
          created_at?: string | null
          date?: string
          id?: string
          message_count?: number
          neutral_ratio?: number | null
          ticker?: string
          total_messages_analyzed?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      runtime_processing_state: {
        Row: {
          anomaly_score: number | null
          last_processed: string | null
          priority: number | null
          state: string
          ticker: string
          updated_at: string | null
        }
        Insert: {
          anomaly_score?: number | null
          last_processed?: string | null
          priority?: number | null
          state: string
          ticker: string
          updated_at?: string | null
        }
        Update: {
          anomaly_score?: number | null
          last_processed?: string | null
          priority?: number | null
          state?: string
          ticker?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sentiment_alerts: {
        Row: {
          active: boolean | null
          alert_type: string
          confidence: string | null
          created_at: string | null
          id: string
          message: string
          signal_id: string | null
          ticker: string
          user_id: string | null
          z_score: number | null
        }
        Insert: {
          active?: boolean | null
          alert_type: string
          confidence?: string | null
          created_at?: string | null
          id?: string
          message: string
          signal_id?: string | null
          ticker: string
          user_id?: string | null
          z_score?: number | null
        }
        Update: {
          active?: boolean | null
          alert_type?: string
          confidence?: string | null
          created_at?: string | null
          id?: string
          message?: string
          signal_id?: string | null
          ticker?: string
          user_id?: string | null
          z_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sentiment_alerts_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signal_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentiment_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sentiment_model_audit_log: {
        Row: {
          confidence_score: number
          created_at: string | null
          id: string
          message_id: string
          model_version: string
          predicted_sentiment: string
          raw_message: string
          ticker: string
        }
        Insert: {
          confidence_score: number
          created_at?: string | null
          id?: string
          message_id: string
          model_version?: string
          predicted_sentiment: string
          raw_message: string
          ticker: string
        }
        Update: {
          confidence_score?: number
          created_at?: string | null
          id?: string
          message_id?: string
          model_version?: string
          predicted_sentiment?: string
          raw_message?: string
          ticker?: string
        }
        Relationships: []
      }
      sentiment_model_fallback_log: {
        Row: {
          created_at: string
          fallback_sentiment: string
          id: string
          message_id: string
          raw_message: string
          reason: string
          ticker: string
        }
        Insert: {
          created_at?: string
          fallback_sentiment: string
          id?: string
          message_id: string
          raw_message: string
          reason: string
          ticker: string
        }
        Update: {
          created_at?: string
          fallback_sentiment?: string
          id?: string
          message_id?: string
          raw_message?: string
          reason?: string
          ticker?: string
        }
        Relationships: []
      }
      signal_config_versions: {
        Row: {
          active: boolean | null
          config_data: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          version_name: string
        }
        Insert: {
          active?: boolean | null
          config_data: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          version_name: string
        }
        Update: {
          active?: boolean | null
          config_data?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          version_name?: string
        }
        Relationships: []
      }
      signal_learning_log: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          enriched_signal_id: string | null
          evaluated_at: string | null
          id: string
          message_volume: number | null
          sentiment_velocity: number | null
          success_1h: boolean | null
          success_3h: boolean | null
          success_eod: boolean | null
          ticker: string
          time_window: string | null
          z_score: number | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          enriched_signal_id?: string | null
          evaluated_at?: string | null
          id?: string
          message_volume?: number | null
          sentiment_velocity?: number | null
          success_1h?: boolean | null
          success_3h?: boolean | null
          success_eod?: boolean | null
          ticker: string
          time_window?: string | null
          z_score?: number | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          enriched_signal_id?: string | null
          evaluated_at?: string | null
          id?: string
          message_volume?: number | null
          sentiment_velocity?: number | null
          success_1h?: boolean | null
          success_3h?: boolean | null
          success_eod?: boolean | null
          ticker?: string
          time_window?: string | null
          z_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "signal_learning_log_enriched_signal_id_fkey"
            columns: ["enriched_signal_id"]
            isOneToOne: false
            referencedRelation: "enriched_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_learning_log_enriched_signal_id_fkey"
            columns: ["enriched_signal_id"]
            isOneToOne: false
            referencedRelation: "live_enriched_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_logs: {
        Row: {
          anomaly_score: number | null
          bullish_sentiment: number | null
          config_version: string | null
          created_at: string
          disparity_detected: boolean | null
          entry_reason: string | null
          id: string
          market_hours_confirmed: boolean | null
          message_concentration: number | null
          message_volume: number | null
          sentiment_shift_percent: number | null
          signal_confidence: string | null
          signal_timestamp: string
          signal_type: string
          ticker: string
          time_window: string | null
          trigger_details: Json
          user_concentration_percent: number | null
          user_diversity_score: number | null
          volume_anomaly_score: number | null
        }
        Insert: {
          anomaly_score?: number | null
          bullish_sentiment?: number | null
          config_version?: string | null
          created_at?: string
          disparity_detected?: boolean | null
          entry_reason?: string | null
          id?: string
          market_hours_confirmed?: boolean | null
          message_concentration?: number | null
          message_volume?: number | null
          sentiment_shift_percent?: number | null
          signal_confidence?: string | null
          signal_timestamp?: string
          signal_type: string
          ticker: string
          time_window?: string | null
          trigger_details: Json
          user_concentration_percent?: number | null
          user_diversity_score?: number | null
          volume_anomaly_score?: number | null
        }
        Update: {
          anomaly_score?: number | null
          bullish_sentiment?: number | null
          config_version?: string | null
          created_at?: string
          disparity_detected?: boolean | null
          entry_reason?: string | null
          id?: string
          market_hours_confirmed?: boolean | null
          message_concentration?: number | null
          message_volume?: number | null
          sentiment_shift_percent?: number | null
          signal_confidence?: string | null
          signal_timestamp?: string
          signal_type?: string
          ticker?: string
          time_window?: string | null
          trigger_details?: Json
          user_concentration_percent?: number | null
          user_diversity_score?: number | null
          volume_anomaly_score?: number | null
        }
        Relationships: []
      }
      signal_pattern_stats: {
        Row: {
          created_at: string
          id: string
          last_updated: string
          rounded_sentiment_velocity: number
          rounded_z_score: number
          signal_count: number
          success_count_1h: number
          success_count_3h: number
          success_count_eod: number
          success_rate_1h: number | null
          success_rate_3h: number | null
          success_rate_eod: number | null
          ticker: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_updated?: string
          rounded_sentiment_velocity: number
          rounded_z_score: number
          signal_count?: number
          success_count_1h?: number
          success_count_3h?: number
          success_count_eod?: number
          success_rate_1h?: number | null
          success_rate_3h?: number | null
          success_rate_eod?: number | null
          ticker: string
        }
        Update: {
          created_at?: string
          id?: string
          last_updated?: string
          rounded_sentiment_velocity?: number
          rounded_z_score?: number
          signal_count?: number
          success_count_1h?: number
          success_count_3h?: number
          success_count_eod?: number
          success_rate_1h?: number | null
          success_rate_3h?: number | null
          success_rate_eod?: number | null
          ticker?: string
        }
        Relationships: []
      }
      signal_success_audit_log: {
        Row: {
          change_1h: number | null
          change_3h: number | null
          change_eod: number | null
          created_at: string | null
          evaluation_timestamp: string
          id: string
          sentiment_type: string | null
          signal_detected_at: string
          signal_id: string | null
          success_1h: boolean | null
          success_3h: boolean | null
          success_eod: boolean | null
          ticker: string
          z_score: number | null
        }
        Insert: {
          change_1h?: number | null
          change_3h?: number | null
          change_eod?: number | null
          created_at?: string | null
          evaluation_timestamp?: string
          id?: string
          sentiment_type?: string | null
          signal_detected_at: string
          signal_id?: string | null
          success_1h?: boolean | null
          success_3h?: boolean | null
          success_eod?: boolean | null
          ticker: string
          z_score?: number | null
        }
        Update: {
          change_1h?: number | null
          change_3h?: number | null
          change_eod?: number | null
          created_at?: string | null
          evaluation_timestamp?: string
          id?: string
          sentiment_type?: string | null
          signal_detected_at?: string
          signal_id?: string | null
          success_1h?: boolean | null
          success_3h?: boolean | null
          success_eod?: boolean | null
          ticker?: string
          z_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "signal_success_audit_log_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "enriched_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_success_audit_log_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "live_enriched_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      stocktwits_api_usage: {
        Row: {
          api_key: string
          created_at: string
          id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      stocktwits_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_id: string
          owner_id: string | null
          processed_at: string | null
          sentiment: string | null
          ticker: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_id: string
          owner_id?: string | null
          processed_at?: string | null
          sentiment?: string | null
          ticker: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_id?: string
          owner_id?: string | null
          processed_at?: string | null
          sentiment?: string | null
          ticker?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stocktwits_messages_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stocktwits_messages_live: {
        Row: {
          body: string
          created_at: string | null
          created_at_stocktwits: string
          id: string
          message_id: string
          processed_at: string | null
          sentiment_confidence: number | null
          sentiment_label: string | null
          ticker: string
          user_id_stocktwits: string | null
          username: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          created_at_stocktwits: string
          id?: string
          message_id: string
          processed_at?: string | null
          sentiment_confidence?: number | null
          sentiment_label?: string | null
          ticker: string
          user_id_stocktwits?: string | null
          username?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          created_at_stocktwits?: string
          id?: string
          message_id?: string
          processed_at?: string | null
          sentiment_confidence?: number | null
          sentiment_label?: string | null
          ticker?: string
          user_id_stocktwits?: string | null
          username?: string | null
        }
        Relationships: []
      }
      ticker_sentiment: {
        Row: {
          bearish_count: number | null
          bullish_count: number | null
          confidence_band: string | null
          created_at: string | null
          id: string
          last_checked_at: string | null
          last_updated: string | null
          move_probability_score: number | null
          neutral_count: number | null
          polarity_shift_detected: boolean | null
          pump_risk_score: number | null
          sentiment_shift: number | null
          ticker: string
          time_weight: number | null
          total_messages: number | null
          user_diversity: number | null
          user_id: string | null
          volume_multiplier: number | null
          volume_z_score: number | null
        }
        Insert: {
          bearish_count?: number | null
          bullish_count?: number | null
          confidence_band?: string | null
          created_at?: string | null
          id?: string
          last_checked_at?: string | null
          last_updated?: string | null
          move_probability_score?: number | null
          neutral_count?: number | null
          polarity_shift_detected?: boolean | null
          pump_risk_score?: number | null
          sentiment_shift?: number | null
          ticker: string
          time_weight?: number | null
          total_messages?: number | null
          user_diversity?: number | null
          user_id?: string | null
          volume_multiplier?: number | null
          volume_z_score?: number | null
        }
        Update: {
          bearish_count?: number | null
          bullish_count?: number | null
          confidence_band?: string | null
          created_at?: string | null
          id?: string
          last_checked_at?: string | null
          last_updated?: string | null
          move_probability_score?: number | null
          neutral_count?: number | null
          polarity_shift_detected?: boolean | null
          pump_risk_score?: number | null
          sentiment_shift?: number | null
          ticker?: string
          time_weight?: number | null
          total_messages?: number | null
          user_diversity?: number | null
          user_id?: string | null
          volume_multiplier?: number | null
          volume_z_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ticker_sentiment_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticker_volume_history: {
        Row: {
          bearish_count: number
          bullish_count: number
          created_at: string
          id: string
          message_count: number
          neutral_count: number
          rolling_window_minutes: number | null
          ticker: string
          timestamp: string
          unique_users: number
        }
        Insert: {
          bearish_count?: number
          bullish_count?: number
          created_at?: string
          id?: string
          message_count?: number
          neutral_count?: number
          rolling_window_minutes?: number | null
          ticker: string
          timestamp?: string
          unique_users?: number
        }
        Update: {
          bearish_count?: number
          bullish_count?: number
          created_at?: string
          id?: string
          message_count?: number
          neutral_count?: number
          rolling_window_minutes?: number | null
          ticker?: string
          timestamp?: string
          unique_users?: number
        }
        Relationships: []
      }
      user_alert_configs: {
        Row: {
          created_at: string | null
          enable_notifications: boolean | null
          enable_polarity_detection: boolean | null
          enable_time_weighting: boolean | null
          id: string
          min_user_diversity: number | null
          pump_risk_threshold: number | null
          sentiment_shift_threshold: number | null
          sentiment_threshold: number | null
          time_window: number | null
          updated_at: string | null
          user_id: string
          volume_spike: number | null
          volume_z_score_threshold: number | null
        }
        Insert: {
          created_at?: string | null
          enable_notifications?: boolean | null
          enable_polarity_detection?: boolean | null
          enable_time_weighting?: boolean | null
          id?: string
          min_user_diversity?: number | null
          pump_risk_threshold?: number | null
          sentiment_shift_threshold?: number | null
          sentiment_threshold?: number | null
          time_window?: number | null
          updated_at?: string | null
          user_id: string
          volume_spike?: number | null
          volume_z_score_threshold?: number | null
        }
        Update: {
          created_at?: string | null
          enable_notifications?: boolean | null
          enable_polarity_detection?: boolean | null
          enable_time_weighting?: boolean | null
          id?: string
          min_user_diversity?: number | null
          pump_risk_threshold?: number | null
          sentiment_shift_threshold?: number | null
          sentiment_threshold?: number | null
          time_window?: number | null
          updated_at?: string | null
          user_id?: string
          volume_spike?: number | null
          volume_z_score_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_alert_configs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_watchlists: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          ticker: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          ticker: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          ticker?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_watchlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      live_enriched_signals: {
        Row: {
          change_1h: number | null
          change_3h: number | null
          change_eod: number | null
          confidence_score: number | null
          confidence_source: string | null
          created_at: string | null
          evaluation_status: string | null
          evaluation_timestamp: string | null
          failure_reason: string | null
          id: string | null
          is_simulated: boolean | null
          last_retry_at: string | null
          message_volume: number | null
          price_1h_later: number | null
          price_3h_later: number | null
          price_at_signal: number | null
          price_close: number | null
          price_eod: number | null
          price_high: number | null
          price_low: number | null
          price_metadata_status: string | null
          price_open: number | null
          price_volume: number | null
          replay_batch_id: string | null
          retry_count: number | null
          sentiment_type: string | null
          sentiment_velocity: number | null
          signal_detected_at: string | null
          source: string | null
          success_1h: boolean | null
          success_3h: boolean | null
          success_close: boolean | null
          success_eod: boolean | null
          success_high: boolean | null
          success_threshold: number | null
          ticker: string | null
          time_window: string | null
          z_score: number | null
        }
        Insert: {
          change_1h?: number | null
          change_3h?: number | null
          change_eod?: number | null
          confidence_score?: number | null
          confidence_source?: string | null
          created_at?: string | null
          evaluation_status?: string | null
          evaluation_timestamp?: string | null
          failure_reason?: string | null
          id?: string | null
          is_simulated?: boolean | null
          last_retry_at?: string | null
          message_volume?: number | null
          price_1h_later?: number | null
          price_3h_later?: number | null
          price_at_signal?: number | null
          price_close?: number | null
          price_eod?: number | null
          price_high?: number | null
          price_low?: number | null
          price_metadata_status?: string | null
          price_open?: number | null
          price_volume?: number | null
          replay_batch_id?: string | null
          retry_count?: number | null
          sentiment_type?: string | null
          sentiment_velocity?: number | null
          signal_detected_at?: string | null
          source?: string | null
          success_1h?: boolean | null
          success_3h?: boolean | null
          success_close?: boolean | null
          success_eod?: boolean | null
          success_high?: boolean | null
          success_threshold?: number | null
          ticker?: string | null
          time_window?: string | null
          z_score?: number | null
        }
        Update: {
          change_1h?: number | null
          change_3h?: number | null
          change_eod?: number | null
          confidence_score?: number | null
          confidence_source?: string | null
          created_at?: string | null
          evaluation_status?: string | null
          evaluation_timestamp?: string | null
          failure_reason?: string | null
          id?: string | null
          is_simulated?: boolean | null
          last_retry_at?: string | null
          message_volume?: number | null
          price_1h_later?: number | null
          price_3h_later?: number | null
          price_at_signal?: number | null
          price_close?: number | null
          price_eod?: number | null
          price_high?: number | null
          price_low?: number | null
          price_metadata_status?: string | null
          price_open?: number | null
          price_volume?: number | null
          replay_batch_id?: string | null
          retry_count?: number | null
          sentiment_type?: string | null
          sentiment_velocity?: number | null
          signal_detected_at?: string | null
          source?: string | null
          success_1h?: boolean | null
          success_3h?: boolean | null
          success_close?: boolean | null
          success_eod?: boolean | null
          success_high?: boolean | null
          success_threshold?: number | null
          ticker?: string | null
          time_window?: string | null
          z_score?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_daily_performance_metrics: {
        Args: { target_date?: string }
        Returns: undefined
      }
      extract_signal_date: {
        Args: { signal_detected_at: string }
        Returns: string
      }
      get_db_size: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_sentiment_baseline: {
        Args: { p_ticker: string; p_days?: number }
        Returns: {
          avg_message_count: number
          avg_bullish_ratio: number
          std_dev_message_count: number
          std_dev_bullish_ratio: number
        }[]
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      update_daily_message_volume: {
        Args: {
          p_ticker: string
          p_date: string
          p_message_count: number
          p_bullish_ratio?: number
          p_bearish_ratio?: number
          p_neutral_ratio?: number
        }
        Returns: undefined
      }
      update_price_tracking_record: {
        Args: { tracking_id: string; new_price: number; hours_after: number }
        Returns: undefined
      }
    }
    Enums: {
      user_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["admin", "user"],
    },
  },
} as const
