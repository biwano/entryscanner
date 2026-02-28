import { EMA } from 'technicalindicators';
import type { Timeframe, TrendStatus, HyperliquidCandle } from './types';

export function calculateEMA(prices: number[], period: number = 200): number[] {
  if (prices.length < period) return [];
  return EMA.calculate({ period, values: prices });
}

export function determineTrend(
  coin: string,
  timeframe: Timeframe,
  candles: HyperliquidCandle[] // From InfoClient.candleSnapshot
): TrendStatus {
  if (candles.length < 200) {
    // Not enough data for EMA 200
    // Default to bearish or handle as "unknown"
    return {
      coin,
      timeframe,
      status: 'bearish',
      since: candles[0]?.t || Date.now()
    };
  }

  const closePrices = candles.map(c => parseFloat(c.c));
  const emas = calculateEMA(closePrices, 200);
  
  const lastClose = closePrices[closePrices.length - 1];
  const lastEma = emas[emas.length - 1];
  
  const status = lastClose > lastEma ? 'bullish' : 'bearish';
  
  // Find since when the trend flipped
  // For simplicity, we can iterate backwards to find the flip point
  let flipIndex = candles.length - 1;
  for (let i = closePrices.length - 1; i >= 200; i--) {
    const currentPrice = closePrices[i];
    const currentEma = emas[i - 200]; // technicalindicators EMA returns values starting from period-1
    // Wait, let's check how EMA.calculate works. 
    // If period is 200, the first element of emas corresponds to the 200th price.
  }
  
  // Simplified since calculation: find the first candle in the current trend
  let since = candles[candles.length - 1].t;
  for (let i = closePrices.length - 1; i >= 0; i--) {
      const emasIdx = i - (200 - 1);
      if (emasIdx < 0) break;
      
      const currentPrice = closePrices[i];
      const currentEma = emas[emasIdx];
      const currentStatus = currentPrice > currentEma ? 'bullish' : 'bearish';
      
      if (currentStatus === status) {
          since = candles[i].t;
      } else {
          break;
      }
  }

  return {
    coin,
    timeframe,
    status,
    since
  };
}

export function isCandleClosed(timeframe: Timeframe, candleTimestamp: number): boolean {
  const now = Date.now();
  const candleStart = candleTimestamp;
  
  if (timeframe === 'D1') {
    const oneDayMs = 24 * 60 * 60 * 1000;
    return now >= candleStart + oneDayMs;
  } else if (timeframe === 'W1') {
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    return now >= candleStart + oneWeekMs;
  }
  return false;
}
