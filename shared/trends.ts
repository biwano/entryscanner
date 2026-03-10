import { SMA } from "technicalindicators";
import type { Timeframe, HyperliquidCandle, TrendAnalysis, TrendFlip } from "./types.js";
import { CANDLE_COUNT, SMA_PERIOD_FAST } from "./constants.js";
import dayjs from "dayjs";

export function calculateStartTime(
  timeframe: Timeframe,
  candleCount: number = CANDLE_COUNT
): number {
  const now = dayjs();

  if (timeframe === "D1") {
    return now.startOf("day").subtract(candleCount, "day").valueOf();
  } else if (timeframe === "W1") {
    // Hyperliquid weeks start on Monday
    return now.startOf("week").subtract(candleCount, "week").valueOf();
  }
  return now.valueOf();
}

export function calculateSMA(prices: number[], period: number = SMA_PERIOD_FAST): number[] {
  if (prices.length === 0) return [];
  // Pad the input prices with the first price to ensure the output has the same length as the input
  const padding = Array(period - 1).fill(prices[0]);
  const paddedPrices = [...padding, ...prices];
  return SMA.calculate({ period, values: paddedPrices });
}

export function determineTrend(
  coin: string,
  timeframe: Timeframe,
  candles: HyperliquidCandle[] // From InfoClient.candleSnapshot
): TrendAnalysis | null {
  if (candles.length === 0) {
    return null;
  }

  const closePrices = candles.map((c) => parseFloat(c.c));
  const smas = calculateSMA(closePrices, SMA_PERIOD_FAST);

  if (closePrices.length === 0 || smas.length === 0) {
    return {
      coin,
      timeframe,
      status: "bearish",
      timestamp: dayjs(candles[0]!.t).toISOString(),
      flips: [],
    };
  }

  const flips: TrendFlip[] = [];
  let currentStatus: "bullish" | "bearish" | null = null;
  const duration = timeframe === "D1" ? "day" : "week";

  // Traverse from earliest to latest to find all flips
  for (let i = 0; i < closePrices.length; i++) {
    const price = closePrices[i]!;
    const sma = smas[i]!;
    const status = price > sma ? "bullish" : "bearish";

    if (currentStatus === null) {
      currentStatus = status;
      // We don't necessarily count the first candle as a "flip"
      // but we need to know where the initial trend starts
      continue;
    }

    if (status !== currentStatus) {
      // Trend flipped!
      currentStatus = status;
      const flipTimestamp = dayjs(candles[i]!.t).add(1, duration).toISOString();
      flips.push({
        status,
        timestamp: flipTimestamp,
      });
    }
  }

  const lastClose = closePrices[closePrices.length - 1]!;
  const lastSma = smas[smas.length - 1]!;
  const finalStatus = lastClose > lastSma ? "bullish" : "bearish";

  // Find the latest flip timestamp for backwards compatibility
  let latestFlipTimestamp = candles[0] ? dayjs(candles[0].t).toISOString() : dayjs().toISOString();
  if (flips.length > 0) {
    latestFlipTimestamp = flips[flips.length - 1]!.timestamp;
  } else {
    // If no flips found, the trend started at the beginning of the candles
    latestFlipTimestamp = dayjs(candles[0]!.t).add(1, duration).toISOString();
  }

  return {
    coin,
    timeframe,
    status: finalStatus,
    timestamp: latestFlipTimestamp,
    flips,
  };
}

export function isCandleClosed(
  timeframe: Timeframe,
  candleTimestamp: number
): boolean {
  const now = dayjs();
  const candleStart = dayjs(candleTimestamp);

  if (timeframe === "D1") {
    return now.isAfter(candleStart.add(1, "day")) || now.isSame(candleStart.add(1, "day"));
  } else if (timeframe === "W1") {
    return now.isAfter(candleStart.add(1, "week")) || now.isSame(candleStart.add(1, "week"));
  }
  return false;
}
