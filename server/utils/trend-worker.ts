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

    // Check if there is an entry in the database for that last candle
    const { data: existingTrend } = await supabase
      .from("trends")
      .select("id, status")
      .eq("coin", coin)
      .eq("timeframe", timeframe)
      .eq("timestamp", lastCandleTime)
      .maybeSingle();

    if (existingTrend) {
      await supabase
        .from("monitored_pairs")
        .update({ last_analyzed: new Date().toISOString() })
        .eq("id", pair.id);
      return { status: "already_processed", coin, timeframe };
    }

    // If not run determineTrend (using candles up to the last closed one)
    const candlesToAnalyze = candles.slice(0, lastClosedCandleIdx + 1);
    const currentTrend = determineTrend(coin, timeframe, candlesToAnalyze);
    if (!currentTrend) {
      return { status: "error", coin, message: "trend calculation failed" };
    }

    // Create the trend entry for this candle
    const { data: newTrend, error: insertError } = await supabase
      .from("trends")
      .insert({
        coin,
        timeframe,
        status: currentTrend.status,
        timestamp: lastCandleTime,
      })
      .select()
      .single();

    if (insertError || !newTrend) {
      return { status: "error", coin, message: "insert failed", error: insertError };
    }

    // Update monitored pairs if necessary (if trend status flipped compared to previous recorded flip)
    const trendFlipColumn =
      timeframe === "D1"
        ? "last_trend_flip_daily_id"
        : "last_trend_flip_weekly_id";
    const lastTrendFlipId = pair[trendFlipColumn];

    let isFlip = false;
    if (!lastTrendFlipId) {
      isFlip = true;
    } else {
      const { data: lastFlipRecord } = await supabase
        .from("trends")
        .select("status")
        .eq("id", lastTrendFlipId)
        .single();
      
      if (lastFlipRecord && lastFlipRecord.status !== currentTrend.status) {
        isFlip = true;
      }
    }

    const updates: TablesUpdate<"monitored_pairs"> = {
      last_analyzed: new Date().toISOString(),
    };

    if (isFlip) {
      updates.last_updated = new Date().toISOString();
      if (timeframe === "D1") {
        updates.last_trend_flip_daily_id = newTrend.id;
      } else {
        updates.last_trend_flip_weekly_id = newTrend.id;
      }
    }

    await supabase
      .from("monitored_pairs")
      .update(updates)
      .eq("id", pair.id);

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
