import { HyperliquidClient } from "~~shared/hyperliquid.js";
import { determineTrend, calculateStartTime } from "~~shared/trends.js";
import { CANDLE_COUNT } from "~~shared/constants.js";
import type { Timeframe } from "~~shared/types.js";
import { getSupabaseServiceClient } from "./supabase-service.js";
import dayjs from "dayjs";

export async function runRecoverWorker() {
  const supabase = getSupabaseServiceClient();
  const client = new HyperliquidClient();

  // 1. Get all active monitored pairs
  const { data: pairs, error: pairsError } = await supabase
    .from("monitored_pairs")
    .select("coin")
    .eq("active", true);

  if (pairsError || !pairs) {
    return { status: "error", message: "Failed to fetch monitored pairs", error: pairsError };
  }

  const results: any[] = [];
  const timeframes: Timeframe[] = ["D1", "W1"];

  for (const pair of pairs) {
    const coin = pair.coin;
    const coinResults: any = { coin, timeframes: {} };

    for (const timeframe of timeframes) {
      const interval = timeframe === "D1" ? "1d" : "1w";
      const startTime = calculateStartTime(timeframe, CANDLE_COUNT);

      try {
        const candles = await client.fetchCandles(coin, interval, startTime);
        if (!candles || candles.length === 0) {
          coinResults.timeframes[timeframe] = { status: "no_candles" };
          continue;
        }

        const trendAnalysis = determineTrend(coin, timeframe, candles);
        if (!trendAnalysis || !trendAnalysis.flips) {
          coinResults.timeframes[timeframe] = { status: "no_flips_detected" };
          continue;
        }

        // Fetch existing events for this coin and timeframe to avoid duplicates
        const { data: existingEvents, error: eventsError } = await supabase
          .from("events")
          .select("status, since")
          .eq("coin", coin)
          .eq("timeframe", timeframe);

        if (eventsError) {
          coinResults.timeframes[timeframe] = { status: "error", message: "Failed to fetch existing events", error: eventsError };
          continue;
        }

        const createdEvents = [];
        for (const flip of trendAnalysis.flips) {
          // Check if this flip already exists (matching coin, timeframe, status, and since)
          const exists = existingEvents?.some(
            (e) => e.status === flip.status && dayjs(e.since).isSame(dayjs(flip.timestamp))
          );

          if (!exists) {
            const { data: newEvent, error: insertError } = await supabase
              .from("events")
              .insert({
                coin,
                timeframe,
                status: flip.status,
                timestamp: flip.timestamp, // For recovered events, use flip timestamp for both
                since: flip.timestamp,
                price_at_flip: flip.price,
                notifications_created: true, // Mark as already notified for recovered events
              })
              .select()
              .single();

            if (insertError) {
              console.error(`Failed to insert recovered event for ${coin} ${timeframe}:`, insertError);
            } else {
              createdEvents.push(newEvent);
            }
          }
        }

        coinResults.timeframes[timeframe] = {
          status: "success",
          detected_flips: trendAnalysis.flips.length,
          new_events_created: createdEvents.length,
        };
      } catch (err: any) {
        coinResults.timeframes[timeframe] = { status: "error", message: err.message };
      }
    }
    results.push(coinResults);
  }

  return {
    status: "completed",
    processed_pairs: pairs.length,
    results,
  };
}
