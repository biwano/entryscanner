<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useAsyncData } from "#app";
import { useSupabaseClient } from "#imports";
import { useHyperliquid } from "~/composables/useHyperliquid";
import type { MonitoredPairWithTrends } from "~/types/database.friendly.types";
import type { AssetCtx, AssetMeta } from "#shared/types";
import { calculateStartTime } from "#shared/trends";
import { CANDLE_COUNT } from "#shared/constants";
import PriceChart from "~/features/charts/PriceChart.vue";
import AssetStats from "~/features/monitored-pairs/AssetStats.vue";

const route = useRoute();
const coinParam = route.params.coin;
const coin = (Array.isArray(coinParam) ? coinParam[0] : coinParam) || "";

const { useAllMids, useMetaAndAssetCtxs, useCandles } = useHyperliquid();
const { data: allMids } = useAllMids();
const { data: metaAndAssetCtxs } = useMetaAndAssetCtxs();

const startTimeD1 = calculateStartTime("D1", CANDLE_COUNT);
const startTimeW1 = calculateStartTime("W1", CANDLE_COUNT);
const { data: candlesD1 } = useCandles(coin, "1d", startTimeD1);
const { data: candlesW1 } = useCandles(coin, "1w", startTimeW1);

const timeframe = ref<"1d" | "1w">("1d");
const selectedCandles = computed(() => (timeframe.value === "1d" ? candlesD1.value : candlesW1.value) || []);

const supabase = useSupabaseClient();
const { data: pair } = await useAsyncData<MonitoredPairWithTrends | null>(`pair_${coin}`, async () => {
  const { data } = await supabase
    .from("monitored_pairs")
    .select(
      `
      *,
      last_trend_flip_daily:events!last_trend_flip_daily_id (*),
      last_trend_flip_weekly:events!last_trend_flip_weekly_id (*)
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
  if (index === -1 || !ctxs || !ctxs[index]) return undefined;
  return ctxs[index];
});

const currentPrice = computed(() => allMids.value?.[coin] ?? "0.00");
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
            @click="timeframe = '1d'"
            class="cursor-pointer"
            :color="
              pair.last_trend_flip_daily?.status === 'bullish'
                ? 'success'
                : 'error'
            "
            :variant="timeframe === '1d' ? 'solid' : 'subtle'"
            >D1: {{ pair.last_trend_flip_daily?.status?.toUpperCase() }}
            <span v-if="pair.last_trend_flip_daily?.since" class="ml-1 opacity-80 text-[10px]"
              >(<RelativeTime :timestamp="pair.last_trend_flip_daily.since" :show-ago="false" />)</span
            ></UBadge
          >
          <UBadge
            @click="timeframe = '1w'"
            class="cursor-pointer"
            :color="
              pair.last_trend_flip_weekly?.status === 'bullish'
                ? 'success'
                : 'error'
            "
            :variant="timeframe === '1w' ? 'solid' : 'subtle'"
            >W1: {{ pair.last_trend_flip_weekly?.status?.toUpperCase() }}
            <span v-if="pair.last_trend_flip_weekly?.since" class="ml-1 opacity-80 text-[10px]"
              >(<RelativeTime :timestamp="pair.last_trend_flip_weekly.since" :show-ago="false" />)</span
            ></UBadge
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
          v-if="selectedCandles && selectedCandles.length > 0"
          :coin="coin"
          :candles="selectedCandles"
          :timeframe="timeframe === '1d' ? 'D1' : 'W1'"
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
