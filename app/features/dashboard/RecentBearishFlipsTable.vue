<script setup lang="ts">
import type { Tables } from "~/types/database.types";
import { formatPrice } from "~/utils/format";
import type { TrendStatus } from "~~shared/types";

type TrendPercentages = {
  total: number;
  bullish: number;
  bearish: number;
  bullishPercentage: number;
  bearishPercentage: number;
};

const props = defineProps<{
  title: string;
  events: Tables<"events">[];
  allMids: Record<string, string> | null;
  loading?: boolean;
  trendPercentages?: TrendPercentages | null;
}>();

const columns = [
  {
    id: "coin",
    accessorKey: "coin",
    header: "Asset",
  },
  {
    id: "price",
    accessorFn: (row: Tables<"events">) => props.allMids?.[row.coin] || "0.00",
    header: "Price",
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
  },
  {
    id: "actions",
    header: "Action",
    meta: {
      class: {
        th: "text-right",
        td: "text-right",
      },
    },
  },
];

const getStatus = (event: Tables<"events">): TrendStatus => {
  return event.status as TrendStatus;
};
</script>

<template>
  <UCard class="shadow-sm">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-bold">{{ title }}</h3>
        <div v-if="trendPercentages" class="flex items-center gap-2 text-sm">
          <span class="text-green-600 dark:text-green-400">
            {{ trendPercentages.bullishPercentage }}% Bullish
          </span>
          <span class="text-red-600 dark:text-red-400">
            {{ trendPercentages.bearishPercentage }}% Bearish
          </span>
        </div>
      </div>

      <!-- Visual indicator -->
      <div v-if="trendPercentages && trendPercentages.total > 0" class="mt-3">
        <div class="flex w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            class="bg-green-500 h-2 rounded-l-full"
            :style="{ width: `${trendPercentages.bullishPercentage}%` }"
          ></div>
          <div
            class="bg-red-500 h-2 rounded-r-full"
            :style="{ width: `${trendPercentages.bearishPercentage}%` }"
          ></div>
        </div>
        <div class="flex justify-between text-xs text-gray-500 mt-1">
          <span>Bullish</span>
          <span>Bearish</span>
        </div>
      </div>
    </template>

    <div class="overflow-x-auto">
      <UTable v-if="!loading" :data="events" :columns="columns" class="w-full">
        <template #coin-cell="{ row }">
          <CoinDisplay :coin="row.original.coin" />
        </template>

        <template #price-cell="{ row }">
          <span class="font-mono text-sm">
            {{ formatPrice(allMids?.[row.original.coin] || "0.00") }}
          </span>
        </template>

        <template #status-cell="{ row }">
          <TrendIndicator
            :status="getStatus(row.original)"
            :since="row.original.since"
          />
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end">
            <UButton
              :to="`/pair/${row.original.coin}?timeframe=${
                row.original.timeframe === 'D1' ? '1d' : '1w'
              }`"
              icon="i-lucide-chevron-right"
              size="xs"
              variant="ghost"
              color="neutral"
            >
              Details
            </UButton>
          </div>
        </template>
      </UTable>

      <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
        <div v-for="i in 5" :key="i" class="flex items-center gap-4 px-4 py-4">
          <div class="flex items-center gap-3 flex-1">
            <USkeleton class="h-8 w-8 rounded-full" />
            <USkeleton class="h-4 w-20" />
          </div>
          <div class="flex-1">
            <USkeleton class="h-4 w-16" />
          </div>
          <div class="flex-1">
            <USkeleton class="h-6 w-24 rounded-full" />
          </div>
          <div class="flex justify-end">
            <USkeleton class="h-8 w-16" />
          </div>
        </div>
      </div>

      <div
        v-if="!loading && events.length === 0"
        class="flex flex-col items-center justify-center py-8 text-gray-500"
      >
        <UIcon name="i-lucide-info" class="w-8 h-8 mb-2 opacity-50" />
        <p>No recent bearish flips found.</p>
      </div>
    </div>
  </UCard>
</template>
