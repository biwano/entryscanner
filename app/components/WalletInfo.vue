<script setup lang="ts">
import { computed } from "vue";
import { usePortfolio } from "~/composables/usePortfolio";
import { formatPrice, truncateAddress } from "~/utils/format";

const { address, clearinghouse, isLoading } = usePortfolio();

const balance = computed(() => {
  if (!clearinghouse.value) return 0;
  return parseFloat(clearinghouse.value.marginSummary.accountValue);
});

// Truncate address for display: 0x1234...5678
const truncatedAddress = computed(() => truncateAddress(address.value || ""));

const formattedBalance = computed(() => formatPrice(balance.value));
</script>

<template>
  <div
    v-if="address"
    class="flex items-center gap-3 text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700"
  >
    <div class="flex flex-col items-end">
      <span v-if="isLoading" class="text-xs text-gray-400">Loading...</span>
      <span v-else class="font-bold text-primary">{{ formattedBalance }}</span>
      <span class="text-[10px] text-gray-500 font-mono">{{
        truncatedAddress
      }}</span>
    </div>
    <UTooltip :text="address">
      <UIcon name="i-lucide-wallet" class="w-4 h-4 text-gray-400" />
    </UTooltip>
  </div>
</template>
