<script setup lang="ts">
import { ref, watch } from "vue";
import { useActiveTrade } from "~/composables/useActiveTrade";
import { useTraderHook } from "~/composables/useTraderHook";
import { useTrading } from "~/composables/useTrading";
import { useHyperliquid } from "~/composables/useHyperliquid";
import { useToast } from "#imports";

const props = defineProps<{
  open: boolean;
  coin: string;
  tpPrice?: number;
  slPrice?: number;
}>();

const emit = defineEmits(["update:open", "saved"]);

const { updateTrade } = useActiveTrade();
const { processTrade } = useTraderHook();
const { hlClient, address, wallet } = useTrading();
const { useMetaAndAssetCtxs } = useHyperliquid();
const { data: metaAndAssetCtxs } = useMetaAndAssetCtxs();
const toast = useToast();

const localTpPrice = ref<number | undefined>(props.tpPrice);
const localSlPrice = ref<number | undefined>(props.slPrice);
const isSaving = ref(false);

watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      localTpPrice.value = props.tpPrice;
      localSlPrice.value = props.slPrice;
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
      take_profit_price: localTpPrice.value || null,
      stop_loss_price: localSlPrice.value || null,
    });

    if (error) throw error;

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
    toast.add({
      title: "Error",
      description: e.message || "Failed to update trade",
      color: "error",
    });
  } finally {
    isSaving.value = false;
  }
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
          />
        </div>
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
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
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
    </template>
  </UModal>
</template>
