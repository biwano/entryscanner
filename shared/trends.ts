import { SMA } from "technicalindicators";
import type { Timeframe, TrendStatus, HyperliquidCandle } from "./types";
import { CANDLE_COUNT, SMA_PERIOD_FAST } from "./constants";

export function calculateStartTime(
  timeframe: Timeframe,
  candleCount: number = CANDLE_COUNT
): number {
  const now = Date.now();
  if (timeframe === "D1") {
    return now - candleCount * 24 * 60 * 60 * 1000;
  } else if (timeframe === "W1") {
    return now - candleCount * 7 * 24 * 60 * 60 * 1000;
  }
  return now;
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
): TrendStatus | null {
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
      since: candles[0]!.t,
    };
  }

  const lastClose = closePrices[closePrices.length - 1]!;
  const lastSma = smas[smas.length - 1]!;

  const status = lastClose > lastSma ? "bullish" : "bearish";

  // Find since when the trend flipped
  // With padding, smas[i] corresponds directly to candles[i]
  let since = candles[candles.length - 1]!.t;
  for (let i = closePrices.length - 1; i >= 0; i--) {
    const currentPrice = closePrices[i]!;
    const currentSma = smas[i]!;

    const currentStatus = currentPrice > currentSma ? "bullish" : "bearish";

    if (currentStatus === status) {
      since = candles[i]!.t;
    } else {
      break;
    }
  }

  return {
    coin,
    timeframe,
    status,
    since,
  };
}

export function isCandleClosed(
  timeframe: Timeframe,
  candleTimestamp: number
): boolean {
  const now = Date.now();
  const candleStart = candleTimestamp;

  if (timeframe === "D1") {
    const oneDayMs = 24 * 60 * 60 * 1000;
    return now >= candleStart + oneDayMs;
  } else if (timeframe === "W1") {
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    return now >= candleStart + oneWeekMs;
  }
  return false;
}
