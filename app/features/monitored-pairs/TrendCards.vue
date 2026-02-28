<script setup lang="ts">
import type { MonitoredPairWithTrends } from "~/types/database.friendly.types";
import { formatRelativeTime } from "#shared/time";

defineProps<{
  pairs: MonitoredPairWithTrends[];
  allMids: Record<string, string> | null;
}>();

const formatPrice = (price: string | number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(price));
};

const getPrice = (allMids: Record<string, string> | null, coin: string) => {
  return allMids?.[coin] || "0.00";
};
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <UCard
      v-for="pair in pairs"
      :key="pair.id"
      class="shadow-sm border border-gray-100 dark:border-gray-800"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-bold text-lg text-gray-900 dark:text-white">{{
            pair.coin
          }}</span>
          <UBadge
            :color="
              pair.last_trend_flip_daily?.status === 'bullish'
                ? 'success'
                : 'error'
            "
          >
            {{
              pair.last_trend_flip_daily?.status?.toUpperCase() || "UNKNOWN"
            }}
          </UBadge>
        </div>
      </template>
      <div class="space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Current Price</span>
          <span class="font-medium font-mono">{{
            formatPrice(getPrice(allMids, pair.coin))
          }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Trend Since</span>
          <span
            >{{
              formatRelativeTime(pair.last_trend_flip_daily?.since)
            }}
            ago</span
          >
        </div>
      </div>
      <template #footer>
        <UButton
          :to="`/pair/${pair.coin}`"
          color="neutral"
          variant="subtle"
          block
        >
          View Details
        </UButton>
      </template>
    </UCard>
  </div>
</template>
