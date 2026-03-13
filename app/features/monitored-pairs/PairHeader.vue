<script setup lang="ts">
import type { MonitoredPairWithTrends } from "~/types/database.friendly.types";
import type { TrendStatus } from "~~shared/types";
import { formatPrice } from "~/utils/format";

defineProps<{
  coin: string;
  pair: MonitoredPairWithTrends;
  currentPrice: string;
  timeframe: "1d" | "1w";
  backRoute: string;
  percentChangeSinceTrendStart: string | null;
}>();

defineEmits<{
  (e: "update:timeframe", value: "1d" | "1w"): void;
}>();
</script>

<template>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <UButton
        :to="backRoute"
        icon="i-lucide-arrow-left"
        variant="ghost"
        color="neutral"
      />
      <div class="flex flex-col gap-2">
        <h1 class="text-3xl font-bold flex items-center gap-2">
          <span>{{ coin }} Analysis</span>
          <span
            v-if="percentChangeSinceTrendStart"
            :class="
              percentChangeSinceTrendStart.startsWith('+')
                ? 'text-green-500'
                : 'text-red-500'
            "
            class="text-2xl font-normal font-mono"
          >
            ({{ percentChangeSinceTrendStart }})
          </span>
        </h1>
        <div class="flex gap-2">
          <UBadge v-if="!pair.active" color="neutral" variant="solid"
            >INACTIVE</UBadge
          >
          <div
            class="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border transition-all"
            :class="
              timeframe === '1d'
                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
            "
            @click="$emit('update:timeframe', '1d')"
          >
            <span class="text-xs font-bold text-gray-500">D1</span>
            <TrendIndicator
              :status="(pair.last_trend_flip_daily?.status as TrendStatus)"
              :since="pair.last_trend_flip_daily?.since"
              :price-at-flip="pair.last_trend_flip_daily?.price_at_flip"
              :current-price="currentPrice"
            />
          </div>
          <div
            class="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border transition-all"
            :class="
              timeframe === '1w'
                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
            "
            @click="$emit('update:timeframe', '1w')"
          >
            <span class="text-xs font-bold text-gray-500">W1</span>
            <TrendIndicator
              :status="(pair.last_trend_flip_weekly?.status as TrendStatus)"
              :since="pair.last_trend_flip_weekly?.since"
              :price-at-flip="pair.last_trend_flip_weekly?.price_at_flip"
              :current-price="currentPrice"
            />
          </div>
        </div>
      </div>
    </div>
    <div class="text-right">
      <div class="text-2xl font-mono font-bold">
        {{ formatPrice(currentPrice) }}
      </div>
      <div class="text-sm text-gray-500">Live Price</div>
    </div>
  </div>
</template>
