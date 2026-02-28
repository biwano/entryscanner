import { createClient } from '@supabase/supabase-js';
import { createInfoClient, fetchCandles } from '#shared/hyperliquid';
import { determineTrend, isCandleClosed } from '#shared/trends';
import type { Timeframe } from '#shared/types';

// Supabase client for Nitro tasks (using environment variables)
const getSupabaseServiceClient = () => {
  const config = useRuntimeConfig();
  return createClient(
    config.public.supabase.url,
    process.env.SUPABASE_SERVICE_KEY || config.supabase.serviceKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
  );
};

export async function runTrendWorker() {
  const supabase = getSupabaseServiceClient();
  const client = createInfoClient();
  
  const timeframe = (Math.random() > 0.5 ? 'D1' : 'W1') as Timeframe;
  
  const { data: pair, error: pairError } = await supabase
    .from('monitored_pairs')
    .select('*')
    .order('last_analyzed', { ascending: true, nullsFirst: true })
    .limit(1)
    .single();
    
  if (pairError || !pair) {
    return { status: 'no_pairs', error: pairError };
  }
  
  const coin = pair.coin;
  const interval = timeframe === 'D1' ? '1d' : '1w';
  const startTime = Date.now() - (250 * (timeframe === 'D1' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000));
  
  try {
    const candles: any[] = await fetchCandles(client, coin, interval, startTime);
    if (!candles || candles.length === 0) return { status: 'error', coin, message: 'no candles' };

    const latestCandleTime = candles[candles.length - 1].t;
    if (!isCandleClosed(timeframe, latestCandleTime)) {
      await supabase.from('monitored_pairs').update({ last_analyzed: new Date().toISOString() }).eq('id', pair.id);
      return { status: 'candle_not_closed', coin, timeframe };
    }

    const currentTrend = determineTrend(coin, timeframe, candles);
    const trendFlipColumn = timeframe === 'D1' ? 'last_trend_flip_daily_id' : 'last_trend_flip_weekly_id';
    const lastTrendFlipId = pair[trendFlipColumn];
    
    let needsFlip = false;
    if (!lastTrendFlipId) {
      needsFlip = true;
    } else {
      const { data: lastTrend } = await supabase.from('trends').select('*').eq('id', lastTrendFlipId).single();
      if (!lastTrend || lastTrend.status !== currentTrend.status) needsFlip = true;
    }

    if (needsFlip) {
      const { data: newTrend, error: insertError } = await supabase.from('trends').insert({
        coin, timeframe, status: currentTrend.status, since: new Date(currentTrend.since).toISOString()
      }).select().single();
      
      if (!insertError && newTrend) {
        const updates: any = { last_analyzed: new Date().toISOString(), last_updated: new Date().toISOString() };
        updates[trendFlipColumn] = newTrend.id;
        await supabase.from('monitored_pairs').update(updates).eq('id', pair.id);
        return { status: 'trend_flipped', coin, timeframe, newStatus: currentTrend.status };
      }
    }

    await supabase.from('monitored_pairs').update({ last_analyzed: new Date().toISOString() }).eq('id', pair.id);
    return { status: 'no_flip', coin, timeframe };
  } catch (err) {
    return { status: 'error', coin, message: err.message };
  }
}

export async function runNotificationDispatcher() {
  const supabase = getSupabaseServiceClient();
  const { data: subscriptions, error: subError } = await supabase
    .from('user_subscriptions')
    .select(`
      user_id, coin, timeframe,
      profiles (discord_webhook_url),
      monitored_pairs!coin (last_trend_flip_daily_id, last_trend_flip_weekly_id)
    `);
    
  if (subError || !subscriptions) return { status: 'no_subscriptions', error: subError };
  
  const sent = [];
  for (const sub of (subscriptions as any[])) {
    const trendId = sub.timeframe === 'D1' ? sub.monitored_pairs?.last_trend_flip_daily_id : sub.monitored_pairs?.last_trend_flip_weekly_id;
    if (!trendId || !sub.profiles?.discord_webhook_url) continue;

    const { data: existingNotif } = await supabase.from('notification_history').select('id').eq('user_id', sub.user_id).eq('trend_id', trendId).single();
    if (existingNotif) continue;

    const { data: trend } = await supabase.from('trends').select('*').eq('id', trendId).single();
    if (!trend) continue;

    const message = `${sub.coin} ${sub.timeframe} trend flipped to **${trend.status.toUpperCase()}**!`;
    try {
      await $fetch(sub.profiles.discord_webhook_url, {
        method: 'POST',
        body: {
          content: message,
          embeds: [{
            title: `Trend Flip Alert: ${sub.coin}`,
            description: message,
            color: trend.status === 'bullish' ? 0x00FF00 : 0xFF0000,
            timestamp: new Date(trend.since).toISOString()
          }]
        }
      });
      
      await supabase.from('notification_history').insert({ user_id: sub.user_id, trend_id: trend.id, message });
      sent.push({ user_id: sub.user_id, coin: sub.coin });
    } catch (err) {
      console.error('Dispatcher error:', err);
    }
  }
  return { status: 'ok', sent: sent.length };
}
