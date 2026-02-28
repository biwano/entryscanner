<script setup lang="ts">
import type { MonitoredPairWithTrends, UserSubscription } from "~/types/database.friendly.types";
import { formatRelativeTime } from "#shared/time";
import SubscriptionToggle from "../subscriptions/SubscriptionToggle.vue";

defineProps<{
  pairs: MonitoredPairWithTrends[];
  allMids: Record<string, string> | null;
  isAdmin: boolean;
  subscriptions: UserSubscription[];
}>();

const emit = defineEmits<{
  (e: "refreshSubscriptions"): void;
}>();

const getPrice = (allMids: Record<string, string> | null, coin: string) => {
  return allMids?.[coin] || "0.00";
};
</script>

<template>
  <UCard class="shadow-sm">
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">Monitored Pairs</h2>
        <UButton
          v-if="isAdmin"
          to="/settings"
          icon="i-lucide-plus"
          size="sm"
          color="neutral"
          variant="ghost"
          >Manage Pairs</UButton
        >
      </div>
    </template>

    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <thead
          class="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase font-semibold"
        >
          <tr>
            <th class="px-6 py-3">Asset</th>
            <th class="px-6 py-3">Price</th>
            <th class="px-6 py-3">Daily (D1)</th>
            <th class="px-6 py-3">Weekly (W1)</th>
            <th class="px-6 py-3">Last Updated</th>
            <th class="px-6 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
          <tr
            v-for="pair in pairs"
            :key="pair.id"
            class="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs"
                >
                  {{ pair.coin[0] }}
                </div>
                <span class="font-semibold text-gray-900 dark:text-white">{{
                  pair.coin
                }}</span>
              </div>
            </td>
            <td class="px-6 py-4 font-mono text-sm">
              {{ formatPrice(getPrice(allMids, pair.coin)) }}
            </td>
            <td class="px-6 py-4">
              <TrendIndicator
                :status="pair.last_trend_flip_daily?.status"
                :since="pair.last_trend_flip_daily?.since"
              />
            </td>
            <td class="px-6 py-4">
              <TrendIndicator
                :status="pair.last_trend_flip_weekly?.status"
                :since="pair.last_trend_flip_weekly?.since"
              />
            </td>
            <td class="px-6 py-4 text-xs text-gray-500">
              {{ formatRelativeTime(pair.last_updated) }} ago
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <SubscriptionToggle
                  :coin="pair.coin"
                  timeframe="D1"
                  :subscriptions="subscriptions"
                  @refresh="emit('refreshSubscriptions')"
                />
                <SubscriptionToggle
                  :coin="pair.coin"
                  timeframe="W1"
                  :subscriptions="subscriptions"
                  @refresh="emit('refreshSubscriptions')"
                />
                <UButton
                  :to="`/pair/${pair.coin}`"
                  icon="i-lucide-chevron-right"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>
