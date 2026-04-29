<script setup lang="ts">
import { watch } from "vue";
import { useTrading } from "~/composables/useTrading";
import { useRouter } from "vue-router";
import ActiveTrade from "~/features/trading/ActiveTrade.vue";
import TraderStatus from "~/features/trading/TraderStatus.vue";
import RecentTrades from "~/features/trading/RecentTrades.vue";

import AccountSummary from "~/features/trading/AccountSummary.vue";

const {
  address,
  wallet,
  isLoading,
  refreshTrading: refresh,
} = useTrading();
const router = useRouter();

// Watch for wallet/api_key and redirect to profile if not set and not loading
watch(
  [wallet, isLoading],
  ([newWallet, newLoading]) => {
    if (!newWallet && !newLoading) {
      router.push("/profile");
    }
  },
  { immediate: true }
);

useHead({
  title: "Trading",
});
</script>

<template>
  <div class="space-y-8">
    <div v-if="wallet" class="space-y-8">
      <div v-if="address" class="space-y-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold">Trading Status</h1>
          </div>
          <UButton
            color="primary"
            icon="i-lucide-refresh-cw"
            :loading="isLoading"
            @click="refresh"
          >
            Refresh Data
          </UButton>
        </div>

        <AccountSummary />

        <ActiveTrade />
        <TraderStatus />
        <RecentTrades />
      </div>

      <div
        v-else-if="!isLoading"
        class="flex flex-col items-center justify-center py-20 text-center space-y-6"
      >
        <UIcon name="i-lucide-info" class="w-12 h-12 text-gray-400" />
        <div class="space-y-2">
          <h1 class="text-2xl font-bold">Wallet Address Required</h1>
          <p class="text-gray-500 max-w-sm">
            You have entered an API key, but we also need your Hyperliquid
            wallet address to fetch your trading data.
          </p>
        </div>
        <UButton to="/profile" color="primary" icon="i-lucide-user">
          Go to Profile
        </UButton>
      </div>
    </div>

    <div
      v-else-if="!isLoading"
      class="flex flex-col items-center justify-center py-20 text-center space-y-6"
    >
      <UIcon name="i-lucide-lock" class="w-12 h-12 text-gray-400" />
      <div class="space-y-2">
        <h1 class="text-2xl font-bold">Trading Locked</h1>
        <p class="text-gray-500 max-w-sm">
          Please enter your Hyperliquid API key in the Profile Settings to
          access trading features.
        </p>
      </div>
      <UButton to="/profile" color="primary" icon="i-lucide-user">
        Go to Profile
      </UButton>
    </div>

    <div v-else class="flex justify-center py-20">
      <UIcon
        name="i-lucide-loader"
        class="w-12 h-12 text-primary animate-spin"
      />
    </div>
  </div>
</template>
