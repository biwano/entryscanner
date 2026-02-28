<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAsyncData, useNuxtApp } from '#app';
import { useSupabaseClient } from '#imports';
import { useHyperliquid } from '~/composables/useHyperliquid';
import { calculateEMA } from '#shared/trends';

const route = useRoute();
const coin = route.params.coin as string;

const { useAllMids, useMetaAndAssetCtxs } = useHyperliquid();
const { data: allMids } = useAllMids();
const { data: metaAndAssetCtxs } = useMetaAndAssetCtxs();

const supabase = useSupabaseClient();
const { data: pair } = await useAsyncData(`pair_${coin}`, async () => {
  const { data } = await supabase
    .from('monitored_pairs')
    .select(`
      *,
      last_trend_flip_daily:trends!last_trend_flip_daily_id (*),
      last_trend_flip_weekly:trends!last_trend_flip_weekly_id (*)
    `)
    .eq('coin', coin)
    .single();
  return data;
});

const { data: candles } = await useAsyncData(`candles_${coin}`, async () => {
    const { $createInfoClient, $fetchCandles } = useNuxtApp() as any;
    // Wait, I didn't create a plugin for this. I'll just use it directly.
    return [];
}, { server: false });

// Re-implementing candle fetch for simplicity in this file for now
const { data: candlesD1, refresh: refreshCandles } = await useAsyncData(`candles_d1_${coin}`, async () => {
    const { createInfoClient, fetchCandles } = await import('#shared/hyperliquid');
    const client = createInfoClient();
    const startTime = Date.now() - (300 * 24 * 60 * 60 * 1000);
    return await fetchCandles(client, coin, '1d', startTime);
});

const ema200 = computed(() => {
    if (!candlesD1.value) return [];
    const closePrices = (candlesD1.value as any[]).map(c => parseFloat(c.c));
    return calculateEMA(closePrices, 200);
});

const assetCtx = computed(() => {
    return (metaAndAssetCtxs.value?.[1] as any[])?.find(c => c.coin === coin);
});

const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(price));
};

const formatVolume = (vol: string | number) => {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(vol));
}
</script>

<template>
  <div class="space-y-8" v-if="pair">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <UButton to="/" icon="i-lucide-arrow-left" variant="ghost" color="neutral" />
        <h1 class="text-3xl font-bold">{{ coin }} Analysis</h1>
        <div class="flex gap-2">
            <UBadge :color="pair.last_trend_flip_daily?.status === 'bullish' ? 'green' : 'red'" variant="subtle">D1: {{ pair.last_trend_flip_daily?.status?.toUpperCase() }}</UBadge>
            <UBadge :color="pair.last_trend_flip_weekly?.status === 'bullish' ? 'green' : 'red'" variant="subtle">W1: {{ pair.last_trend_flip_weekly?.status?.toUpperCase() }}</UBadge>
        </div>
      </div>
      <div class="text-right">
        <div class="text-2xl font-mono font-bold">{{ formatPrice(allMids?.[coin]) }}</div>
        <div class="text-sm text-gray-500">Live Price</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div class="lg:col-span-3">
        <UCard class="shadow-sm">
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-bold">Price Action (D1)</h2>
              <div class="text-xs text-orange-500 flex items-center gap-1"><div class="w-2 h-0.5 bg-orange-500"></div> EMA 200</div>
            </div>
          </template>
          <Chart v-if="candlesD1" :candles="candlesD1" :coin="coin" :ema200="ema200" />
        </UCard>
      </div>

      <div class="space-y-6">
        <UCard title="Asset Statistics">
          <div class="space-y-4">
            <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <span class="text-gray-500 text-sm">24h Volume</span>
              <span class="font-medium">{{ formatVolume(assetCtx?.dayNiv) }}</span>
            </div>
            <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <span class="text-gray-500 text-sm">Open Interest</span>
              <span class="font-medium">{{ formatVolume(assetCtx?.openInterest) }}</span>
            </div>
            <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <span class="text-gray-500 text-sm">Funding Rate</span>
              <span class="font-medium" :class="assetCtx?.funding > 0 ? 'text-green-500' : 'text-red-500'">
                {{ (Number(assetCtx?.funding) * 100).toFixed(4) }}%
              </span>
            </div>
            <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <span class="text-gray-500 text-sm">24h Change</span>
              <span class="font-medium" :class="Number(assetCtx?.prevDayPx) < Number(allMids?.[coin]) ? 'text-green-500' : 'text-red-500'">
                {{ (((Number(allMids?.[coin]) / Number(assetCtx?.prevDayPx)) - 1) * 100).toFixed(2) }}%
              </span>
            </div>
          </div>
        </UCard>

        <UCard title="Trend History">
          <div class="text-center py-8 text-gray-500 text-sm italic">
            Trend history visualization coming soon.
          </div>
        </UCard>
      </div>
    </div>
  </div>
  <div v-else class="flex flex-col items-center justify-center py-20">
    <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    <span class="mt-4 text-gray-500">Loading asset data...</span>
  </div>
</template>
