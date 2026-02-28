import { HyperliquidClient } from "#shared/hyperliquid";
import {
  determineTrend,
  isCandleClosed,
  calculateStartTime,
} from "#shared/trends";
import { CANDLE_COUNT } from "#shared/constants";
import type { Timeframe, HyperliquidCandle } from "#shared/types";
import type { TablesUpdate } from "~/types/database.types";
import { getSupabaseServiceClient } from "./supabase-service";

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

    // Find the last closed candle
    let lastClosedCandleIdx = candles.length - 1;
    if (!isCandleClosed(timeframe, candles[lastClosedCandleIdx]!.t)) {
      lastClosedCandleIdx--;
    }

    if (lastClosedCandleIdx < 0) {
      return { status: "no_closed_candles", coin, timeframe };
    }

    const lastClosedCandle = candles[lastClosedCandleIdx]!;
    const lastCandleTime = new Date(lastClosedCandle.t).toISOString();

    // Run determineTrend (using candles up to the last closed one)
    const candlesToAnalyze = candles.slice(0, lastClosedCandleIdx + 1);
    const currentTrend = determineTrend(coin, timeframe, candlesToAnalyze);
    if (!currentTrend) {
      return { status: "error", coin, message: "trend calculation failed" };
    }

    // Check current status in trends table (one row per coin/timeframe)
    const { data: existingTrend } = await supabase
      .from("trends")
      .select("status, timestamp")
      .eq("coin", coin)
      .eq("timeframe", timeframe)
      .maybeSingle();

    let isFlip = false;
    let eventId: string | null = null;

    // 1. Update the trends table using upsert (PK is [coin, timeframe])
    const { error: trendUpsertError } = await supabase
      .from("trends")
      .upsert({
        coin,
        timeframe,
        status: currentTrend.status,
        timestamp: lastCandleTime,
      });

    if (trendUpsertError) {
      return { status: "error", coin, message: "trends upsert failed", error: trendUpsertError };
    }

    // 2. Determine if it's a flip and create an event if so
    if (!existingTrend || existingTrend.status !== currentTrend.status) {
      isFlip = true;
      const { data: newEvent, error: eventError } = await supabase
        .from("events")
        .insert({
          coin,
          timeframe,
          status: currentTrend.status,
          timestamp: lastCandleTime,
        })
        .select()
        .single();
      
      if (eventError || !newEvent) {
        return { status: "error", coin, message: "events insert failed", error: eventError };
      }
      eventId = newEvent.id;
    }

    // 3. Update monitored_pairs using upsert (PK is coin)
    const updates = {
      coin,
      last_analyzed: new Date().toISOString(),
      last_updated: isFlip && eventId ? new Date().toISOString() : undefined,
      last_trend_flip_daily_id: isFlip && eventId && timeframe === "D1" ? eventId : undefined,
      last_trend_flip_weekly_id: isFlip && eventId && timeframe === "W1" ? eventId : undefined,
    };

    const { error: monitoredPairError } = await supabase
      .from("monitored_pairs")
      .upsert(updates);

    if (monitoredPairError) {
      return { status: "error", coin, message: "monitored_pairs upsert failed", error: monitoredPairError };
    }

    return {
      status: isFlip ? "trend_flipped" : "trend_updated",
      coin,
      timeframe,
      newStatus: currentTrend.status,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "error", coin, message };
  }
}
