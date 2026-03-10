import { HyperliquidClient } from "#shared/hyperliquid.js";
import {
  determineTrend,
  isCandleClosed,
  calculateStartTime,
} from "#shared/trends.js";
import { CANDLE_COUNT } from "#shared/constants.js";
import type { Timeframe, HyperliquidCandle } from "#shared/types.js";
import type { TablesInsert } from "~/types/database.types.js";
import { getSupabaseServiceClient } from "./supabase-service.js";
import dayjs from "dayjs";

type SupabaseClient = ReturnType<typeof getSupabaseServiceClient>;

export async function processTimeframe(
  supabase: SupabaseClient,
  client: HyperliquidClient,
  coin: string,
  timeframe: Timeframe,
  updates: TablesInsert<"monitored_pairs">
) {
  const interval = timeframe === "D1" ? "1d" : "1w";
  const startTime = calculateStartTime(timeframe, CANDLE_COUNT);

  try {
    const candlesResponse = await client.fetchCandles(
      coin,
      interval,
      startTime
    );
    const candles: HyperliquidCandle[] = candlesResponse;

    if (!candles || candles.length === 0) {
      return { status: "error", timeframe, message: "no candles" };
    }

    // Find the last closed candle
    let lastClosedCandleIdx = candles.length - 1;
    if (!isCandleClosed(timeframe, candles[lastClosedCandleIdx]!.t)) {
      lastClosedCandleIdx--;
    }

    if (lastClosedCandleIdx < 0) {
      return { status: "no_closed_candles", timeframe };
    }

    const lastClosedCandle = candles[lastClosedCandleIdx]!;
    const duration = timeframe === "D1" ? "day" : "week";
    const lastCandleTime = dayjs(lastClosedCandle.t)
      .add(1, duration)
      .toISOString();

    // Run determineTrend (using candles up to the last closed one)
    const candlesToAnalyze = candles.slice(0, lastClosedCandleIdx + 1);
    const currentTrend = determineTrend(coin, timeframe, candlesToAnalyze);
    if (!currentTrend) {
      return {
        status: "error",
        timeframe,
        message: "trend calculation failed",
      };
    }

    // Check current status in trends table (one row per coin/timeframe)
    const { data: existingTrend } = await supabase
      .from("trends")
      .select("status, timestamp")
      .eq("coin", coin)
      .eq("timeframe", timeframe)
      .maybeSingle();

    // 1. Update the trends table using upsert (PK is [coin, timeframe])
    const { error: trendUpsertError } = await supabase.from("trends").upsert({
      coin,
      timeframe,
      status: currentTrend.status,
      timestamp: lastCandleTime,
      price_at_flip: currentTrend.price_at_flip,
    });

    if (trendUpsertError) {
      return {
        status: "error",
        timeframe,
        message: "trends upsert failed",
        error: trendUpsertError,
      };
    }

    // 2. Determine if it's a flip and create an event if so
    if (!existingTrend || existingTrend.status !== currentTrend.status) {
      const { data: newEvent, error: eventError } = await supabase
        .from("events")
        .insert({
          coin,
          timeframe,
          status: currentTrend.status,
          timestamp: lastCandleTime,
          since: currentTrend.timestamp,
          price_at_flip: currentTrend.price_at_flip,
        })
        .select()
        .single();

      if (eventError || !newEvent) {
        return {
          status: "error",
          timeframe,
          message: "events insert failed",
          error: eventError,
        };
      }

      // Record the event ID to update monitored_pairs later
      if (timeframe === "D1") {
        updates.last_trend_flip_daily_id = newEvent.id;
      } else if (timeframe === "W1") {
        updates.last_trend_flip_weekly_id = newEvent.id;
      }

      return {
        status: "trend_flipped",
        timeframe,
        newStatus: currentTrend.status,
        isFlip: true,
        lastClosedCandle,
      };
    } else {
      return {
        status: "trend_updated",
        timeframe,
        newStatus: currentTrend.status,
        isFlip: false,
        lastClosedCandle,
      };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "error", timeframe, message };
  }
}

export async function runTrendWorker() {
  const supabase = getSupabaseServiceClient();
  const client = new HyperliquidClient();

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
  const timeframes: Timeframe[] = ["D1", "W1"];
  const results = [];
  let anyFlip = false;

  const updates: TablesInsert<"monitored_pairs"> = {
    coin,
    last_analyzed: dayjs().toISOString(),
  };

  for (const timeframe of timeframes) {
    const result = await processTimeframe(
      supabase,
      client,
      coin,
      timeframe,
      updates
    );
    results.push(result);
    if ("isFlip" in result && result.isFlip) {
      anyFlip = true;
    }
  }

  // Update last_updated if any flip occurred during this run
  if (anyFlip) {
    updates.last_updated = dayjs().toISOString();
  }

  // 3. Update monitored_pairs (primary key is coin)
  const { error: monitoredPairError } = await supabase
    .from("monitored_pairs")
    .upsert(updates);

  if (monitoredPairError) {
    return {
      status: "error",
      coin,
      message: "monitored_pairs upsert failed",
      error: monitoredPairError,
      results,
    };
  }

  return {
    status: "completed",
    coin,
    results,
  };
}
