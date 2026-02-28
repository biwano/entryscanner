<script setup lang="ts">
import { ref, computed, watchEffect } from "vue";
import { useAsyncData, navigateTo } from "#app";
import { useSupabaseClient } from "#imports";
import { useHyperliquid } from "~/composables/useHyperliquid";
import { useUser } from "~/composables/useUser";

const supabase = useSupabaseClient();
const { isAdmin, userSystem } = useUser();
const { useMetaAndAssetCtxs } = useHyperliquid();
const { data: metaAndAssetCtxs, status: metaStatus } = useMetaAndAssetCtxs();

// Simple redirect if not admin
watchEffect(() => {
  if (userSystem.value && !isAdmin.value) {
    navigateTo("/");
  }
});

interface MonitoredPair {
  id: string;
  coin: string;
  last_updated: string;
}

const { data: monitoredPairs, refresh: refreshMonitored } = await useAsyncData(
  "monitored_pairs_mgmt",
  async () => {
    const { data } = await supabase.from("monitored_pairs").select("*");
    return (data as MonitoredPair[]) || [];
  }
);

const allAvailableCoins = computed<string[]>(() => {
  console.log("metaAndAssetCtxs.value", metaAndAssetCtxs.value);
  if (!metaAndAssetCtxs.value) return [];
  const meta = metaAndAssetCtxs.value[0] as any;
  return meta.universe.map((u: any) => u.name).sort();
});

const isMonitored = (coin: string) => {
  return (monitoredPairs.value as MonitoredPair[] | null)?.some(
    (p) => p.coin === coin
  );
};

const toggleMonitored = async (coin: string) => {
  if (!isAdmin.value) return;

  if (isMonitored(coin)) {
    // Remove
    const pair = (monitoredPairs.value as MonitoredPair[] | null)?.find(
      (p) => p.coin === coin
    );
    if (pair) {
      await (supabase.from("monitored_pairs") as any)
        .delete()
        .eq("id", pair.id);
    }
  } else {
    // Add
    await (supabase.from("monitored_pairs") as any).insert({
      coin,
      last_updated: new Date().toISOString(),
    });
  }
  await refreshMonitored();
};

const searchQuery = ref("");
const filteredCoins = computed(() => {
  if (!searchQuery.value) return allAvailableCoins.value;
  return allAvailableCoins.value.filter((c: string) =>
    c.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const bulkAddVisible = async () => {
  if (!isAdmin.value) return;
  const toAdd = filteredCoins.value.filter((c) => !isMonitored(c));
  if (toAdd.length === 0) return;

  const entries = toAdd.map((coin) => ({
    coin,
    last_updated: new Date().toISOString(),
  }));
  await (supabase.from("monitored_pairs") as any).insert(entries);
  await refreshMonitored();
};

const bulkRemoveVisible = async () => {
  if (!isAdmin.value) return;
  const toRemove = filteredCoins.value.filter((c) => isMonitored(c));
  if (toRemove.length === 0) return;

  await (supabase.from("monitored_pairs") as any).delete().in("coin", toRemove);
  await refreshMonitored();
};
</script>

<template>
  <div v-if="isAdmin" class="space-y-8">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">Asset Management</h1>
      <div class="flex gap-4">
        <UButton
          v-if="filteredCoins.length > 0"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="bulkAddVisible"
          >Add All Visible</UButton
        >
        <UButton
          v-if="filteredCoins.length > 0"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="bulkRemoveVisible"
          >Remove All Visible</UButton
        >
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Search assets..."
          class="w-64"
        />
      </div>
    </div>

    <UCard class="shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold">Available Perpetual Markets</h2>
          <span class="text-sm text-gray-500"
            >{{ monitoredPairs?.length }} Monitored /
            {{ allAvailableCoins?.length }} Available</span
          >
        </div>
      </template>

      <div
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 py-4"
      >
        <UButton
          v-for="coin in filteredCoins"
          :key="coin"
          :color="isMonitored(coin) ? 'primary' : 'neutral'"
          :variant="isMonitored(coin) ? 'solid' : 'outline'"
          size="sm"
          class="justify-start truncate"
          @click="toggleMonitored(coin)"
        >
          <template #leading>
            <UIcon
              :name="
                isMonitored(coin)
                  ? 'i-lucide-check-circle'
                  : 'i-lucide-circle-plus'
              "
              class="w-4 h-4"
            />
          </template>
          {{ coin }}
        </UButton>
      </div>

      <div
        v-if="filteredCoins.length === 0"
        class="text-center py-10 text-gray-500 italic"
      >
        No assets found matching your search.
      </div>
    </UCard>

    <UCard class="shadow-sm bg-primary/5 border border-primary/20">
      <div class="flex items-start gap-4">
        <UIcon name="i-lucide-info" class="w-6 h-6 text-primary mt-1" />
        <div>
          <h3 class="font-bold text-primary">System Information</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Adding a coin here enables system-wide monitoring. The Trend Worker
            will automatically start tracking its 200 EMA status on Daily and
            Weekly timeframes.
          </p>
        </div>
      </div>
    </UCard>
  </div>
  <AccessDenied v-else />
</template>
