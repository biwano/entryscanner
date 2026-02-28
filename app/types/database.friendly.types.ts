import type { Tables, TablesInsert, TablesUpdate } from "./database.types";

// Base Row Types
export type Profile = Tables<"profiles">;
export type UserSystem = Tables<"user_system">;
export type UserSubscription = Tables<"user_subscriptions">;
export type MonitoredPair = Tables<"monitored_pairs">;
export type Trend = Tables<"trends">;
export type Event = Tables<"events">;
export type NotificationHistory = Tables<"notification_history">;

// Insert Types
export type ProfileInsert = TablesInsert<"profiles">;
export type UserSystemInsert = TablesInsert<"user_system">;
export type UserSubscriptionInsert = TablesInsert<"user_subscriptions">;
export type MonitoredPairInsert = TablesInsert<"monitored_pairs">;
export type TrendInsert = TablesInsert<"trends">;
export type EventInsert = TablesInsert<"events">;
export type NotificationHistoryInsert = TablesInsert<"notification_history">;

// Update Types
export type ProfileUpdate = TablesUpdate<"profiles">;
export type UserSystemUpdate = TablesUpdate<"user_system">;
export type UserSubscriptionUpdate = TablesUpdate<"user_subscriptions">;
export type MonitoredPairUpdate = TablesUpdate<"monitored_pairs">;
export type TrendUpdate = TablesUpdate<"trends">;
export type EventUpdate = TablesUpdate<"events">;
export type NotificationHistoryUpdate = TablesUpdate<"notification_history">;

// Composite Types for Joins

/**
 * MonitoredPair with its associated last trend flips joined from the events table.
 */
export type MonitoredPairWithTrends = MonitoredPair & {
  last_trend_flip_daily: Event | null;
  last_trend_flip_weekly: Event | null;
};

/**
 * UserSubscription with its associated profile (discord_webhook_url)
 * and its associated monitored pair details.
 */
export type UserSubscriptionWithDetails = UserSubscription & {
  profiles: Pick<Profile, "discord_webhook_url"> | null;
  monitored_pairs:
    | (Pick<
        MonitoredPair,
        "active" | "last_trend_flip_daily_id" | "last_trend_flip_weekly_id"
      > & {
        coin: string;
      })
    | null;
};

/**
 * Trend with the related monitored pair metadata.
 */
export type TrendWithPair = Trend & {
  monitored_pairs: MonitoredPair | null;
};
