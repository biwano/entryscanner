<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useAsyncData, navigateTo } from "#app";
import { useSupabaseClient } from "#imports";
import { useHyperliquid } from "~/composables/useHyperliquid";
import type { MonitoredPairWithTrends } from "~/types/database.friendly.types";
import type { AssetMeta, TrendStatus } from "~~shared/types";
import { calculateStartTime, determineTrend } from "~~shared/trends";
import { CANDLE_COUNT, TREND_BULLISH } from "~~shared/constants";
import { formatPrice, formatPercentChange } from "~/utils/format";
import PriceChart from "~/features/charts/PriceChart.vue";
import AssetStats from "~/features/monitored-pairs/AssetStats.vue";
import EventHistory from "~/features/monitored-pairs/EventHistory.vue";
import TradingControls from "~/features/trading/TradingControls.vue";
import PairHeader from "~/features/monitored-pairs/PairHeader.vue";

const route = useRoute();
const coinParam = route.params.coin;
const coin = (Array.isArray(coinParam) ? coinParam[0] : coinParam) || "";

const { useAllMids, useMetaAndAssetCtxs, useCandles } = useHyperliquid();
const { data: allMids } = useAllMids();
const { data: metaAndAssetCtxs } = useMetaAndAssetCtxs();

const startTimeH1 = calculateStartTime("H1", CANDLE_COUNT);
const startTimeD1 = calculateStartTime("D1", CANDLE_COUNT);
const startTimeW1 = calculateStartTime("W1", CANDLE_COUNT);
const { data: candlesH1 } = useCandles(coin, "1h", startTimeH1);
const { data: candlesD1 } = useCandles(coin, "1d", startTimeD1);
const { data: candlesW1 } = useCandles(coin, "1w", startTimeW1);

const queryTimeframe = route.query.timeframe as string;
const timeframe = ref<"1h" | "1d" | "1w">(
  queryTimeframe === "1w" ? "1w" : queryTimeframe === "1h" ? "1h" : "1d"
);

const isBullish = computed(() => {
  if (timeframe.value === "1h") {
    if (!candlesH1.value || candlesH1.value.length === 0) return false;
    const analysis = determineTrend(coin, "H1", candlesH1.value);
    return analysis?.status === TREND_BULLISH;
  }
  const flip =
    timeframe.value === "1d"
      ? pair.value?.last_trend_flip_daily
      : pair.value?.last_trend_flip_weekly;
  return flip?.status === TREND_BULLISH;
});

// Watch for timeframe changes to update the URL
watch(timeframe, (newVal) => {
  navigateTo(
    {
      path: route.path,
      query: { ...route.query, timeframe: newVal },
    },
    { replace: true }
  );
});

const selectedCandles = computed(() => {
  if (timeframe.value === "1h") return candlesH1.value || [];
  return (timeframe.value === "1d" ? candlesD1.value : candlesW1.value) || [];
});

const supabase = useSupabaseClient();
const { data: pair } = await useAsyncData<MonitoredPairWithTrends | null>(
  `pair_${coin}`,
  async () => {
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
  }
);

const { data: events } = await useAsyncData(`events_${coin}`, async () => {
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("coin", coin)
    .order("since", { ascending: false })
    .limit(15);
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

const analysisH1 = computed(() => {
  if (!candlesH1.value || candlesH1.value.length === 0) return null;
  return determineTrend(coin, "H1", candlesH1.value);
});

const backRoute = ref("/");
if (import.meta.client) {
  backRoute.value = localStorage.getItem("pair_analysis_source") || "/";
}

const percentChangeSinceTrendStart = computed(() => {
  if (timeframe.value === "1h") {
    if (!candlesH1.value || candlesH1.value.length === 0) return null;
    const analysis = determineTrend(coin, "H1", candlesH1.value);
    if (!analysis?.priceAtFlip) return null;
    return formatPercentChange(currentPrice.value, analysis.priceAtFlip);
  }
  if (!pair.value) return null;
  const flipEvent =
    timeframe.value === "1d"
      ? pair.value.last_trend_flip_daily
      : pair.value.last_trend_flip_weekly;

  if (!flipEvent?.price_at_flip) return null;
  return formatPercentChange(currentPrice.value, flipEvent.price_at_flip);
});
</script>

<template>
  <div v-if="pair" class="space-y-8">
    <PairHeader
      v-model:timeframe="timeframe"
      :coin="coin"
      :pair="pair"
      :current-price="currentPrice"
      :back-route="backRoute"
      :percent-change-since-trend-start="percentChangeSinceTrendStart"
      :status-h1="analysisH1?.status"
      :since-h1="analysisH1?.latestFlipTimestamp"
      :price-at-flip-h1="analysisH1?.priceAtFlip"
    />

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div class="lg:col-span-3">
          <PriceChart
            v-if="selectedCandles && selectedCandles.length > 0"
            :coin="coin"
            :candles="selectedCandles"
            :timeframe="
              timeframe === '1h' ? 'H1' : timeframe === '1d' ? 'D1' : 'W1'
            "
          />
      </div>

      <div class="space-y-6">
        <TradingControls :coin="coin" :is-bullish="isBullish ?? false" />

        <AssetStats
          :coin="coin"
          :asset-ctx="assetCtx"
          :current-price="currentPrice"
        />

        <EventHistory :events="events ?? null" />
      </div>
    </div>
  </div>
  <div v-else class="flex flex-col items-center justify-center py-20">
    <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    <span class="mt-4 text-gray-500">Loading asset data...</span>
  </div>
</template>
