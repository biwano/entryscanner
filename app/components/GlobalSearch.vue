<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useSupabaseClient } from "#imports";
import { useQuery } from "@tanstack/vue-query";
import type { Database } from "~/types/database.types";
import type { SelectMenuItem } from "@nuxt/ui";

const supabase = useSupabaseClient<Database>();

const { data: monitoredPairs } = useQuery({
  queryKey: ["monitored_pairs_search"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("monitored_pairs")
      .select("coin")
      .eq("active", true)
      .order("coin", { ascending: true });

    if (error) throw error;
    return data;
  },
  staleTime: 1000 * 60 * 5, // 5 minutes
});

interface SearchOption {
  label: string;
  value: string;
}

const RESET_GLOBAL_COIN_SEARCH_EVENT = "reset-global-coin-search";

const router = useRouter();
const selected = ref<SearchOption | null>(null);
const menuKey = ref(0);

const options = computed(() => {
  if (!monitoredPairs.value) return [];
  return monitoredPairs.value.map((p) => ({
    label: p.coin,
    value: p.coin,
  })) satisfies SelectMenuItem[];
});

const onSelect = (coin: SearchOption) => {
  router.push(`/pair/${coin.value}`);
  selected.value = null; // Reset selection to clear input
};

const resetSearch = () => {
  selected.value = null;
  menuKey.value += 1;
};

onMounted(() => {
  window.addEventListener(RESET_GLOBAL_COIN_SEARCH_EVENT, resetSearch);
});

onBeforeUnmount(() => {
  window.removeEventListener(RESET_GLOBAL_COIN_SEARCH_EVENT, resetSearch);
});
</script>

<template>
  <div class="w-full max-w-[150px] sm:max-w-xs">
    <USelectMenu
      :key="menuKey"
      v-model="selected"
      :items="options"
      searchable
      placeholder="Search..."
      @update:model-value="onSelect"
    >
      <template #leading>
        <UIcon name="i-lucide-search" class="w-4 h-4 text-gray-400" />
      </template>
    </USelectMenu>
  </div>
</template>
