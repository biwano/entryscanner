<script setup lang="ts">
import { computed } from "vue";
import { calculateEMA } from "#shared/trends";
import type { HyperliquidCandle } from "#shared/types";

const props = defineProps<{
  coin: string;
  candles: HyperliquidCandle[];
}>();

const ema200 = computed(() => {
  if (!props.candles) return [];
  const closePrices = props.candles.map((c) => parseFloat(c.c));
  return calculateEMA(closePrices, 200);
});
</script>

<template>
  <UCard class="shadow-sm">
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">Price Action (D1)</h2>
        <div class="text-xs text-orange-500 flex items-center gap-1">
          <div class="w-2 h-0.5 bg-orange-500"></div>
          EMA 200
        </div>
      </div>
    </template>
    <Chart
      v-if="candles"
      :candles="candles"
      :coin="coin"
      :ema200="ema200"
    />
  </UCard>
</template>
