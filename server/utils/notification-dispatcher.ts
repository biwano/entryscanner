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

    const trendId =
      sub.timeframe === "D1"
        ? sub.monitored_pairs?.last_trend_flip_daily_id
        : sub.monitored_pairs?.last_trend_flip_weekly_id;

    if (!trendId || !sub.profiles?.discord_webhook_url) continue;

    const { data: existingNotif } = await supabase
      .from("notification_history")
      .select("id")
      .eq("user_id", sub.user_id)
      .eq("trend_id", trendId)
      .maybeSingle();

    if (existingNotif) continue;

    const { data: trend } = await supabase
      .from("trends")
      .select("*")
      .eq("id", trendId)
      .single();

    if (!trend) continue;

    const message = `${sub.coin} ${
      sub.timeframe
    } trend flipped to **${trend.status.toUpperCase()}**!`;
    try {
      await $fetch(sub.profiles.discord_webhook_url, {
        method: "POST",
        body: {
          content: message,
          embeds: [
            {
              title: `Trend Flip Alert: ${sub.coin}`,
              description: message,
              color: trend.status === "bullish" ? 0x00ff00 : 0xff0000,
              timestamp: new Date(trend.since).toISOString(),
            },
          ],
        },
      });

      await supabase.from("notification_history").insert({
        user_id: sub.user_id,
        trend_id: trend.id,
        message,
      });

      sent.push({ user_id: sub.user_id, coin: sub.coin });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("Dispatcher error:", errorMsg);
    }
  }
  return { status: "ok", sent: sent.length };
}
