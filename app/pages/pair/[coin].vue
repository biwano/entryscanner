<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAsyncData } from "#app";
import { useSupabaseClient } from "#imports";
import { useHyperliquid } from "~/composables/useHyperliquid";
import type { MonitoredPairWithTrends } from "~/types/database.friendly.types";
import type { AssetCtx, AssetMeta } from "#shared/types";
import PriceChart from "~/features/charts/PriceChart.vue";
import AssetStats from "~/features/monitored-pairs/AssetStats.vue";

const route = useRoute();
const coinParam = route.params.coin;
const coin = (Array.isArray(coinParam) ? coinParam[0] : coinParam) || "";

const { useAllMids, useMetaAndAssetCtxs, useCandles } = useHyperliquid();
const { data: allMids } = useAllMids();
const { data: metaAndAssetCtxs } = useMetaAndAssetCtxs();

const startTime = Date.now() - 300 * 24 * 60 * 60 * 1000;
const { data: candlesD1 } = useCandles(
  coin,
  "1d",
  startTime
);

const supabase = useSupabaseClient();
const { data: pair } = await useAsyncData<MonitoredPairWithTrends | null>(`pair_${coin}`, async () => {
  const { data } = await supabase
    .from("monitored_pairs")
    .select(
      `
      *,
      last_trend_flip_daily:trends!last_trend_flip_daily_id (*),
      last_trend_flip_weekly:trends!last_trend_flip_weekly_id (*)
    `
    )
    .eq("coin", coin)
    .single();
  return data;
});

const assetCtx = computed(() => {
  if (!metaAndAssetCtxs.value) return undefined;
  const meta = metaAndAssetCtxs.value[0];
  const ctxs = metaAndAssetCtxs.value[1];
  const index = meta.universe.findIndex((u: AssetMeta) => u.name === coin);
  if (index === -1) return undefined;
  return ctxs[index] as AssetCtx;
});

const currentPrice = computed(() => allMids.value?.[coin] ?? "0.00");

const formatPrice = (price: string | number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(price));
};
</script>

<template>
  <div class="space-y-8" v-if="pair">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <UButton
          to="/"
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
        />
        <h1 class="text-3xl font-bold">{{ coin }} Analysis</h1>
        <div class="flex gap-2">
          <UBadge v-if="!pair.active" color="neutral" variant="solid"
            >INACTIVE</UBadge
          >
          <UBadge
            :color="
              pair.last_trend_flip_daily?.status === 'bullish'
                ? 'success'
                : 'error'
            "
            variant="subtle"
            >D1: {{ pair.last_trend_flip_daily?.status?.toUpperCase() }}</UBadge
          >
          <UBadge
            :color="
              pair.last_trend_flip_weekly?.status === 'bullish'
                ? 'success'
                : 'error'
            "
            variant="subtle"
            >W1:
            {{ pair.last_trend_flip_weekly?.status?.toUpperCase() }}</UBadge
          >
        </div>
      </div>
      <div class="text-right">
        <div class="text-2xl font-mono font-bold">
          {{ formatPrice(currentPrice) }}
        </div>
        <div class="text-sm text-gray-500">Live Price</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div class="lg:col-span-3">
        <PriceChart
          v-if="candlesD1"
          :coin="coin"
          :candles="candlesD1"
        />
      </div>

      <div class="space-y-6">
        <AssetStats
          :coin="coin"
          :asset-ctx="assetCtx"
          :current-price="currentPrice"
        />

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
