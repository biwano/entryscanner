import { createClient } from "@supabase/supabase-js";
import { HyperliquidClient } from "#shared/hyperliquid";
import {
  determineTrend,
  isCandleClosed,
  calculateStartTime,
} from "#shared/trends";
import { CANDLE_COUNT } from "#shared/constants";
import type { Timeframe, HyperliquidCandle } from "#shared/types";
import type { Database, TablesUpdate } from "~/types/database.types";
import type {
  MonitoredPair,
  Trend,
  UserSubscriptionWithDetails,
} from "~/types/database.friendly.types";

// Supabase client for Nitro tasks (using environment variables)
const getSupabaseServiceClient = () => {
  const config = useRuntimeConfig();
  const publicConfig = config.public as any;
  const privateConfig = config as any;

  return createClient<Database>(
    publicConfig.supabase.url,
    process.env.SUPABASE_SERVICE_KEY || privateConfig.supabase.serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

export async function runTrendWorker() {
  const supabase = getSupabaseServiceClient();
  const client = new HyperliquidClient();

  const timeframe: Timeframe = Math.random() > 0.5 ? "D1" : "W1";

  const { data: pair, error: pairError } = await supabase
    .from("monitored_pairs")
    .select("*")
    .eq("active", true)
    .order("last_analyzed", { ascending: true, nullsFirst: true })
    .limit(1)
    .single();

  if (pairError || !pair) {
    return { status: "no_pairs", error: pairError };
  }

  const coin = pair.coin;
  const interval = timeframe === "D1" ? "1d" : "1w";
  const startTime = calculateStartTime(timeframe, CANDLE_COUNT);

  try {
    const candlesResponse = await client.fetchCandles(
      coin,
      interval,
      startTime
    );
    const candles: HyperliquidCandle[] = candlesResponse;

    if (!candles || candles.length === 0)
      return { status: "error", coin, message: "no candles" };

    const lastCandle = candles[candles.length - 1]!;
    if (!isCandleClosed(timeframe, lastCandle.t)) {
      await supabase
        .from("monitored_pairs")
        .update({ last_analyzed: new Date().toISOString() })
        .eq("id", pair.id);
      return { status: "candle_not_closed", coin, timeframe };
    }

    const currentTrend = determineTrend(coin, timeframe, candles);
    const trendFlipColumn =
      timeframe === "D1"
        ? "last_trend_flip_daily_id"
        : "last_trend_flip_weekly_id";
    const lastTrendFlipId = pair[trendFlipColumn];

    let needsFlip = false;
    if (!lastTrendFlipId) {
      needsFlip = true;
    } else {
      const { data: lastTrend } = await supabase
        .from("trends")
        .select("*")
        .eq("id", lastTrendFlipId)
        .single();
      if (!lastTrend || lastTrend.status !== currentTrend.status) {
        needsFlip = true;
      }
    }

    if (needsFlip) {
      const { data: newTrend, error: insertError } = await supabase
        .from("trends")
        .insert({
          coin,
          timeframe,
          status: currentTrend.status,
          since: new Date(currentTrend.since).toISOString(),
        })
        .select()
        .single();

      if (!insertError && newTrend) {
        const updates: TablesUpdate<"monitored_pairs"> = {
          last_analyzed: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        };
        if (timeframe === "D1") {
          updates.last_trend_flip_daily_id = newTrend.id;
        } else {
          updates.last_trend_flip_weekly_id = newTrend.id;
        }
        await supabase
          .from("monitored_pairs")
          .update(updates)
          .eq("id", pair.id);
        return {
          status: "trend_flipped",
          coin,
          timeframe,
          newStatus: currentTrend.status,
        };
      }
    }

    await supabase
      .from("monitored_pairs")
      .update({ last_analyzed: new Date().toISOString() })
      .eq("id", pair.id);
    return { status: "no_flip", coin, timeframe };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "error", coin, message };
  }
}

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
