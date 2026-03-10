<script setup lang="ts">
import { computed } from "vue";
import { calculateSMA, determineTrend } from "~~shared/trends.js";
import { SMA_PERIOD_FAST, SMA_PERIOD_SLOW } from "~~shared/constants.js";
import type { HyperliquidCandle } from "~~shared/types.js";

const props = withDefaults(
  defineProps<{
    coin: string;
    candles: HyperliquidCandle[];
    timeframe: "D1" | "W1";
  }>(),
  {
    timeframe: "D1",
  }
);

const sma50 = computed(() => {
  if (!props.candles) return [];
  const closePrices = props.candles.map((c) => parseFloat(c.c));
  return calculateSMA(closePrices, SMA_PERIOD_FAST);
});

const sma200 = computed(() => {
  if (!props.candles) return [];
  const closePrices = props.candles.map((c) => parseFloat(c.c));
  return calculateSMA(closePrices, SMA_PERIOD_SLOW);
});

const trendAnalysis = computed(() => {
  if (!props.candles || props.candles.length === 0) return null;
  return determineTrend(props.coin, props.timeframe, props.candles);
});

const flips = computed(() => trendAnalysis.value?.flips || []);
</script>

<template>
  <UCard class="shadow-sm">
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">Price Action ({{ timeframe }})</h2>
        <div class="flex gap-4">
          <div class="text-xs text-orange-500 flex items-center gap-1">
            <div class="w-2 h-0.5 bg-orange-500"/>
            SMA 50
          </div>
          <div class="text-xs text-fuchsia-500 flex items-center gap-1">
            <div class="w-2 h-0.5 bg-fuchsia-500"/>
            SMA 200
          </div>
        </div>
      </div>
    </template>
    <Chart
      v-if="candles"
      :candles="candles"
      :coin="coin"
      :sma50="sma50"
      :sma200="sma200"
      :flips="flips"
      :current-status="trendAnalysis?.status"
    />
  </UCard>
</template>
