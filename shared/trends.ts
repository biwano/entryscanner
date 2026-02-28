import { SMA } from "technicalindicators";
import type { Timeframe, HyperliquidCandle } from "./types";
import type { Trend } from "~/types/database.friendly.types";
import { CANDLE_COUNT, SMA_PERIOD_FAST } from "./constants";
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
): Pick<Trend, "coin" | "timeframe" | "status" | "timestamp"> | null {
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
    };
  }

  const lastClose = closePrices[closePrices.length - 1]!;
  const lastSma = smas[smas.length - 1]!;

  const status = lastClose > lastSma ? "bullish" : "bearish";

  // Find when the trend flipped
  // With padding, smas[i] corresponds directly to candles[i]
  let timestamp = candles[candles.length - 1]!.t;
  for (let i = closePrices.length - 1; i >= 0; i--) {
    const currentPrice = closePrices[i]!;
    const currentSma = smas[i]!;

    const currentStatus = currentPrice > currentSma ? "bullish" : "bearish";

    if (currentStatus === status) {
      timestamp = candles[i]!.t;
    } else {
      break;
    }
  }

  return {
    coin,
    timeframe,
    status,
    timestamp: dayjs(timestamp).toISOString(),
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
