<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useActiveTrade } from "~/composables/useActiveTrade";
import { useTraderStore } from "~/composables/useTraderStore";
import { useTraderHook } from "~/composables/useTraderHook";
import { useTrading } from "~/composables/useTrading";
import { useHyperliquid } from "~/composables/useHyperliquid";
import { useTradeLinkage } from "~/composables/useTradeLinkage";
import { calculateROI } from "~/utils/trading/trading";
import { useToast } from "#imports";

const props = defineProps<{
  open: boolean;
  coin: string;
  tpPrice?: number;
  slPrice?: number;
}>();

const emit = defineEmits(["update:open", "saved"]);

const { address, wallet, hlClient, clearinghouse } = useTrading();
const { useMetaAndAssetCtxs, useAllMids } = useHyperliquid();
const { data: metaAndAssetCtxs } = useMetaAndAssetCtxs();
const { data: allMids } = useAllMids();
const { activeTrade, updateTrade } = useActiveTrade();
const { processTrade } = useTraderHook();
const { addLog } = useTraderStore();
const toast = useToast();

const localLeverage = ref<number>(10);
const isSaving = ref(false);

const direction = computed(
  () => (activeTrade.value?.direction as "long" | "short") || "long"
);

const position = computed(() => {
  const ch = clearinghouse.value;
  if (!ch || !("assetPositions" in ch) || !Array.isArray(ch.assetPositions))
    return null;
  return ch.assetPositions.find((p) => p?.position?.coin === props.coin);
});

const entryPrice = computed(() => {
  if (!position.value) return 0;
  return parseFloat(position.value.position.entryPx);
});

const {
  tpPrice: localTpPrice,
  slPrice: localSlPrice,
  tpPct: localTpPct,
  slPct: localSlPct,
  activeInput,
  updatePctsFromPrices,
} = useTradeLinkage({
  basePrice: entryPrice,
  leverage: localLeverage,
  direction,
  initialTpPrice: props.tpPrice || activeTrade.value?.take_profit_price,
  initialSlPrice: props.slPrice || activeTrade.value?.stop_loss_price,
});

const maxLeverage = computed(() => {
  if (!metaAndAssetCtxs.value) return 50;
  const universe = metaAndAssetCtxs.value[0].universe;
  const asset = universe.find((u: any) => u.name === props.coin);
  return asset?.maxLeverage ?? 50;
});

// Linkage logic
// ... (useTradeLinkage handles this)

watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      localTpPrice.value = props.tpPrice || activeTrade.value?.take_profit_price || 0;
      localSlPrice.value = props.slPrice || activeTrade.value?.stop_loss_price || 0;
      localLeverage.value = activeTrade.value?.leverage || 10;
      activeInput.value = (localTpPrice.value > 0 || localSlPrice.value > 0) ? "price" : "pct";

      // If prices were provided from orders, update %
      updatePctsFromPrices();
    }
  }
);

const saveEdit = async () => {
  isSaving.value = true;
  try {
    // 1. Cancel existing open orders for this coin
    if (hlClient && address.value && wallet.value && metaAndAssetCtxs.value) {
      const openOrders = await hlClient.fetchOpenOrders(address.value);
      const coinOrders = openOrders.filter((o: any) => o.coin === props.coin);

      if (coinOrders.length > 0) {
        const meta = metaAndAssetCtxs.value[0];
        const assetInfo = meta.universe.find((u: any) => u.name === props.coin);
        if (assetInfo) {
          const assetIndex = meta.universe.indexOf(assetInfo);
          const exchangeClient = hlClient.getExchangeClient(wallet.value);

          for (const order of coinOrders) {
            await exchangeClient.cancel({
              cancels: [
                {
                  a: assetIndex,
                  o: order.oid,
                },
              ],
            });
          }
        }
      }
    }

    // 2. Update the trade
    const { error } = await updateTrade({
      coin: props.coin,
      status: "entry_setup",
      take_profit_price: localTpPrice.value || 0,
      stop_loss_price: localSlPrice.value || 0,
      leverage: localLeverage.value,
    });

    if (error) throw error;

    addLog(
      `Trade for ${props.coin} updated: TP=${
        localTpPrice.value || "None"
      }, SL=${localSlPrice.value || "None"}. Status reset to entry_setup.`,
      "success"
    );

    toast.add({
      title: "Trade Updated",
      description: `Trade for ${props.coin} updated and reset to entry_setup.`,
      color: "success",
    });

    emit("update:open", false);
    emit("saved");

    await processTrade();
  } catch (e: any) {
    console.error("Error saving trade:", e);
    addLog(`Failed to update trade for ${props.coin}: ${e.message}`, "error");
    toast.add({
      title: "Error",
      description: e.message || "Failed to update trade",
      color: "error",
    });
  } finally {
    isSaving.value = false;
  }
};

