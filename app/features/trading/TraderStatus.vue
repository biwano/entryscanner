<script setup lang="ts">
import { computed, ref } from "vue";
import { useActiveTrade } from "~/composables/useActiveTrade";
import { useTraderStore } from "~/composables/useTraderStore";
import { useHyperliquid } from "~/composables/useHyperliquid";
import { formatTime } from "~/utils/format";
import PriceChart from "~/features/charts/PriceChart.vue";
import { CANDLE_COUNT } from "~~shared/constants";
import { calculateStartTime } from "~~shared/trends";
import { useToast } from "#imports";

const { activeTrade, updateTrade } = useActiveTrade();
const traderStore = useTraderStore();
const { useCandles } = useHyperliquid();
const toast = useToast();

const logs = computed(() => traderStore.logs.value || []);

const timeframe = ref<"1h" | "1d" | "1w">("1h");
const isSleeping = ref(false);

const setSleeping = async () => {
  isSleeping.value = true;
  try {
    const { error } = await updateTrade({ status: "sleeping" });
    if (!error) {
      traderStore.addLog("Manual reset to sleeping", "info");
      toast.add({
        title: "Status Updated",
        description: "Trader status set to sleeping",
        color: "success",
      });
    }
  } finally {
    isSleeping.value = false;
  }
};

const startTime = computed(() => {
  const tf =
    timeframe.value === "1h" ? "H1" : timeframe.value === "1d" ? "D1" : "W1";
  return calculateStartTime(tf, CANDLE_COUNT);
});

const { data: candles } = useCandles(
  () => activeTrade.value?.coin || "",
  () => timeframe.value,
  () => startTime.value
);

const statusColor = computed(() => {
  switch (activeTrade.value?.status) {
    case "auto_entry":
      return "info";
    case "requested":
      return "primary";
    case "entry_setup":
      return "warning";
    case "exit_setup":
      return "success";
    default:
      return "neutral";
  }
});
</script>

<template>
  <div
    v-if="activeTrade && activeTrade.status !== 'sleeping'"
    class="space-y-6"
  >
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-bot" class="w-6 h-6 text-primary" />
            <h3 class="text-lg font-bold">Active Trader Hook</h3>
          </div>
          <div class="flex items-center gap-2">
            <UBadge :color="statusColor" variant="solid" class="uppercase">
              {{ activeTrade.status.replace(/_/g, " ") }}
            </UBadge>
            <UButton
              v-if="activeTrade.status === 'auto_entry'"
              icon="i-lucide-bed-double"
              size="xs"
              variant="soft"
              color="warning"
              label="Sleep"
              :loading="isSleeping"
              @click="setSleeping"
            />
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div
            class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700"
          >
            <div
              class="text-gray-500 text-xs uppercase font-bold tracking-wider"
            >
              Asset
            </div>
            <div class="text-lg font-black">
              {{ activeTrade.coin }} ({{
                activeTrade.direction?.toUpperCase()
              }})
            </div>
          </div>
          <div
            class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700"
          >
            <div
              class="text-gray-500 text-xs uppercase font-bold tracking-wider"
            >
              Take Profit
            </div>
            <div class="text-lg font-black">
              {{ activeTrade.take_profit_price }}
            </div>
          </div>
          <div
            class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700"
          >
            <div
              class="text-gray-500 text-xs uppercase font-bold tracking-wider"
            >
              Stop Loss
            </div>
            <div class="text-lg font-black">
              {{ activeTrade.stop_loss_price }}
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h4
              class="text-sm font-bold uppercase text-gray-500 tracking-widest"
            >
              Trader Activity Log
            </h4>
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              @click="traderStore.clearLogs"
              >Clear Logs</UButton
            >
          </div>
          <div
            class="bg-black text-green-400 p-4 rounded-lg font-mono text-xs h-48 overflow-y-auto border border-gray-800 shadow-inner"
          >
            <div v-if="logs.length === 0" class="text-gray-600 italic">
              No activity recorded yet...
            </div>
            <div v-for="(log, i) in logs" :key="i" class="mb-1 flex gap-2">
              <span class="text-gray-600 shrink-0"
                >[{{ formatTime(log.timestamp) }}]</span
              >
              <span
                :class="{
                  'text-blue-400': log.type === 'info',
                  'text-green-400': log.type === 'success',
                  'text-yellow-400': log.type === 'warning',
                  'text-red-400': log.type === 'error',
                }"
                >{{ log.message }}</span
              >
            </div>
          </div>
        </div>

        <div
          class="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800"
        >
          <div class="flex items-center justify-between">
            <h4
              class="text-sm font-bold uppercase text-gray-500 tracking-widest"
            >
              Live Chart
            </h4>
            <UButtonGroup size="xs" variant="ghost">
              <UButton
                :color="timeframe === '1h' ? 'primary' : 'neutral'"
                @click="timeframe = '1h'"
                >H1</UButton
              >
              <UButton
                :color="timeframe === '1d' ? 'primary' : 'neutral'"
                @click="timeframe = '1d'"
                >D1</UButton
              >
              <UButton
                :color="timeframe === '1w' ? 'primary' : 'neutral'"
                @click="timeframe = '1w'"
                >W1</UButton
              >
            </UButtonGroup>
          </div>
          <div class="min-h-[300px]">
            <PriceChart
              v-if="activeTrade?.coin && candles && candles.length > 0"
              :coin="activeTrade.coin"
              :candles="candles"
              :timeframe="
                timeframe === '1h' ? 'H1' : timeframe === '1d' ? 'D1' : 'W1'
              "
              no-card
            />
            <div
              v-else
              class="h-[300px] flex items-center justify-center text-gray-500 italic"
            >
              Loading chart data...
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
