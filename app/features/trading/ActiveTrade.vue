<script setup lang="ts">
import { computed } from "vue";
import { useTrading } from "~/composables/useTrading";
import { useHyperliquid } from "~/composables/useHyperliquid";
import { formatPrice } from "~/utils/format";

const props = withDefaults(
  defineProps<{
    isDashboard?: boolean;
  }>(),
  {
    isDashboard: false,
  }
);

const { address, clearinghouse, openOrders, isLoading } = useTrading();
const { useAllMids } = useHyperliquid();
const { data: allMids } = useAllMids();

const positions = computed(() => {
  if (!clearinghouse.value) return [];
  return clearinghouse.value.assetPositions
    .filter((p) => parseFloat(p.position.szi) !== 0)
    .map((p) => {
      const size = parseFloat(p.position.szi);
      return {
        asset: p.position.coin,
        side: size > 0 ? "LONG" : "SHORT",
        size: Math.abs(size),
        entryPx: parseFloat(p.position.entryPx),
        pnl: parseFloat(p.position.unrealizedPnl),
      };
    });
});

const orders = computed(() => {
  if (!openOrders.value) return [];
  return openOrders.value.map((o) => {
    const currentPx = allMids.value?.[o.coin];
    return {
      asset: o.coin,
      side: o.side,
      size: parseFloat(o.sz),
      price: parseFloat(o.limitPx),
      currentPx: currentPx ? parseFloat(currentPx) : 0,
    };
  });
});

const withdrawable = computed(() => {
  if (!clearinghouse.value) return 0;
  return parseFloat(clearinghouse.value.withdrawable);
});

const tradedCoins = computed(() => {
  const coins = new Set<string>();
  positions.value.forEach((p) => coins.add(p.asset));
  orders.value.forEach((o) => coins.add(o.asset));
  return Array.from(coins).map((coin) => ({
    symbol: coin,
    price: allMids.value?.[coin] ? parseFloat(allMids.value[coin]) : 0,
  }));
});

const hasActiveTrades = computed(
  () => positions.value.length > 0 || orders.value.length > 0
);
const shouldShow = computed(
  () => address.value !== null && hasActiveTrades.value
);

const columns = [
  { id: "asset", header: "Asset" },
  { id: "side", header: "Side" },
  { id: "size", header: "Size" },
  { id: "entryPx", header: "Entry Price" },
  { id: "pnl", header: "PnL" },
];

const orderColumns = [
  { id: "asset", header: "Asset" },
  { id: "side", header: "Side" },
  { id: "size", header: "Size" },
  { id: "price", header: "Order Price" },
];
</script>

<template>
  <div
    v-if="shouldShow"
    class="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm"
  >
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold flex items-center gap-2">
          <UIcon name="i-lucide-wallet" class="text-primary" />
          Active trade
        </h2>
        <div class="flex items-center gap-2">
          <p class="text-sm text-gray-500">Real-time overview of your trade.</p>
          <UButton
            v-if="isDashboard"
            to="/trading"
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

      <div class="flex items-center gap-4">
        <div
          v-for="coin in tradedCoins"
          :key="coin.symbol"
          class="flex flex-col items-end"
        >
          <div class="flex items-center gap-1.5">
            <CoinDisplay :coin="coin.symbol" size="sm" />
            <span class="text-lg font-bold font-mono">{{
              formatPrice(coin.price)
            }}</span>
          </div>
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
            <TableLink :to="`/pair/${row.original.asset}`">
              <CoinDisplay :coin="row.original.asset" size="sm" />
            </TableLink>
          </template>
          <template #side-cell="{ row }">
            <UBadge
              :color="row.original.side === 'LONG' ? 'success' : 'error'"
              variant="subtle"
              size="sm"
            >
              {{ row.original.side }}
            </UBadge>
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
            <TableLink :to="`/pair/${row.original.asset}`">
              <CoinDisplay :coin="row.original.asset" size="sm" />
            </TableLink>
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
    <div
      v-else-if="!isLoading"
      class="flex flex-col items-center justify-center py-8 text-center space-y-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700"
    >
      <UIcon name="i-lucide-info" class="w-8 h-8 text-gray-400" />
      <div class="text-gray-500 font-medium">No active trades</div>
    </div>
  </div>
</template>