const closeNow = async () => {
  const mid = allMids.value?.[props.coin];
  if (!mid) {
    toast.add({
      title: "Error",
      description: `Could not get current price for ${props.coin}`,
      color: "error",
    });
    return;
  }

  const currentMid = parseFloat(mid);
  const isLong = activeTrade.value?.direction === "long";

  // tight offset (0.01%)
  localTpPrice.value = isLong ? currentMid * 1.0001 : currentMid * 0.9999;
  localSlPrice.value = isLong ? currentMid * 0.9999 : currentMid * 1.0001;

  await saveEdit();
};

const breakEvenNow = async () => {
  if (!position.value) return;
  const entryPx = parseFloat(position.value.position.entryPx);
  localSlPrice.value = entryPx;
  await saveEdit();
};

const saveHalfNow = async () => {
  if (!position.value) return;
  const mid = allMids.value?.[props.coin];
  if (!mid) {
    toast.add({
      title: "Error",
      description: `Could not get current price for ${props.coin}`,
      color: "error",
    });
    return;
  }
  const currentMid = parseFloat(mid);
  const entryPx = parseFloat(position.value.position.entryPx);
  localSlPrice.value = (currentMid + entryPx) / 2;
  await saveEdit();
};
</script>

<template>
  <UModal
    :open="open"
    @update:open="emit('update:open', $event)"
    description="Updating will submit new open orders"
  >
    <template #title>
      <div class="flex items-center gap-3">
        <CoinDisplay :coin="coin" size="md" />
        <span class="font-bold text-lg">Edit Trade</span>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-xs font-medium text-gray-500 uppercase"
              >TP Price</label
            >
            <UInput
              v-model="localTpPrice"
              type="number"
              step="any"
              placeholder="Manual TP"
              color="neutral"
              @focus="activeInput = 'price'"
            />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-medium text-gray-500 uppercase"
              >TP %</label
            >
            <UInput
              v-model="localTpPct"
              type="number"
              step="any"
              placeholder="TP %"
              color="neutral"
              @focus="activeInput = 'pct'"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-xs font-medium text-gray-500 uppercase"
              >SL Price</label
            >
            <UInput
              v-model="localSlPrice"
              type="number"
              step="any"
              placeholder="Manual SL"
              color="neutral"
              @focus="activeInput = 'price'"
            />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-medium text-gray-500 uppercase"
              >SL %</label
            >
            <UInput
              v-model="localSlPct"
              type="number"
              step="any"
              placeholder="SL %"
              color="neutral"
              @focus="activeInput = 'pct'"
            />
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-xs font-medium text-gray-500 uppercase"
            >Leverage</label
          >
          <UInput
            v-model="localLeverage"
            type="number"
            step="any"
            :max="maxLeverage"
            color="neutral"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <div class="flex flex-col gap-2">
          <UButton
            color="warning"
            variant="soft"
            icon="i-lucide-shield-check"
            block
            :loading="isSaving"
            :disabled="!position"
            @click="breakEvenNow"
          >
            Break Even
          </UButton>
          <UButton
            color="warning"
            variant="soft"
            icon="i-lucide-divide"
            block
            :loading="isSaving"
            :disabled="!position"
            @click="saveHalfNow"
          >
            Save half
          </UButton>
          <UButton
            color="error"
            variant="soft"
            icon="i-lucide-x-circle"
            block
            :loading="isSaving"
            :disabled="!position"
            @click="closeNow"
          >
            Close Position
          </UButton>
        </div>
        <div class="flex items-center gap-3">
          <UButton
            variant="ghost"
            color="neutral"
            @click="emit('update:open', false)"
          >
            Cancel
          </UButton>
          <UButton color="primary" :loading="isSaving" @click="saveEdit">
            Save Changes
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
