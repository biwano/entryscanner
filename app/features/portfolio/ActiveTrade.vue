<script setup lang="ts">
import { computed } from "vue";
import { usePortfolio } from "~/composables/usePortfolio";
import { formatPrice } from "~/utils/format";

const { address, clearinghouse, openOrders, isLoading } = usePortfolio();

const positions = computed(() => {
  if (!clearinghouse.value) return [];
  return clearinghouse.value.assetPositions
    .filter((p) => parseFloat(p.position.szi) !== 0)
    .map((p) => ({
      asset: p.position.coin,
      size: parseFloat(p.position.szi),
      entryPx: parseFloat(p.position.entryPx),
      pnl: parseFloat(p.position.unrealizedPnl),
    }));
});

const orders = computed(() => {
  if (!openOrders.value) return [];
  return openOrders.value.map((o) => ({
    asset: o.coin,
    side: o.side,
    size: parseFloat(o.sz),
    price: parseFloat(o.limitPx),
  }));
});

const withdrawable = computed(() => {
  if (!clearinghouse.value) return 0;
  return parseFloat(clearinghouse.value.withdrawable);
});

const hasData = computed(() => address.value !== null);

const columns = [
  { id: "asset", header: "Asset" },
  { id: "size", header: "Size" },
  { id: "entryPx", header: "Entry Price" },
  { id: "pnl", header: "PnL" },
];

const orderColumns = [
  { id: "asset", header: "Asset" },
  { id: "side", header: "Side" },
  { id: "size", header: "Size" },
  { id: "price", header: "Price" },
];
</script>

<template>
  <div
    v-if="hasData"
    class="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm"
  >
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold flex items-center gap-2">
          <UIcon name="i-lucide-wallet" class="text-primary" />
          Active trade
        </h2>
        <div class="flex items-center gap-2">
          <p class="text-sm text-gray-500">
            Real-time overview of your Hyperliquid account.
          </p>
          <UButton
            to="/portfolio"
            variant="link"
            size="xs"
            color="primary"
            icon="i-lucide-external-link"
            class="p-0"
          >
            Full View
          </UButton>
        </div>
      </div>
    </div>

    <div
      v-if="positions.length > 0 || orders.length > 0"
      class="grid grid-cols-1 xl:grid-cols-2 gap-8"
    >
      <div v-if="positions.length > 0" class="space-y-4">
        <h3
          class="font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500"
        >
          <UIcon name="i-lucide-layers" />
          Open Positions ({{ positions.length }})
        </h3>
        <UTable
          :data="positions"
          :columns="columns"
          class="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden"
        >
          <template #asset-cell="{ row }">
            <CoinDisplay :coin="row.original.asset" size="sm" />
          </template>
          <template #size-cell="{ row }">
            {{ row.original.size }}
          </template>
          <template #entryPx-cell="{ row }">
            {{ formatPrice(row.original.entryPx) }}
          </template>
          <template #pnl-cell="{ row }">
            <span
              :class="row.original.pnl >= 0 ? 'text-green-500' : 'text-red-500'"
            >
              {{ row.original.pnl >= 0 ? "+" : ""
              }}{{ formatPrice(row.original.pnl) }}
            </span>
          </template>
        </UTable>
      </div>

      <div v-if="orders.length > 0" class="space-y-4">
        <h3
          class="font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500"
        >
          <UIcon name="i-lucide-clock" />
          Open Orders ({{ orders.length }})
        </h3>
        <UTable
          :data="orders"
          :columns="orderColumns"
          class="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden"
        >
          <template #asset-cell="{ row }">
            <CoinDisplay :coin="row.original.asset" size="sm" />
          </template>
          <template #side-cell="{ row }">
            <UBadge
              :color="row.original.side === 'B' ? 'success' : 'error'"
              variant="subtle"
              size="sm"
            >
              {{ row.original.side === "B" ? "BUY" : "SELL" }}
            </UBadge>
          </template>
          <template #size-cell="{ row }">
            {{ row.original.size }}
          </template>
          <template #price-cell="{ row }">
            {{ formatPrice(row.original.price) }}
          </template>
        </UTable>
      </div>
    </div>
  </div>
</template>
