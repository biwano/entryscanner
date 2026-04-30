<script setup lang="ts">
import { computed, ref } from "vue";
import { useTrading } from "~/composables/useTrading";
import { formatPrice, formatTime } from "~/utils/format";

const { recentTrades, isLoading, address } = useTrading();

const page = ref(1);
const itemsPerPage = 5;

const hasData = computed(
  () => address.value !== null && recentTrades.value.length > 0
);

const paginatedTrades = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return recentTrades.value.slice(start, end);
});

const totalItems = computed(() => recentTrades.value.length);

const displayExitTime = (exitTime: string | null, isOpen: boolean) => {
  if (isOpen || !exitTime) return "Open";
  return formatTime(exitTime);
};

const columns = [
  { id: "asset", header: "Asset" },
  { id: "leverage", header: "Lev" },
  { id: "entry", header: "Entry (Time / Price)" },
  { id: "exit", header: "Exit (Time / Price)" },
  { id: "pnl", header: "PnL" },
];
</script>

<template>
  <div
    v-if="address"
    class="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm"
  >
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold flex items-center gap-2">
          <UIcon name="i-lucide-history" class="text-primary" />
          Recent Trades
        </h2>
        <p class="text-sm text-gray-500">
          History of your recent trades, including open positions.
        </p>
      </div>
    </div>

    <div v-if="hasData">
      <UTable
        :data="paginatedTrades"
        :columns="columns"
        class="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden"
      >
        <template #asset-cell="{ row }">
          <TableLink :to="`/pair/${row.original.coin}`">
            <CoinDisplay :coin="row.original.coin" size="sm" />
          </TableLink>
        </template>

        <template #leverage-cell="{ row }">
          <UBadge variant="subtle" color="neutral" size="sm">
            {{ row.original.leverage }}
          </UBadge>
        </template>

        <template #entry-cell="{ row }">
          <div class="flex flex-col">
            <span class="text-xs text-gray-500 font-mono">{{
              formatTime(row.original.entryTime)
            }}</span>
            <span class="font-bold">{{
              formatPrice(row.original.entryPrice)
            }}</span>
          </div>
        </template>

        <template #exit-cell="{ row }">
          <div class="flex flex-col">
            <span class="text-xs text-gray-500 font-mono">
              {{ displayExitTime(row.original.exitTime, row.original.isOpen) }}
            </span>
            <span class="font-bold">
              {{
                row.original.isOpen || row.original.exitPrice === null
                  ? "-"
                  : formatPrice(row.original.exitPrice)
              }}
            </span>
          </div>
        </template>

        <template #pnl-cell="{ row }">
          <div class="flex flex-col items-end">
            <Private v-if="!row.original.isOpen && row.original.pnl !== null">
              <span
                :class="
                  row.original.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                "
                class="font-black"
              >
                {{ row.original.pnl >= 0 ? "+" : ""
                }}{{ formatPrice(row.original.pnl) }}
              </span>
              <span
                class="text-[10px] opacity-70 block"
                :class="
                  row.original.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                "
              >
                {{ row.original.pnl >= 0 ? "+" : ""
                }}{{ (row.original.pnlPct ?? 0).toFixed(2) }}%
              </span>
            </Private>
            <span v-else class="text-gray-400">-</span>
          </div>
        </template>
      </UTable>

      <div v-if="totalItems > itemsPerPage" class="mt-6 flex justify-center">
        <UPagination
          v-model:page="page"
          :total="totalItems"
          :items-per-page="itemsPerPage"
          size="sm"
        />
      </div>
    </div>

    <div
      v-else-if="!isLoading"
      class="flex flex-col items-center justify-center py-8 text-center space-y-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700"
    >
      <UIcon name="i-lucide-info" class="w-8 h-8 text-gray-400" />
      <div class="text-gray-500 font-medium">No recent trades found</div>
    </div>
  </div>
</template>
