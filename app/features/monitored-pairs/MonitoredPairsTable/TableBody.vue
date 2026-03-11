<script setup lang="ts">
import { computed } from "vue";
import type {
  MonitoredPairWithTrends,
  UserSubscription,
} from "~/types/database.friendly.types";
import type { TrendStatus } from "~~shared/types";
import {
  formatPrice,
  formatPercentChange,
  calculatePercentChange,
} from "~/utils/format";
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
): TrendStatus | undefined => {
  if (!event) return undefined;
  return event.status as TrendStatus;
};

const formatChangeValue = (
  coin: string,
  event?: MonitoredPairWithTrends["last_trend_flip_daily"]
) => {
  if (!event || !event.price_at_flip) return "0.00%";
  return formatPercentChange(
    getPrice(props.allMids, coin),
    event.price_at_flip
  );
};

const getChangeColorClass = (
  coin: string,
  event?: MonitoredPairWithTrends["last_trend_flip_daily"]
) => {
  if (!event || !event.price_at_flip) return "text-gray-400";
  const change = calculatePercentChange(
    getPrice(props.allMids, coin),
    event.price_at_flip
  );
  return change >= 0
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";
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

      <template #daily_change-header="{ column }">
        <TableSortButton :column="column" label="" />
      </template>

      <template #weekly-header="{ column }">
        <TableSortButton :column="column" label="Weekly (W1)" />
      </template>

      <template #weekly_change-header="{ column }">
        <TableSortButton :column="column" label="" />
      </template>

      <template #last_analyzed-header="{ column }">
        <TableSortButton :column="column" label="Last Analyzed" />
      </template>

      <template #coin-cell="{ row }">
        <TableLink :to="`/pair/${row.original.coin}`">
          <CoinDisplay
            :coin="row.original.coin"
            class="group-hover:text-primary transition-colors"
          />
        </TableLink>
      </template>

      <template #price-cell="{ row }">
        <span class="font-mono text-sm px-1">
          {{ formatPrice(getPrice(allMids, row.original.coin)) }}
        </span>
      </template>

      <template #daily-cell="{ row }">
        <TableLink :to="`/pair/${row.original.coin}?timeframe=1d`" block>
          <TrendIndicator
            :status="getStatus(row.original.last_trend_flip_daily)"
            :since="row.original.last_trend_flip_daily?.since || undefined"
            :price-at-flip="row.original.last_trend_flip_daily?.price_at_flip"
            :current-price="getPrice(allMids, row.original.coin)"
            :show-percent-change="false"
          />
        </TableLink>
      </template>

      <template #daily_change-cell="{ row }">
        <TableLink :to="`/pair/${row.original.coin}?timeframe=1d`" block>
          <span
            class="font-mono text-xs group-hover:text-primary transition-colors"
            :class="
              getChangeColorClass(
                row.original.coin,
                row.original.last_trend_flip_daily
              )
            "
          >
            {{
              formatChangeValue(
                row.original.coin,
                row.original.last_trend_flip_daily
              )
            }}
          </span>
        </TableLink>
      </template>

      <template #weekly-cell="{ row }">
        <TableLink :to="`/pair/${row.original.coin}?timeframe=1w`" block>
          <TrendIndicator
            :status="getStatus(row.original.last_trend_flip_weekly)"
            :since="row.original.last_trend_flip_weekly?.since || undefined"
            :price-at-flip="row.original.last_trend_flip_weekly?.price_at_flip"
            :current-price="getPrice(allMids, row.original.coin)"
            :show-percent-change="false"
          />
        </TableLink>
      </template>

      <template #weekly_change-cell="{ row }">
        <TableLink :to="`/pair/${row.original.coin}?timeframe=1w`" block>
          <span
            class="font-mono text-xs group-hover:text-primary transition-colors"
            :class="
              getChangeColorClass(
                row.original.coin,
                row.original.last_trend_flip_weekly
              )
            "
          >
            {{
              formatChangeValue(
                row.original.coin,
                row.original.last_trend_flip_weekly
              )
            }}
          </span>
        </TableLink>
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
        <span
          v-if="totalMonitored !== undefined && totalItems !== totalMonitored"
        >
          Found {{ totalItems }} / {{ totalMonitored }} monitored pairs
        </span>
        <span v-else> {{ totalItems }} pairs monitored </span>
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
