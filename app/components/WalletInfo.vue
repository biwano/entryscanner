<script setup lang="ts">
import { computed } from "vue";
import { useTrading } from "~/composables/useTrading";
import { formatPrice, truncateAddress } from "~/utils/format";
import { useClipboard } from "@vueuse/core";

const { address, clearinghouse, isLoading } = useTrading();
const { copy, copied } = useClipboard();

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
    class="flex items-center gap-1 text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700"
  >
    <UTooltip
      :text="copied ? 'Copied!' : address"
      :popper="{ placement: 'top' }"
    >
      <button
        class="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        @click="copy(address || '')"
      >
        <div class="flex flex-col items-end">
          <span v-if="isLoading" class="text-xs text-gray-400">Loading...</span>
          <template v-else>
            <Private>
              <span class="font-bold text-primary">{{ formattedBalance }}</span>
            </Private>
          </template>
          <span class="text-[10px] text-gray-500 font-mono">
            {{ truncatedAddress }}
          </span>
        </div>
        <UIcon
          :name="copied ? 'i-lucide-check' : 'i-lucide-wallet'"
          class="w-4 h-4 transition-colors"
          :class="copied ? 'text-green-500' : 'text-gray-400'"
        />
      </button>
    </UTooltip>
  </div>
</template>
