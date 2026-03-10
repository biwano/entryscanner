<script setup lang="ts">
import { computed, watchEffect } from "vue";
import { useAsyncData, navigateTo } from "#app";
import { useSupabaseClient } from "#imports";
import { useHyperliquid } from "~/composables/useHyperliquid";
import { useUser } from "~/composables/useUser";
import type { Database } from "~/types/database.types";
import type { MonitoredPair } from "~/types/database.friendly.types";
import type { AssetMeta } from "~~shared/types";
import AssetManager from "~/features/asset-management/AssetManager.vue";

const supabase = useSupabaseClient<Database>();
const { isAdmin, userSystem } = useUser();
const { useMetaAndAssetCtxs } = useHyperliquid();
const { data: metaAndAssetCtxs, isLoading: isMetaLoading } =
  useMetaAndAssetCtxs();

// Simple redirect if not admin
watchEffect(() => {
  if (userSystem.value && !isAdmin.value) {
    navigateTo("/");
  }
});

const {
  data: monitoredPairs,
  refresh: refreshMonitored,
  status,
} = await useAsyncData<MonitoredPair[]>("monitored_pairs_mgmt", async () => {
  const { data } = await supabase.from("monitored_pairs").select("*");
  return data || [];
});

const isLoading = computed(
  () => isMetaLoading.value || status.value === "pending"
);

const allAvailableCoins = computed<string[]>(() => {
  if (!metaAndAssetCtxs.value) return [];
  const meta = metaAndAssetCtxs.value[0];
  return meta.universe.map((u: AssetMeta) => u.name).sort();
});
</script>

<template>
  <div v-if="isAdmin">
    <AssetManager
      :monitored-pairs="monitoredPairs || []"
      :all-available-coins="allAvailableCoins"
      :is-admin="isAdmin"
      :loading="isLoading"
      @refresh="refreshMonitored"
    />
  </div>
  <AccessDenied v-else />
</template>
