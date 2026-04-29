export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      events: {
        Row: {
          coin: string
          created_at: string
          id: string
          notifications_created: boolean
          price_at_flip: number | null
          since: string | null
          status: string
          timeframe: string
          timestamp: string
        }
        Insert: {
          coin: string
          created_at?: string
          id?: string
          notifications_created?: boolean
          price_at_flip?: number | null
          since?: string | null
          status: string
          timeframe: string
          timestamp: string
        }
        Update: {
          coin?: string
          created_at?: string
          id?: string
          notifications_created?: boolean
          price_at_flip?: number | null
          since?: string | null
          status?: string
          timeframe?: string
          timestamp?: string
        }
        Relationships: []
      }
      monitored_pairs: {
        Row: {
          active: boolean
          coin: string
          created_at: string | null
          last_analyzed: string | null
          last_trend_flip_daily_id: string | null
          last_trend_flip_weekly_id: string | null
          last_updated: string | null
        }
        Insert: {
          active?: boolean
          coin: string
          created_at?: string | null
          last_analyzed?: string | null
          last_trend_flip_daily_id?: string | null
          last_trend_flip_weekly_id?: string | null
          last_updated?: string | null
        }
        Update: {
          active?: boolean
          coin?: string
          created_at?: string | null
          last_analyzed?: string | null
          last_trend_flip_daily_id?: string | null
          last_trend_flip_weekly_id?: string | null
          last_updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_last_trend_daily"
            columns: ["last_trend_flip_daily_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_last_trend_weekly"
            columns: ["last_trend_flip_weekly_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_history: {
        Row: {
          event_id: string
          id: string
          message: string | null
          sent_at: string | null
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          message?: string | null
          sent_at?: string | null
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          message?: string | null
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          discord_webhook_url: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          discord_webhook_url?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          discord_webhook_url?: string | null
          id?: string
        }
        Relationships: []
      }
      stats: {
        Row: {
          created_at: string
          day: string
          pairs_bearish_daily: number
          pairs_bearish_weekly: number
          pairs_bullish_daily: number
          pairs_bullish_weekly: number
          pairs_total: number
        }
        Insert: {
          created_at?: string
          day: string
          pairs_bearish_daily?: number
          pairs_bearish_weekly?: number
          pairs_bullish_daily?: number
          pairs_bullish_weekly?: number
          pairs_total?: number
        }
        Update: {
          created_at?: string
          day?: string
          pairs_bearish_daily?: number
          pairs_bearish_weekly?: number
          pairs_bullish_daily?: number
          pairs_bullish_weekly?: number
          pairs_total?: number
        }
        Relationships: []
      }
      trends: {
        Row: {
          coin: string
          created_at: string | null
          price_at_flip: number | null
          status: string
          timeframe: string
          timestamp: string
        }
        Insert: {
          coin: string
          created_at?: string | null
          price_at_flip?: number | null
          status: string
          timeframe: string
          timestamp: string
        }
        Update: {
          coin?: string
          created_at?: string | null
          price_at_flip?: number | null
          status?: string
          timeframe?: string
          timestamp?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          coin: string
          created_at: string | null
          id: string
          timeframe: string
          user_id: string
        }
        Insert: {
          coin: string
          created_at?: string | null
          id?: string
          timeframe: string
          user_id: string
        }
        Update: {
          coin?: string
          created_at?: string | null
          id?: string
          timeframe?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_coin_fkey"
            columns: ["coin"]
            isOneToOne: false
            referencedRelation: "monitored_pairs"
            referencedColumns: ["coin"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sub_accounts: {
        Row: {
          created_at: string | null
          hl_api_key: string
          hl_wallet_address: string
          id: string
          label: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hl_api_key: string
          hl_wallet_address: string
          id?: string
          label: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          hl_api_key?: string
          hl_wallet_address?: string
          id?: string
          label?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sub_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_system: {
        Row: {
          created_at: string | null
          id: string
          is_admin: boolean
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_admin?: boolean
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_trades: {
        Row: {
          coin: string | null
          created_at: string | null
          direction: string | null
          id: string
          leverage: number | null
          status: string
          stop_loss_price: number
          take_profit_price: number
          updated_at: string | null
        }
        Insert: {
          coin?: string | null
          created_at?: string | null
          direction?: string | null
          id: string
          leverage?: number | null
          status?: string
          stop_loss_price?: number
          take_profit_price?: number
          updated_at?: string | null
        }
        Update: {
          coin?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          leverage?: number | null
          status?: string
          stop_loss_price?: number
          take_profit_price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
