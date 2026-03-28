import type { TREND_BULLISH, TREND_BEARISH } from "./constants.js";

export type TrendStatus = typeof TREND_BULLISH | typeof TREND_BEARISH;

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Raw candle from Hyperliquid API
 */
export interface HyperliquidCandle {
  t: number; // timestamp
  o: string; // open price
  h: string; // high price
  l: string; // low price
  c: string; // close price
  v: string; // volume
  i: string | number; // interval/identifier
}

export type Timeframe = "H1" | "D1" | "W1";

export interface TrendFlip {
  status: TrendStatus;
  timestamp: string;
  price: number;
}

export interface TrendAnalysis {
  coin: string;
  timeframe: Timeframe;
  status: TrendStatus;
  latestFlipTimestamp: string; // The closing time of the candle where the current trend flipped
  priceAtFlip: number;
  flips: TrendFlip[];
}

export interface AssetMeta {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated?: boolean;
}

export interface AssetCtx {
  prevDayPx: string;
  dayNtlVlm: string;
  markPx: string;
  midPx: string | null;
  funding: string;
  openInterest: string;
  premium: string | null;
  oraclePx: string;
  impactPxs: string[] | null;
  dayBaseVlm: string;
}
