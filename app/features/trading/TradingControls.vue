<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useTrading } from "~/composables/useTrading";
import { useSupabaseUser, useToast } from "#imports";
import { useActiveTrade } from "~/composables/useActiveTrade";
import { useTraderHook } from "~/composables/useTraderHook";
import { useHyperliquid } from "~/composables/useHyperliquid";
import { useTradeLinkage } from "~/composables/useTradeLinkage";
import { formatPrice } from "~/utils/format";

const props = defineProps<{
  coin: string;
  isBullish: boolean;
}>();

const { wallet, address, clearinghouse } = useTrading();
const { updateTrade, activeTrade } = useActiveTrade();
const user = useSupabaseUser();
const { processTrade } = useTraderHook();
const { useMetaAndAssetCtxs, useAllMids } = useHyperliquid();
const toast = useToast();

const { data: metaAndAssetCtxs } = useMetaAndAssetCtxs();
const { data: allMids } = useAllMids();

const maxLeverage = computed(() => {
  if (!metaAndAssetCtxs.value) return 50;
  const universe = metaAndAssetCtxs.value[0].universe;
  const asset = universe.find((u: any) => u.name === props.coin);
  return asset?.maxLeverage ?? 50;
});

const accountValue = computed(() => {
  if (!clearinghouse.value) return 0;
  return parseFloat(clearinghouse.value.marginSummary.accountValue);
});

const estimatedSizeUsd = computed(() => accountValue.value * leverage.value);

const hasOpenPosition = computed(() => {
  if (!clearinghouse.value || !address.value) return false;
  return clearinghouse.value.assetPositions.some(
    (p) => p.position.coin === props.coin && parseFloat(p.position.szi) !== 0
  );
});

const leverage = ref(9.5);
const isSubmitting = ref(false);

const currentMidPrice = computed(() => {
  const mid = allMids.value?.[props.coin];
  return mid ? parseFloat(mid) : 0;
});

const direction = computed(() => (props.isBullish ? "long" : "short"));

const {
  tpPrice,
  slPrice,
  tpPct,
  slPct,
  activeInput,
  updatePricesFromPcts,
} = useTradeLinkage({
  basePrice: currentMidPrice,
  leverage,
  direction,
});

watch(
  maxLeverage,
  (max) => {
    leverage.value = max >= 10 ? 9.5 : max * 0.95;
    // Recalculate % based on new default leverage and current (empty) prices
    if (currentMidPrice.value) updatePricesFromPcts();
  },
  { immediate: true }
);

const startTrade = async (
  direction: "long" | "short",
  status: "requested" | "auto_entry" = "requested"
) => {
  if (!user.value || !clearinghouse.value) return;

  isSubmitting.value = true;
  try {
    const { error } = await updateTrade({
      coin: props.coin,
      direction,
      status,
      take_profit_price: tpPrice.value || null,
      stop_loss_price: slPrice.value || null,
      take_profit_pct: tpPct.value,
      stop_loss_pct: slPct.value,
      leverage: leverage.value,
    });

    if (error) throw error;

    toast.add({
      title: status === "auto_entry" ? "Auto Entry Requested" : "Trade Requested",
      description:
        status === "auto_entry"
          ? `Monitoring ${props.coin} for auto ${direction} entry...`
          : `Starting ${direction} trade for ${props.coin}...`,
      color: "success",
    });

    await processTrade();
  } catch (e: any) {
    console.error("Error starting trade:", e);
    toast.add({
      title: "Error starting trade",
      description: e.message || "An unknown error occurred",
      color: "error",
    });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div
    v-if="
      wallet &&
      !hasOpenPosition &&
      (!activeTrade || activeTrade?.status === 'sleeping')
    "
    class="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-800 space-y-4"
  >
    <div
      class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800"
    >
      <div class="flex flex-col">
        <h3 class="text-lg font-bold">Trade</h3>
        <span class="text-[10px] text-gray-500 font-mono"
          >Max: {{ maxLeverage }}x</span
        >
      </div>
      <div class="text-xs font-mono font-bold text-primary">
        Est. Size:
        <Private>
          {{ formatPrice(estimatedSizeUsd) }}
        </Private>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <label class="text-xs font-medium text-gray-500 uppercase"
          >Stop Loss (%)</label
        >
        <UInput
          v-model="slPct"
          type="number"
          step="0.5"
          min="0.5"
          color="neutral"
          @focus="activeInput = 'pct'"
        />
      </div>
      <div class="space-y-2">
        <label class="text-xs font-medium text-gray-500 uppercase"
          >Take Profit (%)</label
        >
        <UInput
          v-model="tpPct"
          type="number"
          step="1"
          min="1"
          color="neutral"
          @focus="activeInput = 'pct'"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <label class="text-xs font-medium text-gray-500 uppercase"
          >SL Price (Optional)</label
        >
        <UInput
          v-model="slPrice"
          class="w-full"
          type="number"
          step="any"
          placeholder="Manual SL"
          color="neutral"
          @focus="activeInput = 'price'"
        />
      </div>
      <div class="space-y-2">
        <label class="text-xs font-medium text-gray-500 uppercase"
          >TP Price (Optional)</label
        >
        <UInput
          v-model="tpPrice"
          class="w-full"
          type="number"
          step="any"
          placeholder="Manual TP"
          color="neutral"
          @focus="activeInput = 'price'"
        />
      </div>
    </div>

    <div class="space-y-2">
      <label class="text-xs font-medium text-gray-500 uppercase">Leverage</label>
      <UInput
        v-model="leverage"
        type="number"
        step="0.1"
        :min="0.1"
        :max="maxLeverage"
        color="neutral"
      />
    </div>

    <div class="flex gap-4 pt-2">
      <UButton
        v-if="isBullish"
        class="flex-1 justify-center"
        :color="isBullish ? 'success' : 'neutral'"
        :variant="isBullish ? 'solid' : 'outline'"
        :loading="isSubmitting"
        @click="startTrade('long')"
      >
        Buy (Long)
      </UButton>
      <UButton
        v-if="!isBullish"
        class="flex-1 justify-center"
        :color="!isBullish ? 'error' : 'neutral'"
        :variant="!isBullish ? 'solid' : 'outline'"
        :loading="isSubmitting"
        @click="startTrade('short')"
      >
        Sell (Short)
      </UButton>
    </div>

    <div class="pt-2">
      <UButton
        class="w-full justify-center"
        color="primary"
        variant="outline"
        icon="i-heroicons-bolt"
        :loading="isSubmitting"
        @click="startTrade(isBullish ? 'long' : 'short', 'auto_entry')"
      >
        Auto {{ isBullish ? "Buy" : "Sell" }} (Hourly SMA 50)
      </UButton>
    </div>

    <p class="text-[10px] text-gray-400 text-center italic">
      Trade uses {{ leverage.toFixed(1) }}x leverage based on your account
      value (
      <Private> {{ formatPrice(accountValue) }} </Private>
      ).
    </p>
  </div>
</template>
