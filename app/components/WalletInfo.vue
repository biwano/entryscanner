<script setup lang="ts">
import { computed } from "vue";
import { useProfile } from "~/composables/useProfile";
import { HyperliquidClient } from "~~shared/hyperliquid";
import { PrivateKeySigner } from "@nktkas/hyperliquid/signing";
import { useAsyncData } from "#app";
import { formatPrice, truncateAddress } from "~/utils/format";

const { profile } = useProfile();
const hlClient = new HyperliquidClient();

const wallet = computed(() => {
  if (!profile.value?.hl_api_key) return null;
  try {
    return new PrivateKeySigner(profile.value.hl_api_key);
  } catch (e) {
    console.error("Invalid HL API key", e);
    return null;
  }
});

const address = computed(() => wallet.value?.address ?? null);

const {
  data: balance,
  refresh: refreshBalance,
  status,
} = useAsyncData(
  "wallet_balance",
  async () => {
    if (!address.value) return null;
    try {
      const state = await hlClient.fetchClearinghouseState(address.value);
      console.log("state", state);
      return parseFloat(state.marginSummary.accountValue);
    } catch (e) {
      console.error("Failed to fetch balance", e);
      return 0;
    }
  },
  {
    watch: [address],
  }
);

const isLoading = computed(() => status.value === "pending");

// Truncate address for display: 0x1234...5678
const truncatedAddress = computed(() => truncateAddress(address.value || ""));

const formattedBalance = computed(() => formatPrice(balance.value ?? 0));
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
