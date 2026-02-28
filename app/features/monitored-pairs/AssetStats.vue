<script setup lang="ts">
import { computed } from "vue";

import type { AssetCtx } from "#shared/types";

const props = defineProps<{
  coin: string;
  assetCtx: AssetCtx | undefined;
  currentPrice: string | number;
}>();

const formatVolume = (vol: string | number) => {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(vol));
};

const fundingPercent = computed(() => {
  return (Number(props.assetCtx?.funding) * 100).toFixed(4);
});

const dayChangePercent = computed(() => {
  if (!props.assetCtx?.prevDayPx) return "0.00";
  return (
    (Number(props.currentPrice) / Number(props.assetCtx.prevDayPx) - 1) *
    100
  ).toFixed(2);
});
</script>

<template>
  <UCard title="Asset Statistics">
    <div class="space-y-4">
      <div
        class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2"
      >
        <span class="text-gray-500 text-sm">24h Volume</span>
        <span class="font-medium">{{
          formatVolume(assetCtx?.dayNtlVlm || 0)
        }}</span>
      </div>
      <div
        class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2"
      >
        <span class="text-gray-500 text-sm">Open Interest</span>
        <span class="font-medium">{{
          formatVolume(assetCtx?.openInterest || 0)
        }}</span>
      </div>
      <div
        class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2"
      >
        <span class="text-gray-500 text-sm">Funding Rate</span>
        <span
          class="font-medium"
          :class="
            Number(assetCtx?.funding) > 0 ? 'text-green-500' : 'text-red-500'
          "
        >
          {{ fundingPercent }}%
        </span>
      </div>
      <div
        class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2"
      >
        <span class="text-gray-500 text-sm">24h Change</span>
        <span
          class="font-medium"
          :class="
            Number(dayChangePercent) > 0
              ? 'text-green-500'
              : 'text-red-500'
          "
        >
          {{ dayChangePercent }}%
        </span>
      </div>
    </div>
  </UCard>
</template>
