<script setup lang="ts">
import { computed, ref } from "vue";
import { usePortfolio } from "~/composables/usePortfolio";
import { useSupabaseUser } from "#imports";
import { useActiveTrade } from "~/composables/useActiveTrade";
import { useTraderHook } from "~/composables/useTraderHook";
import { useHyperliquid } from "~/composables/useHyperliquid";
import { formatPrice } from "~/utils/format";

const props = defineProps<{
  coin: string;
  isBullish: boolean;
}>();

const { wallet, address, clearinghouse } = usePortfolio();
const { updateTrade } = useActiveTrade();
const user = useSupabaseUser();
const { processTrade } = useTraderHook();
const { useMetaAndAssetCtxs } = useHyperliquid();

const { data: metaAndAssetCtxs } = useMetaAndAssetCtxs();

const maxLeverage = computed(() => {
  if (!metaAndAssetCtxs.value) return 50;
  const universe = metaAndAssetCtxs.value[0].universe;
  const asset = universe.find((u: any) => u.name === props.coin);
  return asset?.maxLeverage ?? 50;
});

const targetLeverage = computed(() => {
  return maxLeverage.value >= 10 ? 9.5 : maxLeverage.value * 0.95;
});

const accountValue = computed(() => {
  if (!clearinghouse.value) return 0;
  return parseFloat(clearinghouse.value.marginSummary.accountValue);
});

const estimatedSizeUsd = computed(() => accountValue.value * targetLeverage.value);

const hasOpenPosition = computed(() => {
  if (!clearinghouse.value || !address.value) return false;
  return clearinghouse.value.assetPositions.some(
    (p) => p.position.coin === props.coin && parseFloat(p.position.szi) !== 0
  );
});

const tpPrice = ref<number | undefined>();
const tpPct = ref(50);
const slPct = ref(10);
const isSubmitting = ref(false);

const startTrade = async (direction: "long" | "short") => {
  if (!user.value || !clearinghouse.value) return;

  isSubmitting.value = true;
  try {
    const { error } = await updateTrade({
      coin: props.coin,
      direction,
      status: "requested",
      take_profit_price: tpPrice.value || null,
      take_profit_pct: tpPct.value,
      stop_loss_pct: slPct.value,
    });

    if (error) throw error;

    // Trigger immediate check
    processTrade();
  } catch (e) {
    console.error("Error starting trade:", e);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div
    v-if="wallet && !hasOpenPosition"
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
        Est. Size: {{ formatPrice(estimatedSizeUsd) }}
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
        />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4">
      <div class="space-y-2">
        <label class="text-xs font-medium text-gray-500 uppercase"
          >TP Price (Optional)</label
        >
        <UInput
          v-model="tpPrice"
          class="w-full"
          type="number"
          step="any"
          placeholder="Manual Target"
          color="neutral"
        />
      </div>
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

    <p class="text-[10px] text-gray-400 text-center italic">
      Trade uses {{ targetLeverage.toFixed(1) }}x leverage based on your account
      value ({{ formatPrice(accountValue) }}).
    </p>
  </div>
</template>
