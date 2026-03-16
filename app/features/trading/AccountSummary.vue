<script setup lang="ts">
import { computed } from "vue";
import { useTrading } from "~/composables/useTrading";
import { formatPrice } from "~/utils/format";

const { clearinghouse } = useTrading();

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
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
    <UCard class="bg-primary/5 border-primary/20">
      <div class="text-sm text-gray-500 uppercase tracking-wider font-bold">
        Total Account Value
      </div>
      <div class="text-3xl font-black text-primary mt-1">
        <Private>
          {{ formatPrice(accountValue) }}
        </Private>
      </div>
    </UCard>

    <UCard
      class="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
    >
      <div class="text-sm text-gray-500 uppercase tracking-wider font-bold">
        Margin Used
      </div>
      <div class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
        <Private>
          {{ formatPrice(marginUsed) }}
        </Private>
      </div>
    </UCard>

    <UCard
      class="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
    >
      <div class="text-sm text-gray-500 uppercase tracking-wider font-bold">
        Maint. Margin
      </div>
      <div class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
        <Private>
          {{ formatPrice(crossMaintenanceMarginUsed) }}
        </Private>
      </div>
    </UCard>

    <UCard
      class="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
    >
      <div class="text-sm text-gray-500 uppercase tracking-wider font-bold">
        Withdrawable
      </div>
      <div class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
        <Private>
          {{ formatPrice(withdrawable) }}
        </Private>
      </div>
    </UCard>
  </div>
</template>
