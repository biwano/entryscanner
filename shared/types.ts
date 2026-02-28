export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

/**
 * Raw candle from Hyperliquid API
 */
export interface HyperliquidCandle {
  t: number // timestamp
  o: string // open price
  h: string // high price
  l: string // low price
  c: string // close price
  v: string // volume
  i: number // interval/identifier
}

export type Timeframe = 'D1' | 'W1'

export interface TrendStatus {
  status: 'bullish' | 'bearish'
  since: number // timestamp
  coin: string
  timeframe: Timeframe
}

export interface MonitoredPair {
  id: string
  coin: string
  last_trend_flip_daily_id?: string
  last_trend_flip_weekly_id?: string
  last_analyzed?: string
  last_updated?: string
  created_at?: string
}

export interface AssetMeta {
  name: string
  szDecimals: number
  maxLeverage: number
  onlyIsolated: boolean
}

export interface AssetCtx {
  coin: string
  dayNiv: number
  daySam: number
  funding: number
  impactPxs: [string, string]
  markPx: number
  midPx: number
  openInterest: number
  oraclePx: number
  prevDayPx: number
  premium: number
}
