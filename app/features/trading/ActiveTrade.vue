<script setup lang="ts">
import { computed, ref } from "vue";
import { useTrading } from "~/composables/useTrading";
import { useHyperliquid } from "~/composables/useHyperliquid";
import { useActiveTrade } from "~/composables/useActiveTrade";
import { formatPrice } from "~/utils/format";
import EditTradeModal from "./EditTradeModal.vue";

withDefaults(
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
const { activeTrade } = useActiveTrade();

const isEditModalOpen = ref(false);
const editForm = ref({
  coin: "",
  tpPrice: undefined as number | undefined,
  slPrice: undefined as number | undefined,
});

const openEditModal = () => {
  if (!activeTrade.value?.coin) return;

  // Start with database values as fallback
  let tpPrice = activeTrade.value.take_profit_price || undefined;
  let slPrice = activeTrade.value.stop_loss_price || undefined;

  // Try to find actual trigger prices from open orders on the exchange
  const coinOrders = (openOrders.value || []).filter(
    (o) => o.coin === activeTrade.value?.coin
  );

  const position = positions.value.find(
    (p) => p.asset === activeTrade.value?.coin
  );

  if (position) {
    const entryPx = position.entryPx;
    const isLong = activeTrade.value.direction === "long";

    coinOrders.forEach((o) => {
      // Hyperliquid trigger orders have isTrigger: true and a triggerPx
      const px = parseFloat(o.limitPx);
      if (isLong) {
        if (px > entryPx) tpPrice = px;
        else if (px < entryPx) slPrice = px;
      } else {
        if (px < entryPx) tpPrice = px;
        else if (px > entryPx) slPrice = px;
      }
    });
  }

  editForm.value = {
    coin: activeTrade.value.coin,
    tpPrice,
    slPrice,
  };

  isEditModalOpen.value = true;
};

const positions = computed(() => {
  if (!clearinghouse.value) return [];
  const accountValue = parseFloat(
    clearinghouse.value.marginSummary.accountValue
  );

  return clearinghouse.value.assetPositions
    .filter((p) => parseFloat(p.position.szi) !== 0)
    .map((p) => {
      const size = parseFloat(p.position.szi);
      const coin = p.position.coin;
      const currentPrice = allMids.value?.[coin]
        ? parseFloat(allMids.value[coin])
        : parseFloat(p.position.entryPx);

      const notionalSize = Math.abs(size) * currentPrice;
      const actualLeverage = accountValue > 0 ? notionalSize / accountValue : 0;

      const entryPx = parseFloat(p.position.entryPx);
      const unrealizedPnl = parseFloat(p.position.unrealizedPnl);
      const marginLeverage = p.position.leverage?.value || 1;
      const margin = (Math.abs(size) * entryPx) / marginLeverage;
      const pnlPct = margin > 0 ? (unrealizedPnl / margin) * 100 : 0;

      return {
        asset: coin,
        side: size > 0 ? "LONG" : "SHORT",
        size: Math.abs(size),
        entryPx: entryPx,
        leverage: actualLeverage,
        pnl: unrealizedPnl,
        pnlPct,
      };
    });
});

const orders = computed(() => {
  if (!openOrders.value) return [];
  return openOrders.value.map((o) => {
    const currentPx = allMids.value?.[o.coin];
    const price = parseFloat(o.limitPx);

    // Identify TP/SL type if there's an open position for this coin
    let type: "tp" | "sl" | undefined = undefined;
    const position = positions.value.find((p) => p.asset === o.coin);

    if (
      position &&
      activeTrade.value &&
      activeTrade.value.coin === o.coin &&
      currentPx
    ) {
      type =
        activeTrade.value.direction === "long"
          ? o.limitPx > currentPx
            ? "tp"
            : "sl"
          : o.limitPx > currentPx
          ? "sl"
          : "tp";

      const tp = activeTrade.value.take_profit_price;
      const sl = activeTrade.value.stop_loss_price;

      if (tp && Math.abs(price - tp) < 0.0001) type = "tp";
      else if (sl && Math.abs(price - sl) < 0.0001) type = "sl";
    }

    return {
      asset: o.coin,
      side: o.side,
      size: parseFloat(o.sz),
      price,
      type,
      currentPx: currentPx ? parseFloat(currentPx) : 0,
      oid: o.oid,
    };
  });
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
  { id: "leverage", header: "Lev" },
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
          <template #leverage-cell="{ row }">
            <span class="text-xs font-medium text-gray-500"
              >{{ row.original.leverage.toFixed(2) }}x</span
            >
          </template>
          <template #size-cell="{ row }">
            <Private>
              {{ row.original.size }}
            </Private>
          </template>
          <template #entryPx-cell="{ row }">
            {{ formatPrice(row.original.entryPx) }}
          </template>
          <template #pnl-cell="{ row }">
            <Private>
              <div class="flex flex-col items-end">
                <span
                  :class="
                    row.original.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                  "
                >
                  {{ row.original.pnl >= 0 ? "+" : ""
                  }}{{ formatPrice(row.original.pnl) }}
                </span>
                <span
                  class="text-[10px] opacity-70"
                  :class="
                    row.original.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                  "
                >
                  {{ row.original.pnl >= 0 ? "+" : ""
                  }}{{ row.original.pnlPct.toFixed(2) }}%
                </span>
              </div>
            </Private>
          </template>
        </UTable>
      </div>

      <div v-if="orders.length > 0" class="space-y-4">
        <div class="flex items-center justify-between">
          <h3
            class="font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500"
          >
            <UIcon name="i-lucide-clock" />
            Open Orders ({{ orders.length }})
          </h3>
          <UButton
            v-if="activeTrade?.status === 'exit_setup'"
            icon="i-lucide-pencil"
            variant="ghost"
            color="neutral"
            size="xs"
            @click="openEditModal"
          />
        </div>
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
            <Private>
              {{ row.original.size }}
            </Private>
          </template>
          <template #price-cell="{ row }">
            <div class="flex items-center gap-2">
              <span>{{ formatPrice(row.original.price) }}</span>
              <UBadge
                v-if="row.original.type === 'tp'"
                color="success"
                variant="subtle"
                size="xs"
                class="font-bold"
              >
                TP
              </UBadge>
              <UBadge
                v-if="row.original.type === 'sl'"
                color="error"
                variant="subtle"
                size="xs"
                class="font-bold"
              >
                SL
              </UBadge>
            </div>
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

    <!-- Edit Trade Modal -->
    <EditTradeModal
      v-model:open="isEditModalOpen"
      :coin="editForm.coin"
      :tp-price="editForm.tpPrice"
      :sl-price="editForm.slPrice"
    />
  </div>
</template>
