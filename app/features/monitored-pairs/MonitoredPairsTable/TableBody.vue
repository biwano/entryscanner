<script setup lang="ts">
import { computed } from "vue";
import type {
  MonitoredPairWithTrends,
  UserSubscription,
} from "~/types/database.friendly.types.js";
import SubscriptionToggle from "../../subscriptions/SubscriptionToggle.vue";

const props = defineProps<{
  data: MonitoredPairWithTrends[];
  columns: {
    id: string;
    accessorKey?: string;
    accessorFn?: (row: MonitoredPairWithTrends) => string | number;
    header: string;
    enableSorting?: boolean;
    meta?: Record<string, unknown>;
  }[];
  allMids: Record<string, string> | null;
  subscriptions: UserSubscription[];
  page: number;
  totalItems: number;
  itemsPerPage: number;
  sorting: { id: string; desc: boolean }[];
  totalMonitored?: number;
}>();

const emit = defineEmits<{
  (e: "update:sorting", value: { id: string; desc: boolean }[]): void;
  (e: "update:page", value: number): void;
  (e: "refreshSubscriptions"): void;
}>();

const localSorting = computed({
  get: () => props.sorting,
  set: (val: { id: string; desc: boolean }[]) => emit("update:sorting", val),
});

const localPage = computed({
  get: () => props.page,
  set: (val) => emit("update:page", val),
});

const getPrice = (allMids: Record<string, string> | null, coin: string) => {
  return allMids?.[coin] || "0.00";
};

const getStatus = (
  event: MonitoredPairWithTrends["last_trend_flip_daily"]
): "bullish" | "bearish" | undefined => {
  if (!event) return undefined;
  return event.status as "bullish" | "bearish";
};
</script>

<template>
  <div>
    <UTable
      v-model:sorting="localSorting"
      :data="data"
      :columns="columns"
      class="w-full"
    >
      <template #coin-header="{ column }">
        <TableSortButton :column="column" label="Asset" />
      </template>

      <template #price-header="{ column }">
        <TableSortButton :column="column" label="Price" />
      </template>

      <template #daily-header="{ column }">
        <TableSortButton :column="column" label="Daily (D1)" />
      </template>

      <template #weekly-header="{ column }">
        <TableSortButton :column="column" label="Weekly (W1)" />
      </template>

      <template #last_analyzed-header="{ column }">
        <TableSortButton :column="column" label="Last Analyzed" />
      </template>

      <template #coin-cell="{ row }">
        <CoinDisplay :coin="row.original.coin" />
      </template>

      <template #price-cell="{ row }">
        <span class="font-mono text-sm">
          {{ formatPrice(getPrice(allMids, row.original.coin)) }}
        </span>
      </template>

      <template #daily-cell="{ row }">
        <TrendIndicator
          :status="getStatus(row.original.last_trend_flip_daily)"
          :since="row.original.last_trend_flip_daily?.since || undefined"
        />
      </template>

      <template #weekly-cell="{ row }">
        <TrendIndicator
          :status="getStatus(row.original.last_trend_flip_weekly)"
          :since="row.original.last_trend_flip_weekly?.since || undefined"
        />
      </template>

      <template #last_analyzed-cell="{ row }">
        <span class="text-xs text-gray-500">
          <RelativeTime :timestamp="row.original.last_analyzed" />
        </span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex items-center justify-end gap-2">
          <SubscriptionToggle
            :coin="row.original.coin"
            timeframe="D1"
            :subscriptions="subscriptions"
            @refresh="emit('refreshSubscriptions')"
          />
          <SubscriptionToggle
            :coin="row.original.coin"
            timeframe="W1"
            :subscriptions="subscriptions"
            @refresh="emit('refreshSubscriptions')"
          />
          <UButton
            :to="`/pair/${row.original.coin}`"
            icon="i-lucide-chevron-right"
            size="xs"
            variant="ghost"
            color="neutral"
          />
        </div>
      </template>
    </UTable>

    <div
      class="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 py-3 px-4"
    >
      <div class="text-sm text-gray-400">
        <span v-if="totalMonitored !== undefined && totalItems !== totalMonitored">
          Found {{ totalItems }} / {{ totalMonitored }} monitored pairs
        </span>
        <span v-else>
          {{ totalItems }} pairs monitored
        </span>
      </div>
      <UPagination
        v-if="totalItems > itemsPerPage"
        v-model:page="localPage"
        :total="totalItems"
        :items-per-page="itemsPerPage"
        size="sm"
      />
    </div>
  </div>
</template>
