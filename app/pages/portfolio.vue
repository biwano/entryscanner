<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { usePortfolio } from "~/composables/usePortfolio";
import { formatPrice } from "~/utils/format";
import { useRouter } from "vue-router";
import ActiveTrade from "~/features/portfolio/ActiveTrade.vue";
import TraderStatus from "~/features/trading/TraderStatus.vue";

const {
  address,
  wallet,
  clearinghouse,
  openOrders,
  isLoading,
  refreshPortfolio: refresh,
} = usePortfolio();
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

const accountValue = computed(() => {
  if (!clearinghouse.value) return 0;
  return parseFloat(clearinghouse.value.marginSummary.accountValue);
});

const marginUsed = computed(() => {
  if (!clearinghouse.value) return 0;
  return parseFloat(clearinghouse.value.marginSummary.totalMarginUsed);
});

const crossMaintenanceMarginUsed = computed(() => {
  if (!clearinghouse.value) return 0;
  return parseFloat(clearinghouse.value.crossMaintenanceMarginUsed);
});

const withdrawable = computed(() => {
  if (!clearinghouse.value) return 0;
  return parseFloat(clearinghouse.value.withdrawable);
});

useHead({
  title: "Portfolio",
});
</script>

<template>
  <div class="space-y-8">
    <div v-if="wallet" class="space-y-8">
      <div v-if="address" class="space-y-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold">Your Portfolio</h1>
            <p class="text-gray-500">Managing assets for {{ address }}</p>
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

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <UCard class="bg-primary/5 border-primary/20">
            <div
              class="text-sm text-gray-500 uppercase tracking-wider font-bold"
            >
              Total Account Value
            </div>
            <div class="text-3xl font-black text-primary mt-1">
              {{ formatPrice(accountValue) }}
            </div>
          </UCard>

          <UCard
            class="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          >
            <div
              class="text-sm text-gray-500 uppercase tracking-wider font-bold"
            >
              Margin Used
            </div>
            <div class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {{ formatPrice(marginUsed) }}
            </div>
          </UCard>

          <UCard
            class="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          >
            <div
              class="text-sm text-gray-500 uppercase tracking-wider font-bold"
            >
              Maint. Margin
            </div>
            <div class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {{ formatPrice(crossMaintenanceMarginUsed) }}
            </div>
          </UCard>

          <UCard
            class="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          >
            <div
              class="text-sm text-gray-500 uppercase tracking-wider font-bold"
            >
              Withdrawable
            </div>
            <div class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {{ formatPrice(withdrawable) }}
            </div>
          </UCard>
        </div>

        <ActiveTrade />
        <TraderStatus />
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
            wallet address to fetch your portfolio data.
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
        <h1 class="text-2xl font-bold">Portfolio Locked</h1>
        <p class="text-gray-500 max-w-sm">
          Please enter your Hyperliquid API key in the Profile Settings to
          access your portfolio.
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
