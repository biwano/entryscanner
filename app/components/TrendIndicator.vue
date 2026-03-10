<script setup lang="ts">
import { computed } from "vue";
import type { TrendStatus } from "#shared/types.js";
import { TREND_BULLISH, TREND_BEARISH } from "#shared/constants.js";
import { formatPercentChange } from "~/utils/format.js";

const props = defineProps<{
  status?: TrendStatus;
  since?: string | null;
  priceAtFlip?: number | null;
  currentPrice?: string | number | null;
}>();

const percentChange = computed(() => {
  if (!props.priceAtFlip || !props.currentPrice) return null;
  return formatPercentChange(props.currentPrice, props.priceAtFlip);
});
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="flex items-center gap-1">
      <div
        v-if="status === TREND_BULLISH"
        class="w-2 h-2 rounded-full bg-green-500 animate-pulse"
      />
      <div
        v-else-if="status === TREND_BEARISH"
        class="w-2 h-2 rounded-full bg-red-500 animate-pulse"
      />
      <div v-else class="w-2 h-2 rounded-full bg-gray-400" />

      <span
        v-if="status"
        :class="
          status === TREND_BULLISH
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
        "
        class="text-xs font-semibold uppercase tracking-wider"
      >
        {{ status }}
      </span>
      <span v-else class="text-gray-400 text-xs uppercase tracking-wider">
        UNKNOWN
      </span>
    </div>

    <div v-if="since || percentChange" class="flex items-center gap-1">
      <span
        v-if="since"
        class="text-[10px] text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded border border-gray-200 dark:border-gray-700"
      >
        <RelativeTime :timestamp="since" />
      </span>
      <span
        v-if="percentChange"
        :class="
          percentChange.startsWith('+')
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
        "
        class="text-[10px] font-mono bg-gray-50 dark:bg-gray-900 px-1 rounded border border-gray-100 dark:border-gray-800"
      >
        {{ percentChange }}
      </span>
    </div>
  </div>
</template>
