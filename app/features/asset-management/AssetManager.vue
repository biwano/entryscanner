<script setup lang="ts">
import { ref, computed } from "vue";
import { useSupabaseClient } from "#imports";
import type { Database } from "~/types/database.types";
import type { MonitoredPair } from "~/types/database.friendly.types";

const props = defineProps<{
  monitoredPairs: MonitoredPair[];
  allAvailableCoins: string[];
  isAdmin: boolean;
}>();

const emit = defineEmits<{
  (e: "refresh"): void;
}>();

const supabase = useSupabaseClient<Database>();
const searchQuery = ref("");

const isMonitored = (coin: string) => {
  return props.monitoredPairs.some(
    (p) => p.coin === coin && p.active
  );
};

const filteredCoins = computed(() => {
  if (!searchQuery.value) return props.allAvailableCoins;
  return props.allAvailableCoins.filter((c: string) =>
    c.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const toggleMonitored = async (coin: string) => {
  if (!props.isAdmin) return;

  const existingPair = props.monitoredPairs.find(
    (p) => p.coin === coin
  );

  // Use upsert on coin primary key
  await supabase.from("monitored_pairs")
    .upsert({
      coin,
      active: existingPair ? !existingPair.active : true,
      last_updated: new Date().toISOString(),
    });

  emit("refresh");
};

const bulkAddVisible = async () => {
  if (!props.isAdmin) return;
  const toProcess = filteredCoins.value.filter((c) => !isMonitored(c));
  if (toProcess.length === 0) return;

  // Use bulk upsert on coin primary key
  const now = new Date().toISOString();
  const records = toProcess.map(coin => ({
    coin,
    active: true,
    last_updated: now,
  }));

  await supabase.from("monitored_pairs").upsert(records);
  emit("refresh");
};

const bulkRemoveVisible = async () => {
  if (!props.isAdmin) return;
  const toRemove = filteredCoins.value.filter((c) => isMonitored(c));
  if (toRemove.length === 0) return;

  // Update multiple rows using 'in' filter on coin (the PK)
  await supabase.from("monitored_pairs")
    .update({ active: false, last_updated: new Date().toISOString() })
    .in("coin", toRemove);
  emit("refresh");
};
</script>

<template>
  <div class="space-y-8">
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
            >{{ monitoredPairs?.filter((p) => p.active).length }} Monitored /
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
            will automatically start tracking its 50 SMA status on Daily and
            Weekly timeframes.
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>
