import type { UserSubscriptionWithDetails } from "~/types/database.friendly.types";
import { getSupabaseServiceClient } from "./supabase-service";

export async function runNotificationDispatcher() {
  const supabase = getSupabaseServiceClient();
  const { data: subscriptions, error: subError } = await supabase
    .from("user_subscriptions")
    .select(
      `
      *,
      profiles:user_id (discord_webhook_url),
      monitored_pairs!coin (active, last_trend_flip_daily_id, last_trend_flip_weekly_id, coin)
    `
    )
    .returns<UserSubscriptionWithDetails[]>();

  if (subError || !subscriptions)
    return { status: "no_subscriptions", error: subError };

  const sent = [];
  for (const sub of subscriptions) {
    if (!sub.monitored_pairs?.active) continue;

    if (!sub.profiles?.discord_webhook_url) continue;

    // Get the last notification for this subscription (user_id, coin, timeframe)
    // We join with events to filter by coin and timeframe
    const { data: lastNotif } = await supabase
      .from("notification_history")
      .select("id, event_id, events!inner(created_at, coin, timeframe)")
      .eq("user_id", sub.user_id)
      .eq("events.coin", sub.coin)
      .eq("events.timeframe", sub.timeframe)
      .order("events(created_at)", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastCreatedAt =
      lastNotif?.events?.created_at || "1970-01-01T00:00:00Z";

    // Get all events since the last notification
    const { data: pendingEvents } = await supabase
      .from("events")
      .select("*")
      .eq("coin", sub.coin)
      .eq("timeframe", sub.timeframe)
      .gt("created_at", lastCreatedAt)
      .order("created_at", { ascending: true });

    if (!pendingEvents || pendingEvents.length === 0) continue;

    for (const event of pendingEvents) {
      const message = `${sub.coin} ${
        sub.timeframe
      } trend flipped to **${event.status.toUpperCase()}**!`;
      try {
        await $fetch(sub.profiles.discord_webhook_url, {
          method: "POST",
          body: {
            content: message,
            embeds: [
              {
                title: `Trend Flip Alert: ${sub.coin}`,
                description: message,
                color: event.status === "bullish" ? 0x00ff00 : 0xff0000,
                timestamp: new Date(event.since).toISOString(),
              },
            ],
          },
        });

        await supabase.from("notification_history").insert({
          user_id: sub.user_id,
          event_id: event.id,
          message,
        });

        sent.push({ user_id: sub.user_id, coin: sub.coin });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("Dispatcher error:", errorMsg);
      }
    }
  }
  return { status: "ok", sent: sent.length };
}
